import { create } from "zustand";
import { nanoid } from "nanoid";
import { resolveError } from "@/lib/utils";
import { ExportDistributionType } from "./export-types";
import { ExportType } from "./select-export-type";
import { Lock } from "@/lib/async";

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

type ExportSession = {
  id: number;
  exportDir: string;
  images: ExportImage[];
  errors: ImageExportError[];
  haltError: unknown | null;
  erroredImages: Set<string>;
  processingImages: Set<string>;
  processedImages: Set<string>;
  imageNextPtr: number;
  status: "idle" | "pending" | "complete";
  exportType: ExportType;
  lock: Lock;
};

type ExportStore = {
  idAcc: number;
  currentSession: ExportSession | null;
  isRunning: () => boolean;
  save: (
    exportType: ExportType,
    images: ExportImage[],
    session?: ExportSession
  ) => Promise<void>;
  retry: () => void;
  cancel: () => void;
  continue: () => void;
};

interface ExportTypeExporter {
  prepareExport(session: ExportSession): Promise<void>;
  export(session: ExportSession, exportImage: ExportImage): Promise<void>;
}

const exporters: Map<ExportType, ExportTypeExporter> = new Map();

const YoloExporter: ExportTypeExporter = {
  async prepareExport(session: ExportSession) {
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));
    console.log(`Complete ${session.exportDir}`);
    // throw new Error("Failed to prepare export");
  },
  async export(session: ExportSession, exportImage: ExportImage) {
    console.log(`Exporting ${exportImage.path}`);
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));
  },
};

exporters.set("yolov8", YoloExporter);

const useExportStore = create<ExportStore>((set, get) => ({
  idAcc: 0,
  currentSession: null,
  isRunning: () => {
    const { currentSession } = get();
    return currentSession !== null;
  },
  save: async (
    exportType: ExportType,
    images: ExportImage[],
    _session?: Omit<ExportSession, "id" | "status" | "exportType" | "haltError">
  ) => {
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
        haltError: null,
        status: "pending",
        exportType,
      };
    } else {
      const dateStr = new Date().toISOString().replace(/:/g, "-");
      initialSession = {
        id: idAcc,
        exportDir: `${exportType}-${dateStr}-${nanoid(6)}`,
        images,
        errors: [],
        haltError: null,
        erroredImages: new Set(),
        processingImages: new Set(),
        processedImages: new Set(),
        imageNextPtr: 0,
        status: "pending",
        exportType,
        lock: new Lock(),
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
    const prepareLock = initialSession.lock;
    try {
      await prepareLock.acquire();
      await exporter.prepareExport(initialSession);
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
    while (true) {
      const currentSession = getCurrentSessionIfInitial();
      // If the current session is not the same as the initial session, we stop trying to save.
      if (currentSession === null) {
        break;
      }
      // If the current session is complete, we stop trying to save.
      if (currentSession.imageNextPtr >= initialSession.images.length) {
        set({
          currentSession: { ...currentSession, status: "complete" },
        });
        break;
      }

      const start = currentSession.imageNextPtr;
      const end = Math.min(
        initialSession.images.length,
        start + ExportConcurrentLimit
      );

      // We want to ensure we are managing the same lock before and after the preparation.
      const saveImageLock = initialSession.lock;
      try {
        await saveImageLock.acquire();
        await Promise.allSettled(
          initialSession.images.slice(start, end).map(async (image) => {
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
  },
  retry: () => {
    const { currentSession, save } = get();
    if (currentSession === null) return;
    save(currentSession.exportType, currentSession.images);
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
    save(currentSession.exportType, currentSession.images, {
      ...currentSession,
    });
  },
}));

export default useExportStore;
