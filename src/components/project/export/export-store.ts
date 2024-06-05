import { create } from "zustand";
import { nanoid } from "nanoid";
import { resolveError } from "@/lib/utils";
import { ExportDistributionType } from "./export-types";
import { ExportType } from "./select-export-type";
import { Lock } from "@/lib/async";
import {
  createDir,
  exists,
  removeDir,
  copyFile,
  writeFile,
  writeTextFile,
} from "@tauri-apps/api/fs";
import { stringify } from "yaml";
import { basename } from "path";
import { LabelClass } from "@/lib/rodio-project";
import { Pos } from "../label-anchors";

const ExportConcurrentLimit = 5;

type ImageExportError = {
  id: string;
  title: string;
  message: string;
};

export type ExportImage = {
  path: string;
  type: ExportDistributionType;
};

type ExportData = {
  images: ExportImage[];
  classes: LabelClass[];
  getLabelsForImage: (imagePath: string) => Promise<
    {
      start: Pos;
      end: Pos;
      classIndex: number;
    }[]
  >;
};

type ExportSession = {
  id: number;
  exportDir: string;
  // images: ExportImage[];
  data: ExportData;
  errors: ImageExportError[];
  haltError: unknown | null;
  erroredImages: Set<string>;
  processingImages: Set<string>;
  processedImages: Set<string>;
  imageNextPtr: number;
  status: "idle" | "pending" | "complete";
  exportType: ExportType;
};

type ExportOptions = {
  exportType: ExportType;
  exportDir: string;
  data: ExportData;
} & (
  | {
      continued: boolean;
      session: Omit<
        ExportSession,
        "id" | "status" | "exportType" | "haltError" | "exportDir" | "data"
      >;
    }
  | {
      continued?: undefined;
      session?: undefined;
    }
);

type ExportStore = {
  idAcc: number;
  lock: Lock;
  currentSession: ExportSession | null;
  isRunning: () => boolean;
  save: (options: ExportOptions) => Promise<void>;
  retry: () => void;
  cancel: () => void;
  continue: () => void;
};

interface ExportTypeExporter {
  prepareExport(session: ExportSession, continued: boolean): Promise<void>;
  export(session: ExportSession, exportImage: ExportImage): Promise<void>;
}

const exporters: Map<ExportType, ExportTypeExporter> = new Map();

const YoloExporter: ExportTypeExporter = {
  async prepareExport(session: ExportSession, continued: boolean) {
    const prepareDir = async (dir: string) => {
      if (await exists(dir)) {
        if (!continued) {
          await removeDir(dir, { recursive: true });
          await createDir(dir, {
            recursive: true,
          });
        }
      } else {
        await createDir(dir, {
          recursive: true,
        });
      }
    };

    const types = ["test", "train", "valid"];
    const dirs = types.reduce((acc: string[], type: string) => {
      const base = `${session.exportDir}/${type}`;
      acc.push(`${base}/images`, `${base}/labels`);
      return acc;
    }, []);

    const createDataYaml = async () => {
      const typePaths = types.reduce(
        (acc, type) => {
          acc[type] = `${type}/images`;
          return acc;
        },
        {} as Record<string, string>
      );
      const classes = session.data.classes.reduce(
        (acc, cls, index) => {
          acc[`${index}`] = cls.name;
          return acc;
        },
        {} as Record<string, string>
      );
      const dataYamlPath = `${session.exportDir}/data.yaml`;
      if (!(await exists(dataYamlPath))) {
        await writeFile(dataYamlPath, "");
      }
      await writeTextFile(
        dataYamlPath,
        stringify({
          path: "./",
          ...typePaths,
          names: classes,
        }),
        {
          append: false,
        }
      );
    };

    await Promise.all([...dirs.map(prepareDir), createDataYaml()]);
  },
  async export(session: ExportSession, exportImage: ExportImage) {
    let typeDir = null;
    if (exportImage.type === "test") {
      typeDir = "test";
    } else if (exportImage.type === "train") {
      typeDir = "train";
    } else if (exportImage.type === "validation") {
      typeDir = "valid";
    }
    if (typeDir === null) {
      throw new Error(`Invalid export type: ${exportImage.type}`);
    }
    await Promise.all([
      copyFile(
        exportImage.path,
        `${session.exportDir}/${typeDir}/images/${basename(exportImage.path)}`,
        {}
      ),
      (async () => {
        const labels = await session.data.getLabelsForImage(exportImage.path);
        const labelStr = labels
          .map((label) => {
            const midpoint = {
              x: (label.start.x + label.end.x) / 2,
              y: (label.start.y + label.end.y) / 2,
            };
            const width = Math.abs(label.end.x - label.start.x);
            const height = Math.abs(label.end.y - label.start.y);

            return `${label.classIndex} ${midpoint.x} ${midpoint.y} ${width} ${height}`;
          })
          .join("\n");
        await writeFile(
          `${session.exportDir}/${typeDir}/labels/${basename(
            exportImage.path
          ).replace(/\.[^.]+$/, ".txt")}`,
          labelStr
        );
      })(),
    ]);
  },
};

exporters.set("yolov8", YoloExporter);

export function generateExportDirname(exportType: ExportType) {
  const dateStr = new Date().toISOString().replace(/:/g, "-");
  return `${exportType}-${dateStr}-${nanoid(6)}`;
}

