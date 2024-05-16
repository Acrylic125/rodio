import { clamp } from "@/lib/utils";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { KonvaEventObject } from "konva/lib/Node";
import { type Rect as RectType } from "konva/lib/shapes/Rect";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Group } from "react-konva";
import { on } from "stream";

type Pos = { x: number; y: number };
type Label = {
  id: string;
  class: string;
  start: Pos;
  end: Pos;
};

const labelAnchorSize = 12;
const borderSelectedWidth = 2;
/**
 * [-1, -1] [0, -1] [1, -1]
 * [-1, 0]         [1, 0]
 * [-1, 1] [0, 1] [1, 1]
 */
const labelBoxAnchors = [
  {
    pos: "top-left",
    cursor: "nwse-resize",
    at: [-1, -1],
  },
  {
    pos: "top",
    cursor: "ns-resize",
    at: [0, -1],
  },
  {
    pos: "top-right",
    cursor: "nesw-resize",
    at: [1, -1],
  },
  {
    pos: "right",
    cursor: "ew-resize",
    at: [1, 0],
  },
  {
    pos: "bottom-right",
    cursor: "nwse-resize",
    at: [1, 1],
  },
  {
    pos: "bottom",
    cursor: "ns-resize",
    at: [0, 1],
  },
  {
    pos: "bottom-left",
    cursor: "nesw-resize",
    at: [-1, 1],
  },
  {
    pos: "left",
    cursor: "ew-resize",
    at: [-1, 0],
  },
] as const;

function ResizableRect({
  x,
  y,
  width,
  height,
  isSelected,
  resizeRotation,
  onAnchorMouseEnter,
  onAnchorMouseLeave,
  onAnchorDragStart,
  onAnchorDragMove,
  onAnchorDragEnd,
  children,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
  resizeRotation?: [1 | -1, 1 | -1];
  onAnchorMouseEnter?: (
    e: KonvaEventObject<MouseEvent>,
    anchor: (typeof labelBoxAnchors)[number]
  ) => void;
  onAnchorMouseLeave?: (
    e: KonvaEventObject<MouseEvent>,
    anchor: (typeof labelBoxAnchors)[number]
  ) => void;
  onAnchorDragStart?: (
    e: KonvaEventObject<DragEvent>,
    anchor: (typeof labelBoxAnchors)[number]
  ) => void;
  onAnchorDragMove?: (
    e: KonvaEventObject<DragEvent>,
    anchor: (typeof labelBoxAnchors)[number]
  ) => void;
  onAnchorDragEnd?: (
    e: KonvaEventObject<DragEvent>,
    anchor: (typeof labelBoxAnchors)[number]
  ) => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {isSelected && (
        <Rect
          x={x - borderSelectedWidth}
          y={y - borderSelectedWidth}
          width={width + borderSelectedWidth * 2}
          height={height + borderSelectedWidth * 2}
          stroke="#0ea5e9"
          strokeWidth={borderSelectedWidth}
        />
      )}
      {children}
      {isSelected &&
        labelBoxAnchors.map((anchor) => {
          const anchorOffset = labelAnchorSize / 2;
          let anchorX = x + width / 2 - anchorOffset;
          let anchorY = y + height / 2 - anchorOffset;

          const tranformedAnchorAt = [
            anchor.at[0] * (resizeRotation?.[0] ?? 1),
            anchor.at[1] * (resizeRotation?.[1] ?? 1),
          ];

          if (tranformedAnchorAt[0] >= 1) {
            anchorX = x + width - anchorOffset;
          } else if (tranformedAnchorAt[0] <= -1) {
            anchorX = x - anchorOffset;
          }

          if (tranformedAnchorAt[1] >= 1) {
            anchorY = y + height - anchorOffset;
          } else if (tranformedAnchorAt[1] <= -1) {
            anchorY = y - anchorOffset;
          }

          return (
            <Rect
              key={anchor.pos}
              x={anchorX}
              y={anchorY}
              width={labelAnchorSize}
              height={labelAnchorSize}
              fill="#e0f2fe"
              stroke="#0ea5e9"
              strokeWidth={1}
              draggable
              onMouseEnter={(e) => {
                onAnchorMouseEnter?.(e, anchor);
                // const stage = e.target.getStage();
                // if (!stage) return;
                // const container = stage.container();
                // container.style.cursor = anchor.cursor;
              }}
              onMouseLeave={(e) => {
                onAnchorMouseEnter?.(e, anchor);
                // const stage = e.target.getStage();
                // if (!stage) return;
                // const container = stage.container();
                // container.style.cursor = "default";
              }}
              onDragStart={(e) => {
                onAnchorDragStart?.(e, anchor);
              }}
              onDragEnd={(e) => {
                onAnchorDragEnd?.(e, anchor);
              }}
              onDragMove={(e) => {
                onAnchorDragMove?.(e, anchor);
              }}
            />
          );
        })}
    </>
  );
}

