import {
  LabelClass,
  LabelClassId,
  RodioImage,
  RodioProject,
} from "@/lib/rodio-project";
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
    classesMap: Map<LabelClassId, LabelClass>;
    setClassesMap: (
      classesMap:
        | Map<LabelClassId, LabelClass>
        | ((
            classesMap: Map<LabelClassId, LabelClass>
          ) => Map<LabelClassId, LabelClass>)
    ) => void;
    selectedClass: null | LabelClassId;
    selectClass: (className: LabelClassId) => void;
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
  classesMap: new Map(),
  setClassesMap(
    classesMap:
      | Map<LabelClassId, LabelClass>
      | ((
          classesMap: Map<LabelClassId, LabelClass>
        ) => Map<LabelClassId, LabelClass>)
  ) {
    if (typeof classesMap === "function") {
      set(({ classesMap: prev }) => {
        return {
          classesMap: classesMap(prev),
        };
      });
    } else {
      set({ classesMap });
    }
  },
  selectedClass: null,
  selectClass(labelClass: LabelClassId) {
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
      const classes = await project.db.getClasses();
      const images = await project.images.getImages(project.projectPath);
      set({
        project,
        images,
        loadStatus: { state: "success" },
        classesMap: new Map(classes.map((c) => [c.id, c])),
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
