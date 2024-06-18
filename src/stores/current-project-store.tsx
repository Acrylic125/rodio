import { LabelClassId, RodioImage, RodioProject } from "@/lib/rodio-project";
import { resolveError } from "@/lib/utils";
import { StoreApi, UseBoundStore, create } from "zustand";

export const useCurrentProjectStore: UseBoundStore<
  StoreApi<{
    project: RodioProject | null;
    loadStatus:
      | {
          state: "idle" | "loading" | "success";
        }
      | {
          state: "error";
          message: string;
        };
    images: RodioImage[];
    setImages: (images: RodioImage[]) => void;
    selectedImage: null | string;
    selectImage: (path: string) => void;
    selectedClass: null | LabelClassId;
    selectClass: (className: LabelClassId | null) => void;
    load: (path: string) => Promise<void>;
  }>
> = create((set) => ({
  project: null,
  loadStatus: {
    state: "idle",
  },
  images: [],
  setImages(images: RodioImage[]) {
    set({ images });
  },
  selectedImage: null,
  selectImage(path: string) {
    set({ selectedImage: path });
  },
  selectedClass: null,
  selectClass(labelClass: LabelClassId | null) {
    set({ selectedClass: labelClass });
  },
  async load(path: string) {
    set({
      loadStatus: {
        state: "loading",
      },
    });
    try {
      const project = new RodioProject(path);
      await project.load();
      const images = await project.images.getImages(project.projectPath);
      set({
        project,
        images,
        loadStatus: { state: "success" },
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
