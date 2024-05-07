import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { cn, resolveError } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterIcon, Loader2 } from "lucide-react";
import ImagePreview from "@/components/project/image-preview";
import { StoreApi, UseBoundStore, create } from "zustand";
import { RodioProject } from "@/lib/rodio";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/project/$path")({
  component: Project,
});

const paths = [
  "/Users/benedicttan/Desktop/projects/weyes/dataset/IMG_7447.JPG",
  "/Users/benedicttan/Desktop/projects/weyes/dataset/IMG_7479.JPG",
  "/Users/benedicttan/Desktop/projects/weyes/dataset/IMG_7451.JPG",
  "/Users/benedicttan/Desktop/tttt.jpeg",
];

const classes = [
  {
    id: "1",
    name: "bus_number",
    color: "#FF0000",
  },
] as const;

const labels = [
  {
    id: "1",
    class: "1",
    start: [0, 0],
    end: [1, 1],
  },
] as const;

export const useCurrentProject: UseBoundStore<
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
    imagePaths: null | string[];
    selectedImage: null | string;
    selectImage: (path: string) => void;
    getImages: () => Promise<
      {
        path: string;
      }[]
    >;
    loadProject: (path: string) => Promise<void>;
  }>
> = create((set) => ({
  project: null,
  imagePaths: null,
  loadStatus: {
    state: "idle",
  },
  selectedImage: null,
  selectImage(path: string) {
    set({ selectedImage: path });
  },
  async getImages() {
    if (this.project === null) {
      return [];
    }
    return this.project.images.getImages();
  },
  async loadProject(path: string) {
    set({
      loadStatus: {
        state: "loading",
      },
    });
    try {
      const project = new RodioProject(path);
      await project.load();
      set({ project, loadStatus: { state: "success" } });
    } catch (error) {
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

function ImageList() {
  const currentProject = useCurrentProject((state) => {
    return {
      getImages: state.getImages,
      imagePaths: state.imagePaths,
      selectedImage: state.selectedImage,
      selectImage: state.selectImage,
    };
  });

  if (currentProject.imagePaths === null) {
    return (
      <ul className="w-full p-2 select-none">
        {new Array(5).fill(null).map((_, i) => (
          <li key={i} className="p-1">
            <Skeleton className="w-full h-8" />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="w-full p-2 select-none">
      {currentProject.imagePaths.length > 0 ? (
        currentProject.imagePaths.map((path) => (
          <li
            key={path}
            className={cn(
              "p-1 cursor-pointer truncate w-full transition ease-in-out duration-200",
              {
                "text-gray-50 dark:text-gray-950 bg-primary rounded-sm":
                  path === currentProject.selectedImage,
                "text-gray-700 dark:text-gray-300":
                  path !== currentProject.selectedImage,
              }
            )}
            onClick={() => currentProject.selectImage(path)}
          >
            {path.split("/").pop()}
          </li>
        ))
      ) : (
        <div className="w-full p-4 flex items-center justify-center">
          <p>No images found</p>
        </div>
      )}
    </ul>
  );
}

function Project() {
  const { path } = Route.useParams();
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const currentProject = useCurrentProject((state) => {
    return {
      project: state.project,
      initProject: state.loadProject,
    };
  });
  useEffect(() => {
    if (currentProject.project === null) {
      // currentProject.initProject(path);
      // setCurrentPath(paths[0]);
    }
  }, [
    currentProject.project,
    currentProject.initProject,
    path,
    setCurrentPath,
  ]);

  return (
    <main className="flex flex-col items-center bg-background w-screen h-svh">
      <nav className="flex flex-row items-center w-full h-12 border-b border-gray-300 dark:border-gray-700 px-3">
        {currentProject.project === null ? (
          <Skeleton className="w-32 h-4" />
        ) : (
          <h1>{currentProject.project.config.values.name}</h1>
        )}
      </nav>
      <div className="w-full h-[calc(100svh-3rem)] flex flex-row">
        <section className="w-full h-[calc(100svh-3rem)] max-w-64 overflow-auto relative">
          <div className="flex flex-col gap-2 sticky w-full border-b bg-background/75 backdrop-blur-md border-gray-300 dark:border-gray-700 top-0 p-3">
            <h2 className="text-gray-500 font-medium select-none">FILES</h2>
            <div className="flex flex-row gap-2">
              <Input placeholder="Search" />
              <Button
                className="px-0 py-0 w-fit aspect-square"
                variant="secondary"
              >
                <FilterIcon />
              </Button>
            </div>
          </div>
          <ImageList />
        </section>
        <div className="relative w-full h-full bg-black flex items-center justify-center border-x border-gray-300 dark:border-gray-700">
          {currentPath !== null ? (
            <ImagePreview currentPath={currentPath} />
          ) : (
            <Loader2 className="animate-spin w-8 h-8" />
          )}
        </div>
        <section className="w-full h-[calc(100svh-3rem)] max-w-64 overflow-auto relative">
          <h2 className="text-gray-500 font-medium p-2 border-b border-gray-300 dark:border-gray-700 select-none">
            LABELS
          </h2>
          <ul>
            {labels.map((label) => (
              <li key={label.class} className="p-2">
                <div className="flex flex-row items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: classes[0].color }}
                  />
                  <span className="flex flex-row gap-2">
                    <p className="text-gray-950 dark:text-gray-50">
                      {"("}
                      {label.start.join(", ")}
                      {")"}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300"> to </p>
                    <p className="text-gray-950 dark:text-gray-50">
                      {"("}
                      {label.end.join(", ")}
                      {")"}
                    </p>
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <h2 className="text-gray-500 font-medium p-2 border-b border-gray-300 dark:border-gray-700 select-none">
            CLASSES
          </h2>
          <ul>
            {classes.map((cls) => (
              <li key={cls.id} className="p-2">
                <div className="flex flex-row items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: cls.color }}
                  />
                  <p>{cls.name}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
