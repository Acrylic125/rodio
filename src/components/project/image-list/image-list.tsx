import { cn, resolveError } from "@/lib/utils";
import { useCurrentProjectStore } from "@/stores/current-project-store";
import { useCurrentProjectFileStore } from "@/stores/current-project-file-store";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useRef, useState } from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { TriangleAlertIcon, XIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { RodioImage, isRodioImageTooLarge } from "@/lib/rodio-project";
import { useHotkeys } from "react-hotkeys-hook";
import { Skeleton } from "../../ui/skeleton";
import { useImageList } from "./use-image-list";
import { ImageListFilterButton } from "./image-list-filter-button";
import { stringifyBytes } from "./shrink-image-modal";
import {
  DeleteImagesModal,
  ImageListItemContextMenu,
} from "./image-list-item-context-menu";
import { nanoid } from "nanoid";

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
  const [massSelectImages, setMassSelectImages] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const onFilter = useCallback(() => {
    setMassSelectImages(null);
  }, [setMassSelectImages]);
  const onFilterImageQueryComplete = useCallback(
    (allImages: RodioImage[]) => {
      const selectedImage = useCurrentProjectStore.getState().selectedImage;
      if (selectedImage !== null) {
        if (
          allImages.findIndex((image) => image.path === selectedImage) === -1
        ) {
          currentProjectStore.selectImage(null);
        }
      }
      setSelectedImages((selectedImages) => {
        const availableImages = new Set(allImages.map((image) => image.path));
        return new Set(
          Array.from(selectedImages).filter((path) => availableImages.has(path))
        );
      });
    },
    [setSelectedImages, currentProjectStore.selectImage]
  );
  const { filterImagesQuery, filter, setFilter } = useImageList(
    currentProjectStore.project,
    { onFilter, onFilterImageQueryComplete }
  );
  const imagePaths = filterImagesQuery.isFetching
    ? []
    : filterImagesQuery.data ?? [];
  const parentRef = useRef(null);
  const rowVirtualizer = useVirtualizer({
    count: imagePaths.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // h-10
    overscan: 5,
  });
  useHotkeys("meta+down", () => {
    if (imagePaths.length === 0 || filterImagesQuery.isFetching) return;
    const currentIndex = imagePaths.findIndex(
      (image) => image.path === currentProjectStore.selectedImage
    );
    let nextIndex = 0;
    if (currentIndex !== -1) {
      nextIndex = (currentIndex + 1) % imagePaths.length;
    }
    const imagePath = imagePaths[nextIndex].path;

    rowVirtualizer.scrollToIndex(nextIndex);
    currentProjectStore.selectImage(imagePath);
    if (currentProjectStore.project)
      currentProjectFileStore.load(currentProjectStore.project, imagePath);
  });
  useHotkeys("meta+up", () => {
    if (imagePaths.length === 0 || filterImagesQuery.isFetching) return;
    const currentIndex = imagePaths.findIndex(
      (image) => image.path === currentProjectStore.selectedImage
    );
    let nextIndex = 0;
    if (currentIndex !== -1) {
      nextIndex =
        ((currentIndex <= 0 ? imagePaths.length - currentIndex : currentIndex) -
          1) %
        imagePaths.length;
    }
    const imagePath = imagePaths[nextIndex].path;

    rowVirtualizer.scrollToIndex(nextIndex);
    currentProjectStore.selectImage(imagePath);
    if (currentProjectStore.project)
      currentProjectFileStore.load(currentProjectStore.project, imagePath);
  });
  const [modal, setModal] = useState<{
    type: "shrink" | "delete";
    id: string;
  } | null>(null);

  let contentElement = null;
  if (filterImagesQuery.isFetching) {
    contentElement = (
      <div className="flex flex-col gap-2">
        <Skeleton className="w-full h-8" />
        <Skeleton className="w-full h-8" />
        <Skeleton className="w-full h-8" />
        <Skeleton className="w-full h-8" />
        <Skeleton className="w-full h-8" />
      </div>
    );
  } else if (filterImagesQuery.isError) {
    contentElement = (
      <div className="w-full p-4 flex flex-col items-center justify-center">
        <h3 className="text-red-500 text-center">Error loading images</h3>
        <p className="text-gray-500 text-center">
          {resolveError(filterImagesQuery.error)}
        </p>
      </div>
    );
  } else if (filterImagesQuery.data !== undefined) {
    contentElement = (
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

            let variant;
            if (currentProjectStore.selectedImage === imageFile.path) {
              variant = "default" as const;
              if (!selectedImages.has(imageFile.path)) {
                variant = "outline" as const;
              }
            } else if (selectedImages.has(imageFile.path)) {
              variant = "secondary" as const;
            } else {
              variant = "ghost" as const;
            }

            return (
              <li
                key={virtualRow.key}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="absolute w-full"
              >
                <ImageListItemContextMenu
                  imageFile={imageFile}
                  selectedImages={selectedImages}
                  setSelectedImages={setSelectedImages}
                  onRequestDelete={() => {
                    setModal({
                      type: "delete",
                      id: nanoid(12),
                    });
                  }}
                >
                  <Button
                    className={cn(
                      "flex flex-row justify-between items-center h-8 p-1 truncate w-full text-left",
                      {
                        "border-primary border-2": variant === "outline",
                      }
                    )}
                    variant={variant}
                    onClick={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                        setSelectedImages((selectedImages) => {
                          const newSet = new Set(selectedImages);
                          if (newSet.has(imageFile.path)) {
                            newSet.delete(imageFile.path);
                          } else {
                            newSet.add(imageFile.path);
                          }
                          return newSet;
                        });
                        setMassSelectImages({
                          start: imageFile.path,
                          end: imageFile.path,
                        });
                      } else if (e.shiftKey) {
                        let startIndex = imagePaths.findIndex(
                          (image) => image.path === massSelectImages?.start
                        );
                        if (startIndex === -1) {
                          startIndex = 0;
                        }

                        const newSelectedImages = new Set<string>(
                          selectedImages
                        );
                        if (massSelectImages?.end !== undefined) {
                          let lastEndIndex = imagePaths.findIndex(
                            (image) => image.path === massSelectImages.end
                          );
                          // Unset old selection
                          if (lastEndIndex !== -1) {
                            const minIndex = Math.min(startIndex, lastEndIndex);
                            const maxIndex = Math.max(startIndex, lastEndIndex);

                            if (minIndex >= 0 && maxIndex < imagePaths.length) {
                              for (let i = minIndex; i <= maxIndex; i++) {
                                console.log(imagePaths[i].path);
                                newSelectedImages.delete(imagePaths[i].path);
                              }
                            }
                          }
                        }

                        const clickedIndex = imagePaths.findIndex(
                          (image) => image.path === imageFile.path
                        );
                        if (startIndex !== -1) {
                          const minIndex = Math.min(startIndex, clickedIndex);
                          const maxIndex = Math.max(startIndex, clickedIndex);
                          for (let i = minIndex; i <= maxIndex; i++) {
                            newSelectedImages.add(imagePaths[i].path);
                          }
                          setMassSelectImages({
                            start: imagePaths[startIndex].path,
                            end: imagePaths[clickedIndex].path,
                          });
                        }
                        setSelectedImages(newSelectedImages);
                      } else {
                        setSelectedImages(new Set([imageFile.path]));
                        setMassSelectImages({
                          start: imageFile.path,
                          end: imageFile.path,
                        });
                        currentProjectStore.selectImage(imageFile.path);
                        if (currentProjectStore.project)
                          currentProjectFileStore.load(
                            currentProjectStore.project,
                            imageFile.path
                          );
                      }
                    }}
                  >
                    <p className="flex-1 overflow-hidden overflow-ellipsis cursor-pointer">
                      {imageFile.path.split("/").pop()}
                    </p>
                    <div
                      className="w-fit flex flex-row"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      {isRodioImageTooLarge(imageFile) && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              className="bg-transparent p-1 aspect-square w-6 h-6 rounded-sm"
                            >
                              <TriangleAlertIcon className="text-yellow-500" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="grid gap-4">
                              <div className="space-y-2">
                                <h4 className="font-medium leading-none">
                                  Image file is big! {"("}
                                  {stringifyBytes(imageFile.stat.size)}
                                  {")"}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  The image file is using up a lot of space.
                                  Consider shrinking it.
                                </p>
                              </div>
                              <div className="flex flex-col gap2">
                                <div>
                                  <Button
                                    variant="secondary"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setModal({
                                        type: "shrink",
                                        id: nanoid(12),
                                      });
                                    }}
                                  >
                                    Shrink
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </Button>
                </ImageListItemContextMenu>
              </li>
            );
          })
        ) : (
          <div className="w-full p-4 flex items-center justify-center">
            <p>No images found</p>
          </div>
        )}
      </ul>
    );
  }

  return (
    <>
      <DeleteImagesModal
        key={modal?.id}
        isOpen={modal?.type === "delete"}
        setIsOpen={(isOpen) =>
          setModal(
            isOpen
              ? {
                  type: "delete",
                  id: modal?.id ?? nanoid(12),
                }
              : null
          )
        }
        images={selectedImages}
      />
      {/* <ShrinkImageModal
        isOpen={modal === "shrink"}
        setIsOpen={(isOpen) => setModal(isOpen ? "shrink" : null)}
        images={selectedImages}
      /> */}
      <div className="flex flex-col gap-2 w-full border-b border-gray-300 dark:border-gray-700 top-0 p-3">
        <div className="flex flex-row justify-between gap-2">
          <h2 className="text-gray-500 font-medium">FILES</h2>
          {selectedImages.size > 0 && (
            <div className="flex flex-row gap-1 items-center">
              <p className="text-xs md:text-sm truncate overflow-hidden flex-1">
                {selectedImages.size} Selected
              </p>
              <Button
                variant="ghost"
                className="h-6 w-6 p-0.5"
                onClick={() => {
                  setSelectedImages(new Set());
                }}
              >
                <XIcon />
              </Button>
            </div>
          )}
        </div>
        <div className="flex flex-row gap-2">
          <Input
            placeholder="Search"
            value={filter.searchString}
            onChange={(e) => {
              setFilter({ ...filter, searchString: e.target.value });
            }}
          />
          <ImageListFilterButton
            filter={filter}
            setFilter={setFilter}
            filterImagesQuery={filterImagesQuery}
            project={currentProjectStore.project}
          />
        </div>
      </div>
      <div
        className="flex flex-col flex-1 w-full p-2 select-none overflow-auto"
        ref={parentRef}
      >
        {contentElement}
      </div>
    </>
  );
}
