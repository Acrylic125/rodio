import { cn, resolveError } from "@/lib/utils";
import { useCurrentProjectStore } from "@/stores/current-project-store";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "../ui/skeleton";
import { useCurrentProjectFileStore } from "@/stores/current-project-file-store";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { FilterIcon } from "lucide-react";

export function ImageList() {
  const currentProjectStore = useCurrentProjectStore((state) => {
    return {
      project: state.project,
      selectedImage: state.selectedImage,
      selectImage: state.selectImage,
    };
  });
  const currentProjectFileStore = useCurrentProjectFileStore((state) => {
    return {
      load: state.load,
    };
  });
  const imagesQuery = useQuery({
    queryKey: ["project-images", currentProjectStore.project?.projectPath],
    queryFn: async () => {
      const project = currentProjectStore.project;
      if (project === null) return [];
      return project.images.getImages(project.projectPath);
    },
    enabled: currentProjectStore.project !== null,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
  const imagePaths = imagesQuery.data?.map((image) => image.path) ?? [];
  const parentRef = useRef(null);
  const rowVirtualizer = useVirtualizer({
    count: imagePaths.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // h-10
    overscan: 5,
  });

  if (imagesQuery.isError) {
    return (
      <div className="flex flex-col gap-1 w-full p-4 items-center justify-center">
        <p className="text-red-500 text-lg text-center">Error loading images</p>
        <p className="text-gray-600 dark:text-gray-400 text-sm text-center">
          {resolveError(imagesQuery.error)}
        </p>
      </div>
    );
  }
  if (imagesQuery.data === undefined || imagesQuery.isPending) {
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
    <>
      <div className="flex flex-col gap-2 w-full border-b border-gray-300 dark:border-gray-700 top-0 p-3">
        <h2 className="text-gray-500 font-medium">FILES</h2>
        <div className="flex flex-row gap-2">
          <Input placeholder="Search" />
          <Button className="px-0 py-0 w-fit aspect-square" variant="secondary">
            <FilterIcon />
          </Button>
        </div>
      </div>
      <div
        className="flex flex-col flex-1 w-full p-2 select-none overflow-auto"
        ref={parentRef}
      >
        <ul
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {imagePaths.length > 0 ? (
            rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const filePath = imagePaths[virtualRow.index];
              return (
                <li
                  key={virtualRow.key}
                  className={cn(
                    "h-8 p-1 cursor-pointer truncate w-full transition ease-in-out duration-200",
                    {
                      "text-gray-50 dark:text-gray-950 bg-primary rounded-sm":
                        filePath === currentProjectStore.selectedImage,
                      "text-gray-700 dark:text-gray-300":
                        filePath !== currentProjectStore.selectedImage,
                    }
                  )}
                  onMouseDown={() => {
                    currentProjectStore.selectImage(filePath);
                    if (currentProjectStore.project)
                      currentProjectFileStore.load(
                        currentProjectStore.project,
                        filePath
                      );
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {filePath.split("/").pop()}
                </li>
              );
            })
          ) : (
            <div className="w-full p-4 flex items-center justify-center">
              <p>No images found</p>
            </div>
          )}
        </ul>
      </div>
    </>
  );
}
