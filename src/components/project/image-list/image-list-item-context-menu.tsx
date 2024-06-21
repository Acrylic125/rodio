import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { RodioImage } from "@/lib/rodio-project";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogDescription } from "@radix-ui/react-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation } from "@tanstack/react-query";
import { useCurrentProjectStore } from "@/stores/current-project-store";
import { removeFile } from "@tauri-apps/api/fs";

export function DeleteImagesModal({
  isOpen,
  setIsOpen,
  images,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  images: Set<string>;
}) {
  const currentProjectStore = useCurrentProjectStore(({ project }) => {
    return { project };
  });
  const deleteMut = useMutation({
    mutationFn: async () => {
      if (currentProjectStore.project === null) return;

      let imagePaths = Array.from(images);
      const removeFilesPromise = await Promise.allSettled(
        imagePaths.map((imagePath) => {
          return (async () => {
            await removeFile(imagePath);
            return imagePath;
          })();
        })
      );
      const removedFiles = removeFilesPromise
        .map((res) => {
          if (res.status === "fulfilled") {
            return res.value;
          }
          return null;
        })
        .filter((path) => path !== null) as string[];

      await currentProjectStore.project.db.deleteLabelsForPaths([...images]);
    },
    onSuccess: () => {},
  });
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-full max-w-xl md:max-w-2xl lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Delete Images</DialogTitle>
          <DialogDescription className="flex flex-row items-center gap-1">
            Are you sure you want to delete {images.size} images?{" "}
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertDescription>
            Deleting images will remove all associated labels. This action
            cannot be undone.
          </AlertDescription>
        </Alert>
        <DialogFooter>
          <Button
            onClick={() => {
              setIsOpen(false);
            }}
            variant="secondary"
          >
            Cancel
          </Button>
          <Button type="submit" variant="destructive">
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ImageListItemContextMenu({
  selectedImages,
  setSelectedImages,
  imageFile,
  children,
  onRequestDelete,
}: {
  selectedImages: Set<string>;
  setSelectedImages: React.Dispatch<React.SetStateAction<Set<string>>>;
  imageFile: RodioImage;
  children: React.ReactNode;
  onRequestDelete?: () => void;
}) {
  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (open) {
          if (!selectedImages.has(imageFile.path)) {
            setSelectedImages(new Set([imageFile.path]));
          }
        }
      }}
    >
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem onClick={onRequestDelete}>
          Delete {selectedImages.size} Items
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
