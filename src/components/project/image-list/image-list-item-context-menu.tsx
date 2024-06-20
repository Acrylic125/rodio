import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { RodioImage } from "@/lib/rodio-project";

export function ImageListItemContextMenu({
  selectedImages,
  setSelectedImages,
  imageFile,
  children,
}: {
  selectedImages: Set<string>;
  setSelectedImages: React.Dispatch<React.SetStateAction<Set<string>>>;
  imageFile: RodioImage;
  children: React.ReactNode;
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
        <ContextMenuItem>Delete {selectedImages.size} Items</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