function LabelBox({
  isSelected,
  id,
  onRequestSelect,
  onResize,
  containerDimensions,
  defaultStartPos,
  defaultEndPos,
}: {
  isSelected: boolean;
  id: string;
  onRequestSelect?: (id: string) => void;
  onResize?: (id: string, start: Pos, end: Pos) => void;
  containerDimensions: { width: number; height: number };
  // Resync position with defaults by updating the key of the component.
  defaultStartPos: Pos;
  defaultEndPos: Pos;
}) {
  const ref = useRef<RectType | null>(null);
  const [startPos, setStartPos] = useState<Pos>(defaultStartPos);
  const [endPos, setEndPos] = useState<Pos>(defaultEndPos);
  const _onRequestSelect = useCallback(() => {
    onRequestSelect?.(id);
  }, [onRequestSelect, id]);

  const handleDrag = (
    e: KonvaEventObject<DragEvent>,
    triggerOnResize: boolean
  ) => {
    const pos = e.target.position();
    const width = Math.abs(endPos.x - startPos.x) * containerDimensions.width;
    const height = Math.abs(endPos.y - startPos.y) * containerDimensions.height;

    const start = {
      x: clamp(pos.x, 0, containerDimensions.width - width),
      y: clamp(pos.y, 0, containerDimensions.height - height),
    };
    const newStartPos = {
      x: start.x / containerDimensions.width,
      y: start.y / containerDimensions.height,
    };
    const newEndPos = {
      x: (start.x + width) / containerDimensions.width,
      y: (start.y + height) / containerDimensions.height,
    };

    e.target.position(start);
    setStartPos(newStartPos);
    setEndPos(newEndPos);
    if (triggerOnResize) {
      onResize?.(id, newStartPos, newEndPos);
    }
  };

  const initialResizePositions = useRef<{
    startPos: Pos;
    endPos: Pos;
  }>();
  const [resizeRotation, setResizeRotation] = useState<[1 | -1, 1 | -1]>([
    1, 1,
  ]);

  const x = startPos.x * containerDimensions.width;
  const y = startPos.y * containerDimensions.height;
  const width = Math.abs(endPos.x - startPos.x) * containerDimensions.width;
  const height = Math.abs(endPos.y - startPos.y) * containerDimensions.height;

  return (
    <Group onTap={_onRequestSelect} onMouseDown={_onRequestSelect}>
      <ResizableRect
        x={x}
        y={y}
        width={width}
        height={height}
        isSelected={isSelected}
        onAnchorDragStart={(e, anchor) => {
          initialResizePositions.current = {
            startPos,
            endPos,
          };
          const stage = e.target.getStage();
          if (!stage) return;
          const container = stage.container();
          container.style.cursor = anchor.cursor;
        }}
        onAnchorDragEnd={(e) => {
          initialResizePositions.current = undefined;
          setResizeRotation([1, 1]);
          const stage = e.target.getStage();
          if (!stage) return;
          const container = stage.container();
          container.style.cursor = "default";
        }}
        onAnchorDragMove={(e, anchor) => {
          if (!initialResizePositions.current) return;
          const anchorOffset = labelAnchorSize / 2;
          const pos = e.target.position();

          let newStartPos = initialResizePositions.current.startPos;
          let newEndPos = initialResizePositions.current.endPos;

          const tranformedAnchorAt = anchor.at;

          if (tranformedAnchorAt[0] >= 1) {
            newEndPos.x = (pos.x + anchorOffset) / containerDimensions.width;
          } else if (tranformedAnchorAt[0] <= -1) {
            newStartPos.x = (pos.x + anchorOffset) / containerDimensions.width;
          }

          if (tranformedAnchorAt[1] >= 1) {
            newEndPos.y = (pos.y + anchorOffset) / containerDimensions.height;
          } else if (tranformedAnchorAt[1] <= -1) {
            newStartPos.y = (pos.y + anchorOffset) / containerDimensions.height;
          }

          const _newStartPos = {
            x: clamp(Math.min(newStartPos.x, newEndPos.x), 0, 1),
            y: clamp(Math.min(newStartPos.y, newEndPos.y), 0, 1),
          };
          const _newEndPos = {
            x: clamp(Math.max(newStartPos.x, newEndPos.x), 0, 1),
            y: clamp(Math.max(newStartPos.y, newEndPos.y), 0, 1),
          };

          setStartPos(_newStartPos);
          setEndPos(_newEndPos);
          setResizeRotation([
            newEndPos.x >= newStartPos.x ? 1 : -1,
            newEndPos.y >= newStartPos.y ? 1 : -1,
          ]);
        }}
        resizeRotation={resizeRotation}
      >
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="#ff00004f"
          stroke="#ff0000"
          strokeWidth={4}
          draggable
          ref={ref}
          onDragEnd={(e) => handleDrag(e, true)}
          onDragMove={(e) => handleDrag(e, false)}
        />
      </ResizableRect>
    </Group>
  );
}

