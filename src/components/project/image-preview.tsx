import { convertFileSrc } from "@tauri-apps/api/tauri";
import { Stage, Layer } from "react-konva";
import { cn } from "@/lib/utils";
import { NewLabelBox } from "./new-label-box";
import { LabelBox } from "./label-box";
import { useCurrentProjectStore } from "@/stores/current-project-store";
import { useCurrentProjectFileStore } from "@/stores/current-project-file-store";
import { useImageContainer } from "./use-image-container";
import { useSaveLabels } from "./use-save-labels";
import { useLabelActions } from "./use-label-actions";
import { useImagePreviewCursors } from "./use-image-preview-cursors";
import { useOptimisedImage } from "../image/image";

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
    ({ projectPath, labels, setLabels }) => {
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
  const img = useOptimisedImage(imageRef, currentPath);
  console.log(img.data);

  return (
    <>
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
