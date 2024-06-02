import { create } from "zustand";
import { nanoid } from "nanoid";
import { resolveError } from "@/lib/utils";
import { Lock } from "@/lib/async";

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
  imageNextPtr: number;
  processed: number;
  status: "idle" | "pending" | "complete";
};

type ExportStore = {
  currentSession: ExportSession | null;
  isRunning: () => boolean;
  save: (images: string[], session?: ExportSession) => Promise<void>;
  retry: () => void;
  cancel: () => void;
  continue: () => void;
};

const useExportStore = create<ExportStore>((set, get) => ({
  currentSession: null,
  isRunning: () => {
    const { currentSession } = get();
    return currentSession !== null;
  },
  save: async (images: string[], _session?: ExportSession) => {
    // We will cancel the previous session if it exists by overriding it with a new session.
    let initialSession: ExportSession;
    console.log("TT 1");
    if (_session !== undefined) {
      console.log(`A0 ${_session.id}`);
      initialSession = {
        ..._session,
        status: "pending",
      };
    } else {
      const prevSessionId = get().currentSession?.id;
      initialSession = {
        id: prevSessionId !== undefined ? prevSessionId + 1 : 0,
        images,
        errors: [],
        haltError: null,
        erroredImages: new Set(),
        processingImages: new Set(),
        imageNextPtr: 0,
        processed: 0,
        status: "pending",
      };
    }

    console.log("Hi before!");
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

      const mutatedSession = fn(currentSession);
      set({
        currentSession: { ...mutatedSession },
      });
      return true;
    };

    set({
      currentSession: { ...initialSession },
    });

    console.log(`Hi! ${initialSession.status}`);
    while (true) {
      const currentSession = get().currentSession;
      console.log(`A1 ${currentSession?.id} ${initialSession.id}`);
      // If the current session is not the same as the initial session, we stop trying to save.
      if (currentSession === null || currentSession.id !== initialSessionId) {
        console.log("N1");
        break;
      }
      // If the session is in idle, we ignore.
      if (currentSession.status === "idle") {
        console.log(`N2 ${currentSession.status}`);
        break;
      }
      // If the current session is complete, we stop trying to save.
      if (currentSession.imageNextPtr >= initialSession.images.length) {
        console.log("N3");
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
      currentSession.imageNextPtr = end;

      set({
        currentSession: { ...currentSession },
      });

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
              currentSession.processed += 1;
              return currentSession;
            });
          }
        })
      );
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
      console.log("F1");
      return;
    }
    if (currentSession.status !== "idle") {
      console.log("F2");
      return;
    }
    console.log("E1");
    save(currentSession.images, {
      ...currentSession,
      id: currentSession.id + 1,
    });
  },
}));

// type ExportStore = {
//   images: string[];
//   errors: Error[];
//   isPending: boolean;
//   isCancelling: boolean;
//   haltError: unknown | null;
//   processCounts: ProcessCounts;
//   processResultEntries: ProcessResultEntries;
//   exportId: number;
//   lastIteration: number;
//   processLock: Lock;
//   isComplete: () => boolean;
//   saveImage: (imagePath: string, exportId: number) => Promise<void>;
//   mutate: (images: string[], options?: ExportMutationOptions) => Promise<void>;
//   retry: () => void;
//   cancel: () => void;
//   continue: () => void;
// };

// const useExportStore = create<ExportStore>((set, get) => ({
//   images: [],
//   errors: [],
//   isPending: false,
//   isCancelling: false,
//   haltError: null,
//   processCounts: { processed: 0, total: 0 },
//   processResultEntries: { pending: new Set(), errors: new Set() },
//   exportId: 0,
//   lastIteration: 0,
//   processLock: new Lock(),

//   isComplete: () => {
//     const { processCounts } = get();
//     return processCounts.processed >= processCounts.total;
//   },

//   saveImage: async (imagePath: string, exportId: number) => {
//     if (exportId !== get().exportId) return;
//     set(({ processResultEntries: prev }) => {
//       prev.pending.add(imagePath);
//       return {
//         processResultEntries: { ...prev },
//       };
//     });

//     try {
//       await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));
//       throw new Error("Error");
//     } catch (err) {
//       if (exportId !== get().exportId) return;
//       set(({ processResultEntries, errors }) => {
//         processResultEntries.errors.add(imagePath);
//         return {
//           processResultEntries: { ...processResultEntries },
//           errors: [
//             ...errors,
//             {
//               id: nanoid(12),
//               title: imagePath,
//               message: resolveError(err),
//             },
//           ],
//         };
//       });
//     } finally {
//       if (exportId !== get().exportId) return;
//       set(({ processResultEntries, processCounts }) => {
//         processResultEntries.pending.delete(imagePath);
//         return {
//           processResultEntries: { ...processResultEntries },
//           processCounts: {
//             processed: processCounts.processed + 1,
//             total: processCounts.total,
//           },
//         };
//       });
//     }
//   },

//   mutate: async (images: string[], options?: ExportMutationOptions) => {
//     const { exportId, processLock, processCounts, saveImage, isPending } =
//       get();
//     // if (isPending) {
//     //   console.log("Already pending");
//     // }

//     const currentExportId = exportId + 1;
//     if (options?.continued) {
//       console.log("Mutating continuing!");
//       set({
//         images,
//         exportId: currentExportId,
//         isPending: true,
//         processCounts: {
//           processed: processCounts.processed,
//           total: images.length,
//         },
//       });
//     } else {
//       set({
//         images,
//         exportId: currentExportId,
//         errors: [],
//         isPending: true,
//         haltError: null,
//         processResultEntries: { pending: new Set(), errors: new Set() },
//         processCounts: { processed: 0, total: images.length },
//       });
//     }

//     const totalIterations = Math.ceil(images.length / ExportConcurrentLimit);
//     const skipToIteration = options?.skipToIteration ?? 0;
//     for (let i = skipToIteration; i < totalIterations; i++) {
//       if (get().exportId !== currentExportId) break;

//       await processLock.acquire();
//       try {
//         const start = i * ExportConcurrentLimit;
//         const end = Math.min(images.length, start + ExportConcurrentLimit);
//         await Promise.allSettled(
//           images
//             .slice(start, end)
//             .map((imagePath) => saveImage(imagePath, currentExportId))
//         );
//       } finally {
//         set({
//           lastIteration: i,
//         });
//         processLock.release();
//       }
//     }
//     set({ isPending: false });
//   },

//   retry: () => {
//     const { images, mutate } = get();
//     mutate(images);
//   },

//   cancel: () => {
//     const { exportId } = get();
//     set({ exportId: exportId + 1, isPending: false, isCancelling: true });
//   },

//   continue: () => {
//     const { mutate, lastIteration, images, isPending } = get();
//     // if (isPending) return;
//     // set({ exportId: exportId + 1 });
//     mutate(images, {
//       continued: true,
//       skipToIteration: lastIteration + 1,
//     });
//   },
// }));

export default useExportStore;
