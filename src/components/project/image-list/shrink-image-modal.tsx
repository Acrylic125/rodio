import { useCallback, useState } from "react";
import { Button } from "../../ui/button";
import { RodioImage } from "@/lib/rodio-project";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
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
} from "../../ui/table";

export function stringifyBytes(bytes: number) {
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
