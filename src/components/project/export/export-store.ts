import { create } from "zustand";
import { nanoid } from "nanoid";
import { resolveError } from "@/lib/utils";

const ExportConcurrentLimit = 5;

type ImageExportError = {
  id: string;
  title: string;
  message: string;
};

type ExportSession = {
  id: number;
  images: string[];
  errors: ImageExportError[];
  haltError: unknown | null;
  erroredImages: Set<string>;
  processingImages: Set<string>;
  processedImages: Set<string>;
  imageNextPtr: number;
  status: "idle" | "pending" | "complete";
};

type ExportStore = {
  idAcc: number;
  currentSession: ExportSession | null;
  isRunning: () => boolean;
  save: (images: string[], session?: ExportSession) => Promise<void>;
  retry: () => void;
  cancel: () => void;
  continue: () => void;
};

const useExportStore = create<ExportStore>((set, get) => ({
  idAcc: 0,
  currentSession: null,
  isRunning: () => {
    const { currentSession } = get();
    return currentSession !== null;
  },
  save: async (images: string[], _session?: ExportSession) => {
    // We will cancel the previous session if it exists by overriding it with a new session.
    let initialSession: ExportSession;
    if (_session !== undefined) {
      initialSession = {
        ..._session,
        status: "pending",
      };
    } else {
      const idAcc = get().idAcc + 1;
      set({
        idAcc,
      });
      initialSession = {
        id: idAcc,
        images,
        errors: [],
        haltError: null,
        erroredImages: new Set(),
        processingImages: new Set(),
        processedImages: new Set(),
        imageNextPtr: 0,
        status: "pending",
      };
    }

    const initialSessionId = initialSession.id;
    const setSession = (
      fn: (currentSession: ExportSession) => ExportSession
    ) => {
      const currentSession = get().currentSession;
      // If the current session is not the same as the initial session,
      // we do not update the current session.
      if (currentSession === null || currentSession.id !== initialSessionId) {
        return false;
      }
      if (currentSession.status === "idle") {
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

    while (true) {
      const currentSession = get().currentSession;
      // If the current session is not the same as the initial session, we stop trying to save.
      if (currentSession === null || currentSession.id !== initialSessionId) {
        break;
      }
      // If the session is in idle, we ignore.
      if (currentSession.status === "idle") {
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

      await Promise.allSettled(
        initialSession.images.slice(start, end).map(async (imagePath) => {
          if (
            !setSession((currentSession) => {
              currentSession.processingImages.add(imagePath);
              return currentSession;
            })
          ) {
            return;
          }

          try {
            await new Promise((resolve) =>
              setTimeout(resolve, Math.random() * 1000)
            );
            throw new Error("Error");
          } catch (err) {
            setSession((currentSession) => {
              currentSession.errors.push({
                id: nanoid(12),
                title: imagePath,
                message: resolveError(err),
              });
              currentSession.erroredImages.add(imagePath);
              return currentSession;
            });
          } finally {
            setSession((currentSession) => {
              currentSession.processingImages.delete(imagePath);
              currentSession.processedImages.add(imagePath);
              return currentSession;
            });
          }
        })
      );

      setSession((currentSession) => {
        currentSession.imageNextPtr = end;
        return currentSession;
      });
    }
  },
  retry: () => {
    const { currentSession, save } = get();
    if (currentSession === null) return;
    save(currentSession.images);
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
    const idAcc = get().idAcc + 1;
    set({
      idAcc,
    });
    save(currentSession.images, {
      ...currentSession,
      id: idAcc,
    });
  },
}));

export default useExportStore;
