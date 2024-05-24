import { Label, LabelId, RodioProject } from "@/lib/rodio-project";
import { resolveError } from "@/lib/utils";
import { StoreApi, UseBoundStore, create } from "zustand";

export const useCurrentProjectFileStore: UseBoundStore<
  StoreApi<{
    loadStatus:
      | {
          state: "idle" | "loading" | "success";
        }
      | {
          state: "error";
          message: string;
        };
    labels: Map<LabelId, Label>;
    setLabels: (
      labels:
        | Map<LabelId, Label>
        | ((prev: Map<LabelId, Label>) => Map<LabelId, Label>)
    ) => void;
    tempLabels: Map<LabelId, Label>;
    setTempLabels: (
      tempLabels:
        | Map<LabelId, Label>
        | ((prev: Map<LabelId, Label>) => Map<LabelId, Label>)
    ) => void;
    load: (project: RodioProject, path: string) => Promise<void>;
  }>
> = create((set) => ({
  loadStatus: {
    state: "idle",
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
  tempLabels: new Map(),
  setTempLabels(
    tempLabels:
      | Map<LabelId, Label>
      | ((prev: Map<LabelId, Label>) => Map<LabelId, Label>)
  ) {
    if (typeof tempLabels === "function") {
      set(({ tempLabels: prev }) => {
        return {
          tempLabels: tempLabels(prev),
        };
      });
    } else {
      set({ tempLabels });
    }
  },
  async load(project: RodioProject, path: string) {
    set({
      loadStatus: {
        state: "loading",
      },
    });
    try {
      const labels = await project.db.getLabels(path);
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