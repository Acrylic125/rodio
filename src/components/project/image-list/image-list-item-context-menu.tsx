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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentProjectStore } from "@/stores/current-project-store";
import { exists, removeFile } from "@tauri-apps/api/fs";
import { asImagesQK, isKeyStartingWith } from "@/lib/query-keys";

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
  const queryClient = useQueryClient();
  const deleteMut = useMutation({
    mutationFn: async (images: string[]) => {
      if (currentProjectStore.project === null) return;

      let imagePaths = Array.from(images);
      const removeFilesPromise = await Promise.allSettled(
        imagePaths.map((imagePath) => {
          return (async () => {
            if (await exists(imagePath)) {
              await removeFile(imagePath);
            }
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

      const removedFilesSet = new Set(removedFiles);
      const failedFiles = imagePaths.filter(
        (path) => !removedFilesSet.has(path)
      );

      await currentProjectStore.project.db.deleteLabelsForPaths(removedFiles);
      return {
        removedFiles,
        failedFiles,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          return isKeyStartingWith(
            query.queryKey,
            asImagesQK(currentProjectStore.project?.projectPath)
          );
        },
      });
    },
  });

  const deleteMutData = deleteMut.data;
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {deleteMutData ? (
        <DialogContent className="w-full max-w-xl md:max-w-2xl lg:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Delete Images</DialogTitle>
            <DialogDescription className="flex flex-row items-center gap-1">
              Successfully deleted {deleteMutData.removedFiles.length} images.
              However, {deleteMutData.failedFiles.length} images failed to
              delete.
            </DialogDescription>
          </DialogHeader>
          {deleteMutData.failedFiles.length > 0 ? (
            <ul className="flex flex-col w-full h-48 overflow-auto gap-2 py-4">
              {deleteMutData.failedFiles.map((failedFile) => {
                return (
                  <li
                    key={failedFile}
                    className="flex flex-row gap-2 border px-4 py-2.5 text-foreground"
                  >
                    {failedFile}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-48 gap-2 py-4">
              <h3>No failures</h3>
            </div>
          )}

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
            <Button
              type="submit"
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => {
                deleteMut.mutate(deleteMutData.failedFiles);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : (
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
            <Button
              type="submit"
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => {
                deleteMut.mutate(Array.from(images));
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
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