// There can only be one export session at a time.
const useExportStore = create<ExportStore>((set, get) => ({
  idAcc: 0,
  lock: new Lock(),
  currentSession: null,
  isRunning: () => {
    const { currentSession } = get();
    return currentSession !== null;
  },
  save: async ({
    data,
    exportType,
    continued,
    exportDir,
    session: _session,
  }: ExportOptions) => {
    const exporter = exporters.get(exportType);
    if (exporter === undefined) {
      console.error(`Exporter for '${exportType}' not found`);
      return;
    }

    // We will cancel the previous session if it exists by overriding it with a new session.
    let initialSession: ExportSession;
    const idAcc = get().idAcc + 1;
    set({
      idAcc,
    });
    if (_session !== undefined) {
      initialSession = {
        ..._session,
        id: idAcc,
        data,
        exportDir,
        haltError: null,
        status: "pending",
        exportType,
      };
    } else {
      initialSession = {
        id: idAcc,
        data,
        exportDir,
        errors: [],
        haltError: null,
        erroredImages: new Set(),
        processingImages: new Set(),
        processedImages: new Set(),
        imageNextPtr: 0,
        status: "pending",
        exportType,
      };
    }

    const initialSessionId = initialSession.id;
    const getCurrentSessionIfInitial = () => {
      const currentSession = get().currentSession;
      if (currentSession === null || currentSession.id !== initialSessionId) {
        return null;
      }
      if (currentSession.status === "idle") {
        return null;
      }
      return currentSession;
    };
    const setSession = (
      fn: (currentSession: ExportSession) => ExportSession
    ) => {
      const currentSession = getCurrentSessionIfInitial();
      // If the current session is not the same as the initial session,
      // we do not update the current session.
      if (currentSession === null) {
        return false;
      }

      const mutatedSession = fn(currentSession);
      set({
        currentSession: { ...mutatedSession },
      });
      return true;
    };

    set({
      currentSession: { ...initialSession },
    });

    // Bind the lock to the initial session's lock.
    // We want to ensure we are managing the same lock before and after the preparation.
    const prepareLock = get().lock;
    try {
      await prepareLock.acquire();
      await exporter.prepareExport(initialSession, !!continued);
    } catch (err) {
      // Cancel the session if the preparation failed.
      setSession((currentSession) => {
        currentSession.haltError = err;
        currentSession.status = "idle";
        return currentSession;
      });
      return;
    } finally {
      prepareLock.release();
    }

    // We will try to save the images in batches of ExportConcurrentLimit.
    let isDone = false;
    while (true) {
      const currentSession = getCurrentSessionIfInitial();
      // If the current session is not the same as the initial session, we stop trying to save.
      if (currentSession === null) {
        break;
      }
      // If the current session is complete, we stop trying to save.
      if (currentSession.imageNextPtr >= initialSession.data.images.length) {
        isDone = true;
        break;
      }

      const start = currentSession.imageNextPtr;
      const end = Math.min(
        initialSession.data.images.length,
        start + ExportConcurrentLimit
      );

      // We want to ensure we are managing the same lock before and after the preparation.
      const saveImageLock = get().lock;
      try {
        await saveImageLock.acquire();
        await Promise.allSettled(
          initialSession.data.images.slice(start, end).map(async (image) => {
            if (
              !setSession((currentSession) => {
                currentSession.processingImages.add(image.path);
                return currentSession;
              })
            ) {
              return;
            }

            try {
              await exporter.export(initialSession, image);
            } catch (err) {
              setSession((currentSession) => {
                currentSession.errors.push({
                  id: nanoid(12),
                  title: image.path,
                  message: resolveError(err),
                });
                currentSession.erroredImages.add(image.path);
                return currentSession;
              });
            } finally {
              setSession((currentSession) => {
                currentSession.processingImages.delete(image.path);
                currentSession.processedImages.add(image.path);
                return currentSession;
              });
            }
          })
        );
      } finally {
        saveImageLock.release();
      }

      setSession((currentSession) => {
        currentSession.imageNextPtr = end;
        return currentSession;
      });
    }
    if (isDone) {
      setSession((currentSession) => {
        currentSession.status = "complete";
        return currentSession;
      });
    }
  },
  retry: () => {
    const { currentSession, save } = get();
    if (currentSession === null) return;
    save({
      data: currentSession.data,
      exportType: currentSession.exportType,
      exportDir: currentSession.exportDir,
      continued: false,
      session: {
        ...currentSession,
        errors: [],
        erroredImages: new Set(),
        processingImages: new Set(),
        processedImages: new Set(),
        imageNextPtr: 0,
      },
    });
  },
  cancel: () => {
    const { currentSession } = get();
    if (currentSession === null) return;
    set({
      currentSession: { ...currentSession, status: "idle" },
    });
  },
  continue: () => {
    const { currentSession, save } = get();
    if (currentSession === null) {
      return;
    }
    if (currentSession.status !== "idle") {
      return;
    }
    save({
      data: currentSession.data,
      exportType: currentSession.exportType,
      exportDir: currentSession.exportDir,
      continued: true,
      session: {
        ...currentSession,
      },
    });
  },
}));

export default useExportStore;
