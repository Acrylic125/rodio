import { Label, LabelId, RodioProject } from "@/lib/rodio-project";
import { resolveError } from "@/lib/utils";
import { StoreApi, UseBoundStore, create } from "zustand";
import { useSaveStore } from "./save-store";

export const useCurrentProjectFileStore: UseBoundStore<
  StoreApi<{
    filePath: string;
    loadStatus:
      | {
          state: "idle" | "loading" | "success";
        }
      | {
          state: "error";
          message: string;
        };
    focusedLabel: LabelId | null;
    setFocusedLabel: (labelId: LabelId | null) => void;
    labels: Map<LabelId, Label>;
    setLabels: (
      labels:
        | Map<LabelId, Label>
        | ((prev: Map<LabelId, Label>) => Map<LabelId, Label>)
    ) => void;
    load: (project: RodioProject, path: string) => Promise<void>;
  }>
> = create((set, get) => ({
  filePath: "",
  loadStatus: {
    state: "idle",
  },
  focusedLabel: null,
  setFocusedLabel(labelId: LabelId | null) {
    set({ focusedLabel: labelId });
  },
  labels: new Map(),
  setLabels(
    labels:
      | Map<LabelId, Label>
      | ((prev: Map<LabelId, Label>) => Map<LabelId, Label>)
  ) {
    if (typeof labels === "function") {
      set(({ labels: prev }) => {
        return {
          labels: labels(prev),
        };
      });
    } else {
      set({ labels });
    }
  },
  async load(project: RodioProject, path: string) {
    set({
      filePath: path,
      loadStatus: {
        state: "loading",
      },
    });
    try {
      const cachedLabels = useSaveStore
        .getState()
        .pendingSavess.get(path)?.state;
      const labels =
        cachedLabels !== undefined
          ? cachedLabels
          : await project.db.getLabels(path);
      if (get().filePath !== path) return;
      set({
        loadStatus: { state: "success" },
        labels: new Map(labels.map((l) => [l.id, l])),
      });
    } catch (error) {
      console.error(error);
      set({
        loadStatus: {
          state: "error",
          message: resolveError(error),
        },
      });
      throw error; // Rethrow so it can be caught by the caller.
    }
  },
}));