function NewLabelBox({
  pos1,
  pos2,
  containerDimensions,
}: {
  pos1: Pos;
  pos2: Pos;
  containerDimensions: { width: number; height: number };
}) {
  const x = Math.min(pos1.x, pos2.x) * containerDimensions.width;
  const y = Math.min(pos1.y, pos2.y) * containerDimensions.height;
  const width = Math.abs(pos2.x - pos1.x) * containerDimensions.width;
  const height = Math.abs(pos2.y - pos1.y) * containerDimensions.height;

  return (
    <Group>
      <ResizableRect x={x} y={y} width={width} height={height} isSelected>
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="#ff00004f"
          stroke="#ff0000"
          strokeWidth={4}
        />
      </ResizableRect>
    </Group>
  );
}

export default function ImagePreview({
  currentPath,
  mode = "label",
}: {
  currentPath: string;
  mode: "label" | "view";
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageContainerSize, setImageContainerSize] = useState({
    width: 0,
    height: 0,
  });
  const [focuusedLabel, setFocusedLabel] = useState<string | null>(null);
  const [labels, setLabels] = useState<Map<string, Label>>(() => {
    const temp = new Map();
    for (let i = 0; i < 100; i++) {
      temp.set(i.toString(), {
        id: i.toString(),
        class: "1",
        start: {
          x: 0.1,
          y: 0.1,
        },
        end: {
          x: 0.3,
          y: 0.3,
        },
      });
    }
    return temp;
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
  const [newLabel, setNewLabel] = useState<{
    pos1: Pos;
    pos2: Pos;
  } | null>(null);
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
      const id = Math.random().toString();
      const start = {
        x: Math.min(newLabel.pos1.x, newLabel.pos2.x),
        y: Math.min(newLabel.pos1.y, newLabel.pos2.y),
      };
      const end = {
        x: Math.max(newLabel.pos1.x, newLabel.pos2.x),
        y: Math.max(newLabel.pos1.y, newLabel.pos2.y),
      };
      setLabels((prev) => {
        const newLabels = new Map(prev);
        newLabels.set(id, {
          id,
          class: "1",
          start,
          end,
        });
        return newLabels;
      });
      setFocusedLabel(null);
      setNewLabel(null);
    }
  }, [newLabel, setFocusedLabel, setNewLabel, setLabels]);
  const onResize = useCallback(
    (id: string, start: Pos, end: Pos) => {
      setLabels((prev) => {
        const newLabels = new Map(prev);
        const label = newLabels.get(id);
        if (!label) return newLabels;
        newLabels.set(id, {
          ...label,
          start,
          end,
        });
        return newLabels;
      });
    },
    [setLabels]
  );

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
        className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 absolute"
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
          {Array.from(labels.values()).map((label) => {
            return (
              <LabelBox
                key={label.id}
                id={label.id}
                isSelected={focuusedLabel === label.id}
                onRequestSelect={setFocusedLabel}
                onResize={onResize}
                containerDimensions={imageContainerSize}
                defaultStartPos={label.start}
                defaultEndPos={label.end}
              />
            );
          })}
          {newLabel && (
            <NewLabelBox
              containerDimensions={imageContainerSize}
              pos1={newLabel.pos1}
              pos2={newLabel.pos2}
            />
          )}
        </Layer>
      </Stage>
    </>
  );
}
