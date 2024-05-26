import { cn } from "@/lib/utils";
import { useCurrentProjectStore } from "@/stores/current-project-store";
import { useCurrentProjectFileStore } from "@/stores/current-project-file-store";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { FilterIcon, TriangleAlertIcon } from "lucide-react";
import { appWindow } from "@tauri-apps/api/window";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { RodioImage, isRodioImageTooLarge } from "@/lib/rodio-project";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

function stringifyBytes(bytes: number) {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 Byte";
  const i = Math.floor(Math.log(bytes) / Math.log(1000));
  return `${(bytes / Math.pow(1000, i)).toFixed(2)} ${sizes[Math.min(i, sizes.length - 1)]}`;
}

export function ShrinkImageModal({
  isOpen,
  setIsOpen,
  images,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  images: RodioImage[];
}) {
  const [shrinkSize, setShrinkSize] = useState<"small" | "medium" | "large">(
    "small"
  );
  const shrink = useCallback(
    (_image: RodioImage, amount: "small" | "medium" | "large") => {
      const resizedImage = {
        width: _image.stat.width,
        height: _image.stat.height,
      };
      let desiredHiValue = 640;
      if (amount === "medium") desiredHiValue = 960;
      if (amount === "large") desiredHiValue = 1080;

      if (resizedImage.width > resizedImage.height) {
        if (resizedImage.width > desiredHiValue) {
          const oldWidth = resizedImage.width;
          resizedImage.width = desiredHiValue;
          resizedImage.height = Math.round(
            (resizedImage.width / oldWidth) * resizedImage.height
          );
        }
      } else {
        if (resizedImage.height > desiredHiValue) {
          const oldHeight = resizedImage.height;
          resizedImage.height = desiredHiValue;
          resizedImage.width = Math.round(
            (resizedImage.height / oldHeight) * resizedImage.width
          );
        }
      }
      return resizedImage;
    },
    []
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-full max-w-xl md:max-w-2xl lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Shrink Images</DialogTitle>
        </DialogHeader>
        <div>
          <label className="flex flex-col gap-2">
            <span>Shrink Size</span>
            <Select value={shrinkSize} onValueChange={setShrinkSize as any}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a shrink size" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Shrink Size</SelectLabel>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
        </div>
        <div className="max-h-72 w-full overflow-auto border border-gray-300 dark:border-gray-700 rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">File Path</TableHead>
                <TableHead>Resolution</TableHead>
                <TableHead className="text-right">Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {images.map((image) => {
                const newResolution = shrink(image, shrinkSize);
                return (
                  <TableRow key={image.path}>
                    <TableCell className="text-base">
                      {image.path.split("/").pop()}
                    </TableCell>
                    <TableCell className="text-base">
                      <span className="text-gray-700 dark:text-gray-300">
                        {image.stat.width}x{image.stat.height}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {" -> "}
                      </span>
                      {newResolution.width}x{newResolution.height}
                    </TableCell>
                    <TableCell className="text-right text-base text-gray-700 dark:text-gray-300">
                      {stringifyBytes(image.stat.size)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button type="submit">Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  const [shrinkImagesFocused, setShrinkImagesFocused] = useState<RodioImage[]>(
    []
  );

  return (
    <>
      <ShrinkImageModal
        isOpen={shrinkImagesFocused.length > 0}
        setIsOpen={() => setShrinkImagesFocused([])}
        images={shrinkImagesFocused}
      />
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
                  tabIndex={0}
                  className={cn(
                    "flex flex-row justify-between items-center absolute top-0 left-0 h-8 p-1 cursor-pointer truncate w-full transition ease-in-out duration-200",
                    {
                      "text-gray-50 dark:text-gray-950 bg-primary rounded-sm":
                        imageFile.path === currentProjectStore.selectedImage,
                      "text-gray-700 dark:text-gray-300":
                        imageFile.path !== currentProjectStore.selectedImage,
                    }
                  )}
                  onClick={() => {
                    currentProjectStore.selectImage(imageFile.path);
                    if (currentProjectStore.project)
                      currentProjectFileStore.load(
                        currentProjectStore.project,
                        imageFile.path
                      );
                  }}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
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
                                    setShrinkImagesFocused([imageFile]);
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
