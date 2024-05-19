import { convertFileSrc } from "@tauri-apps/api/tauri";
import { KonvaEventObject } from "konva/lib/Node";
import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer } from "react-konva";
import { cn } from "@/lib/utils";
import { Pos, getResizeCursorByAnchor, labelBoxAnchors } from "./label-anchors";
import { NewLabelBox } from "./new-label-box";
import { LabelBox } from "./label-box";
import { useKeyPress } from "@/lib/use-keypress";
import { useCurrentProjectStore } from "@/stores/current-project-store";
import { LabelId } from "@/lib/rodio-project";
import { useCurrentProjectFileStore } from "@/stores/current-project-file-store";

type Cursor =
  | (typeof labelBoxAnchors)[number]["cursor"]
  | "crosshair"
  | "move"
  | "default";

function useImagePreviewCursors({
  mode,
  newLabel,
}: {
  mode: "label" | "view";
  newLabel: { pos1: Pos; pos2: Pos } | null;
}) {
  const [labelSuggestedCursor, setLabelSuggestedCursor] =
    useState<Cursor | null>(null);
  const newLabelCursor = newLabel
    ? getResizeCursorByAnchor(
        newLabel.pos2.x - newLabel.pos1.x,
        newLabel.pos2.y - newLabel.pos1.y
      )
    : null;

  let cursor: Cursor = mode === "label" ? "crosshair" : ("default" as const);
  if (labelSuggestedCursor !== null) {
    cursor = labelSuggestedCursor;
  }
  if (newLabelCursor !== null) {
    cursor = newLabelCursor;
  }

  return {
    cursor,
    labelSuggestedCursor,
    setLabelSuggestedCursor,
  };
}

function useImageContainer() {
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageContainerSize, setImageContainerSize] = useState({
    width: 0,
    height: 0,
  });
  const updateContainerSize = useCallback((target: HTMLImageElement) => {
    const bb = target.getBoundingClientRect();
    const size = {
      width: bb.width,
      height: bb.height,
    };
    const imgAspectRatio =
      target.naturalHeight > 0 ? target.naturalWidth / target.naturalHeight : 0;
    const containerAspectRatio = size.height > 0 ? size.width / size.height : 0;
    // W = container width
    // H = container height
    // w = image width
    // h = image height
    // IMPORTANT! The image resolution DOES NOT EQUAL TO THE space used by the image element.

    // If w/h < W/H, then we have to add padding, x, to the width
    // (Hw/h - W) / -2 = x
    if (imgAspectRatio < containerAspectRatio) {
      const padX = (size.height * imgAspectRatio - size.width) / -2;
      size.width = size.width - padX * 2;
    }
    // Otherwise,
    // (wH - Wh) / 2w = y
    else {
      let padY = 0;
      if (target.naturalWidth > 0) {
        padY =
          (target.naturalWidth * size.height -
            size.width * target.naturalHeight) /
          (2 * target.naturalWidth);
      }
      size.height = size.height - padY * 2;
    }
    setImageContainerSize(size);
  }, []);
  useEffect(() => {
    if (!imageRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];

      const target = entry.target;
      if (!(target instanceof HTMLImageElement)) return;
      updateContainerSize(target);
    });
    resizeObserver.observe(imageRef.current);
  }, [imageRef.current, updateContainerSize]);
  return {
    imageRef,
    imageContainerSize,
    updateContainerSize,
  };
}

export default function ImagePreview({
  currentPath,
  mode = "label",
}: {
  currentPath: string;
  mode: "label" | "view";
}) {
  const [focuusedLabel, setFocusedLabel] = useState<LabelId | null>(null);
  const { imageRef, imageContainerSize, updateContainerSize } =
    useImageContainer();
  const currentProjectFileStore = useCurrentProjectFileStore(
    ({ labels, tempLabels, setLabels, setTempLabels }) => {
      return {
        labels,
        tempLabels,
        setLabels,
        setTempLabels,
      };
    }
  );
  const [newLabel, setNewLabel] = useState<{
    pos1: Pos;
    pos2: Pos;
  } | null>(null);
  const currentProjectStore = useCurrentProjectStore(
    ({ classesMap, selectedClass }) => {
      return {
        classesMap,
        selectedClass,
      };
    }
  );
  const onStageMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setFocusedLabel(null);
        const pos = {
          x: e.evt.offsetX,
          y: e.evt.offsetY,
        };
        const relPos = {
          x:
            imageContainerSize.width > 0 ? pos.x / imageContainerSize.width : 0,
          y:
            imageContainerSize.height > 0
              ? pos.y / imageContainerSize.height
              : 0,
        };
        setNewLabel({
          pos1: {
            ...relPos,
          },
          pos2: {
            ...relPos,
          },
        });
      }
    },
    [setFocusedLabel, setNewLabel, imageContainerSize]
  );
  const onStageMouseUp = useCallback(() => {
    if (newLabel !== null) {
      const id = Math.random();
      const start = {
        x: Math.min(newLabel.pos1.x, newLabel.pos2.x),
        y: Math.min(newLabel.pos1.y, newLabel.pos2.y),
      };
      const end = {
        x: Math.max(newLabel.pos1.x, newLabel.pos2.x),
        y: Math.max(newLabel.pos1.y, newLabel.pos2.y),
      };
      currentProjectFileStore.setLabels((prev) => {
        if (currentProjectStore.selectedClass === null) return prev;
        const newLabels = new Map(prev);
        newLabels.set(id, {
          id,
          class: currentProjectStore.selectedClass,
          start,
          end,
        });
        return newLabels;
      });
      setFocusedLabel(id);
      setNewLabel(null);
    }
  }, [
    currentProjectStore.selectedClass,
    newLabel,
    setFocusedLabel,
    setNewLabel,
    currentProjectFileStore.setLabels,
  ]);
  const onResize = useCallback(
    (id: LabelId, start: Pos, end: Pos) => {
      currentProjectFileStore.setLabels((prev) => {
        const newLabels = new Map(prev);
        const label = newLabels.get(id);
        if (!label) return newLabels;
        newLabels.set(id, {
          id: label.id,
          class: label.class,
          start,
          end,
        });
        return newLabels;
      });
    },
    [currentProjectFileStore.setLabels]
  );
  const { cursor, setLabelSuggestedCursor } = useImagePreviewCursors({
    mode,
    newLabel,
  });
  useKeyPress(() => setFocusedLabel(null), ["Escape"]);
  useKeyPress(() => {
    const _focuusedLabel = focuusedLabel;
    if (_focuusedLabel === null) return;
    setFocusedLabel(null);
    currentProjectFileStore.setLabels((prev) => {
      const newLabels = new Map(prev);
      newLabels.delete(_focuusedLabel);
      return newLabels;
    });
  }, ["Backspace"]);

  return (
    <>
      <img
        src={convertFileSrc(currentPath)}
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
        onMouseMove={(e) => {
          setNewLabel((prev) => {
            if (prev === null) return prev;
            const pos = {
              x: e.evt.offsetX,
              y: e.evt.offsetY,
            };
            return {
              ...prev,
              pos2: {
                x:
                  imageContainerSize.width > 0
                    ? pos.x / imageContainerSize.width
                    : 0,
                y:
                  imageContainerSize.height > 0
                    ? pos.y / imageContainerSize.height
                    : 0,
              },
            };
          });
        }}
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
          {Array.from(currentProjectFileStore.tempLabels.values()).map(
            (label) => {
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
            }
          )}
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
