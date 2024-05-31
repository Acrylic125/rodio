import { ProcessQueue } from "@/lib/async";
import { Label, LabelId } from "@/lib/rodio-project";
import { StoreApi, UseBoundStore, create } from "zustand";

export type PendingSave = {
  state: Label[];
  processQueue: ProcessQueue<void>;
};

export const useSaveStore: UseBoundStore<
  StoreApi<{
    pendingSavess: Map<LabelId, PendingSave>;
    setPendingSavess: (
      pendingSavess:
        | Map<LabelId, PendingSave>
        | ((prev: Map<LabelId, PendingSave>) => Map<LabelId, PendingSave>)
    ) => void;
  }>
> = create((set) => ({
  pendingSavess: new Map(),
  setPendingSavess(
    pendingSavess:
      | Map<LabelId, PendingSave>
      | ((prev: Map<LabelId, PendingSave>) => Map<LabelId, PendingSave>)
  ) {
    if (typeof pendingSavess === "function") {
      set(({ pendingSavess: prev }) => {
        return {
          pendingSavess: pendingSavess(prev),
        };
      });
    } else {
      set({ pendingSavess });
    }
  },
}));
