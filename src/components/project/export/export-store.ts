import { create } from "zustand";
import { nanoid } from "nanoid";
import { resolveError } from "@/lib/utils";
import { Lock } from "@/lib/async";

const ExportConcurrentLimit = 5;

type Error = {
  id: string;
  title: string;
  message: string;
};

type ProcessCounts = {
  processed: number;
  total: number;
};

type ProcessResultEntries = {
  pending: Set<string>;
  errors: Set<string>;
};

type ExportStore = {
  images: string[];
  errors: Error[];
  isPending: boolean;
  haltError: unknown | null;
  processCounts: ProcessCounts;
  processResultEntries: ProcessResultEntries;
  exportId: number;
  processLock: Lock;
  isComplete: () => boolean;
  saveImage: (imagePath: string) => Promise<void>;
  mutate: (images: string[]) => Promise<void>;
  retry: () => void;
  cancel: () => void;
};

const useExportStore = create<ExportStore>((set, get) => ({
  images: [],
  errors: [],
  isPending: false,
  haltError: null,
  processCounts: { processed: 0, total: 0 },
  processResultEntries: { pending: new Set(), errors: new Set() },
  exportId: 0,
  processLock: new Lock(),

  isComplete: () => {
    const { processCounts } = get();
    return processCounts.processed >= processCounts.total;
  },

  saveImage: async (imagePath: string) => {
    set(({ processResultEntries: prev }) => {
      prev.pending.add(imagePath);
      return {
        processResultEntries: { ...prev },
      };
    });

    try {
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));
      throw new Error("Error");
    } catch (err) {
      set(({ processResultEntries, errors }) => {
        processResultEntries.errors.add(imagePath);
        return {
          processResultEntries: { ...processResultEntries },
          errors: [
            ...errors,
            {
              id: nanoid(12),
              title: imagePath,
              message: resolveError(err),
            },
          ],
        };
      });
    } finally {
      set(({ processResultEntries, processCounts }) => {
        processResultEntries.pending.delete(imagePath);
        return {
          processResultEntries: { ...processResultEntries },
          processCounts: {
            processed: processCounts.processed + 1,
            total: processCounts.total,
          },
        };
      });
    }
  },

  mutate: async (images: string[]) => {
    const { exportId, processLock, saveImage } = get();

    const currentExportId = exportId + 1;
    set({
      images,
      exportId: currentExportId,
      errors: [],
      isPending: true,
      haltError: null,
      processResultEntries: { pending: new Set(), errors: new Set() },
      processCounts: { processed: 0, total: images.length },
    });

    const totalIterations = Math.ceil(images.length / ExportConcurrentLimit);
    for (let i = 0; i < totalIterations; i++) {
      if (get().exportId !== currentExportId) break;

      await processLock.acquire();
      try {
        const start = i * ExportConcurrentLimit;
        const end = Math.min(images.length, start + ExportConcurrentLimit);
        await Promise.allSettled(images.slice(start, end).map(saveImage));
      } finally {
        processLock.release();
      }
    }
    set({ isPending: false });
  },

  retry: () => {
    const { images, mutate } = get();
    mutate(images);
  },

  cancel: () => {
    const { exportId } = get();
    set({ exportId: exportId + 1, isPending: false });
  },
}));

export default useExportStore;
