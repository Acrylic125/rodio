import { convertFileSrc } from "@tauri-apps/api/tauri";
import { Stage, Layer } from "react-konva";
import { cn, resolveError } from "@/lib/utils";
import { NewLabelBox } from "./new-label-box";
import { LabelBox } from "./label-box";
import { useCurrentProjectStore } from "@/stores/current-project-store";
import { useCurrentProjectFileStore } from "@/stores/current-project-file-store";
import { useImageContainer } from "./use-image-container";
import { useSaveLabels } from "./use-save-labels";
import { useLabelActions } from "./use-label-actions";
import { useImagePreviewCursors } from "./use-image-preview-cursors";
import { useOptimisedImage } from "../image/use-optimised-image";
import { Loader2 } from "lucide-react";

export default function ImagePreview({
  currentPath,
  mode = "label",
}: {
  currentPath: string;
  mode: "label" | "view";
}) {
  const { imageRef, imageContainerSize, updateContainerSize } =
    useImageContainer();
  const currentProjectFileStore = useCurrentProjectFileStore(
    ({ filePath: projectPath, labels, setLabels }) => {
      return {
        projectPath,
        labels,
        setLabels,
      };
    }
  );
  const currentProjectStore = useCurrentProjectStore(
    ({ project, classesMap, selectedClass }) => {
      return {
        project,
        classesMap,
        selectedClass,
      };
    }
  );
  const { saveLabels } = useSaveLabels(
    currentProjectFileStore.projectPath,
    currentProjectStore.project
  );
  const {
    setFocusedLabel,
    focuusedLabel,
    onStageMouseDown,
    onStageMouseMove,
    onStageMouseUp,
    onResize,
    newLabel,
  } = useLabelActions({
    imageContainerSize,
    saveLabels,
    currentProjectFileStore,
    currentProjectStore,
  });
  const { cursor, setLabelSuggestedCursor } = useImagePreviewCursors({
    mode,
    newLabel,
  });
  const img = useOptimisedImage(
    imageRef,
    currentPath,
    currentProjectStore.project
      ? currentProjectStore.project.getProjectFileFullPath(
          currentProjectStore.project.cache
        )
      : undefined
  );

  let imageElement = null;
  if (img.isPending && !img.data) {
    imageElement = (
      <Loader2 className="text-primary w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 animate-spin" />
    );
  } else if (img.isError) {
    imageElement = (
      <div className="flex flex-col gap-2">
        <h2 className="text-red-500 text-lg font-medium text-center">
          Error loading image
        </h2>
        <h2 className="text-gray-500 dark:text-gray-500 font-medium text-center">
          {resolveError(img.error)}
        </h2>
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-full relative">
        <img
          src={img.data ? convertFileSrc(img.data) : ""}
          loading="lazy"
          alt={`Preview ${currentPath}`}
          className="w-full h-full object-contain select-none"
          ref={imageRef}
          draggable={false}
          onLoad={(e) => {
            if (!(e.target instanceof HTMLImageElement)) return;
            updateContainerSize(e.target);
          }}
        />
        {imageElement !== null && (
          <div className="absolute top-0 left-0 bg-black w-full h-full flex flex-col items-center justify-center">
            {imageElement}
          </div>
        )}
      </div>
      <Stage
        width={imageContainerSize.width}
        height={imageContainerSize.height}
        className={cn(
          "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 absolute",
          {
            "cursor-default": cursor === "default",
            "cursor-ns-resize": cursor === "ns-resize",
            "cursor-ew-resize": cursor === "ew-resize",
            "cursor-nwse-resize": cursor === "nwse-resize",
            "cursor-nesw-resize": cursor === "nesw-resize",
            "cursor-crosshair": cursor === "crosshair",
            "cursor-move": cursor === "move",
          }
        )}
        onMouseDown={onStageMouseDown}
        onMouseMove={onStageMouseMove}
        onMouseUp={onStageMouseUp}
      >
        <Layer>
          {Array.from(currentProjectFileStore.labels.values()).map((label) => {
            return (
              <LabelBox
                key={label.id}
                id={label.id}
                color={
                  currentProjectStore.classesMap.get(label.class)?.color ??
                  "#000000"
                }
                isSelected={focuusedLabel === label.id}
                onRequestSelect={setFocusedLabel}
                onResize={onResize}
                onRequestCursorChange={setLabelSuggestedCursor}
                containerDimensions={imageContainerSize}
                defaultStartPos={label.start}
                defaultEndPos={label.end}
              />
            );
          })}
          {newLabel && (
            <NewLabelBox
              containerDimensions={imageContainerSize}
              color={
                currentProjectStore.classesMap.get(
                  currentProjectStore.selectedClass ?? 0
                )?.color ?? "#000000"
              }
              pos1={newLabel.pos1}
              pos2={newLabel.pos2}
            />
          )}
        </Layer>
      </Stage>
    </>
  );
}
