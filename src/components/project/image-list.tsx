import { cn } from "@/lib/utils";
import { useCurrentProjectStore } from "@/stores/current-project-store";
import { useCurrentProjectFileStore } from "@/stores/current-project-file-store";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { FilterIcon } from "lucide-react";
import { appWindow } from "@tauri-apps/api/window";

export function ImageList() {
  const currentProjectStore = useCurrentProjectStore((state) => {
    return {
      project: state.project,
      selectedImage: state.selectedImage,
      selectImage: state.selectImage,
      images: state.images,
      setImages: state.setImages,
    };
  });
  const currentProjectFileStore = useCurrentProjectFileStore((state) => {
    return {
      load: state.load,
    };
  });
  const imagePaths = currentProjectStore.images;
  const parentRef = useRef(null);
  const rowVirtualizer = useVirtualizer({
    count: imagePaths.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // h-10
    overscan: 5,
  });
  useEffect(() => {
    const unsub = appWindow.listen("tauri://focus", async () => {
      if (!currentProjectStore.project) return;
      const images = await currentProjectStore.project.images.getImages(
        currentProjectStore.project.projectPath
      );
      currentProjectStore.setImages(images);
    });
    return () => {
      unsub.then((u) => u());
    };
  }, [currentProjectStore.setImages, currentProjectStore.project]);

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
              const imageFile = imagePaths[virtualRow.index];
              return (
                <li
                  key={virtualRow.key}
                  className={cn(
                    "h-8 p-1 cursor-pointer truncate w-full transition ease-in-out duration-200",
                    {
                      "text-gray-50 dark:text-gray-950 bg-primary rounded-sm":
                        imageFile.path === currentProjectStore.selectedImage,
                      "text-gray-700 dark:text-gray-300":
                        imageFile.path !== currentProjectStore.selectedImage,
                    }
                  )}
                  onMouseDown={() => {
                    currentProjectStore.selectImage(imageFile.path);
                    if (currentProjectStore.project)
                      currentProjectFileStore.load(
                        currentProjectStore.project,
                        imageFile.path
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
                  {imageFile.path.split("/").pop()}
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
