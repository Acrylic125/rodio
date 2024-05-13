import { convertFileSrc } from "@tauri-apps/api/tauri";
import { KonvaEventObject } from "konva/lib/Node";
import { type Rect as RectType } from "konva/lib/shapes/Rect";
import { type Transformer as TransformerType } from "konva/lib/shapes/Transformer";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Rect,
  Group,
  Transformer,
  KonvaNodeComponent,
} from "react-konva";

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
    cursor: "diagonal",
    at: [-1, -1],
  },
  {
    pos: "top",
    cursor: "vertical",
    at: [0, -1],
  },
  {
    pos: "top-right",
    cursor: "diagonal",
    at: [1, -1],
  },
  {
    pos: "right",
    cursor: "horizontal",
    at: [1, 0],
  },
  {
    pos: "bottom-right",
    cursor: "diagonal",
    at: [1, 1],
  },
  {
    pos: "bottom",
    cursor: "vertical",
    at: [0, 1],
  },
  {
    pos: "bottom-left",
    cursor: "diagonal",
    at: [-1, 1],
  },
  {
    pos: "left",
    cursor: "horizontal",
    at: [-1, 0],
  },
] as const;

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
  onRequestSelect: (id: string) => void;
  onResize: (id: string, start: Pos, end: Pos) => void;
  containerDimensions: { width: number; height: number };
  // Resync position with defaults by updating the key of the component.
  defaultStartPos: Pos;
  defaultEndPos: Pos;
}) {
  const ref = useRef<RectType | null>(null);
  const transformerRef = useRef<TransformerType | null>(null);
  const [startPos, setStartPos] = useState<Pos>(defaultStartPos);
  const [endPos, setEndPos] = useState<Pos>(defaultEndPos);
  const _onRequestSelect = useCallback(() => {
    onRequestSelect(id);
  }, [onRequestSelect, id]);

  useEffect(() => {
    if (!ref.current || !transformerRef.current) return;
    if (!isSelected) return;
    transformerRef.current.setNodes([ref.current]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [ref.current, transformerRef.current, isSelected]);

  const handleDrag = (
    e: KonvaEventObject<DragEvent>,
    triggerOnResize: boolean
  ) => {
    const pos = e.target.position();
    const width = Math.abs(endPos.x - startPos.x) * containerDimensions.width;
    const height = Math.abs(endPos.y - startPos.y) * containerDimensions.height;

    const start = {
      x: Math.min(Math.max(pos.x, 0), containerDimensions.width - width),
      y: Math.min(Math.max(pos.y, 0), containerDimensions.height - height),
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
      onResize(id, newStartPos, newEndPos);
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
      {/* <Rect /> */}
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
        // onTransformEnd={() => handleTransform(false)}
        // onTransform={() => handleTransform(false)}
      />
      {isSelected &&
        labelBoxAnchors.map((anchor) => {
          let anchorX = x + width / 2;
          let anchorY = y + height / 2;
          const anchorOffset = labelAnchorSize / 2;
          // const anchorOffset = 0;

          const tranformedAnchorAt = [
            anchor.at[0] * resizeRotation[0],
            anchor.at[1] * resizeRotation[1],
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
              onDragStart={() => {
                console.log("Start");
                initialResizePositions.current = {
                  startPos,
                  endPos,
                };
              }}
              onDragEnd={() => {
                initialResizePositions.current = undefined;
                setResizeRotation([1, 1]);
              }}
              onDragMove={(e) => {
                if (!initialResizePositions.current) return;
                const anchorOffset = labelAnchorSize / 2;
                const pos = e.target.position();

                let newStartPos = initialResizePositions.current.startPos;
                let newEndPos = initialResizePositions.current.endPos;

                const tranformedAnchorAt = anchor.at;

                if (tranformedAnchorAt[0] >= 1) {
                  newEndPos.x =
                    (pos.x + anchorOffset) / containerDimensions.width;
                } else if (tranformedAnchorAt[0] <= -1) {
                  newStartPos.x =
                    (pos.x + anchorOffset) / containerDimensions.width;
                }

                if (tranformedAnchorAt[1] >= 1) {
                  newEndPos.y =
                    (pos.y + anchorOffset) / containerDimensions.height;
                } else if (tranformedAnchorAt[1] <= -1) {
                  newStartPos.y =
                    (pos.y + anchorOffset) / containerDimensions.height;
                }

                const _newStartPos = {
                  x: Math.min(newStartPos.x, newEndPos.x),
                  y: Math.min(newStartPos.y, newEndPos.y),
                };
                const _newEndPos = {
                  x: Math.max(newStartPos.x, newEndPos.x),
                  y: Math.max(newStartPos.y, newEndPos.y),
                };

                setStartPos(_newStartPos);
                setEndPos(_newEndPos);
                setResizeRotation([
                  newEndPos.x >= newStartPos.x ? 1 : -1,
                  newEndPos.y >= newStartPos.y ? 1 : -1,
                ]);
              }}
            />
          );
        })}
      {/* {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          flipEnabled={false}
          // anchorDragBoundFunc={(oldPos, newPos) => {
          //   console.log(newPos);
          //   return {
          //     x: Math.max(Math.min(newPos.x, containerDimensions.width), 0),
          //     // y: 0,
          //     y: Math.max(Math.min(newPos.y, containerDimensions.height), 0),
          //   };
          // }}
        />
      )} */}
    </Group>
  );
}

export default function ImagePreview({ currentPath }: { currentPath: string }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageContainerSize, setImageContainerSize] = useState({
    width: 0,
    height: 0,
  });
  const [focuusedLabel, setFocusedLabel] = useState<string | null>(null);
  const [labels, setLabels] = useState<Map<string, Label>>(() => {
    const temp = new Map();
    for (let i = 0; i < 10; i++) {
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
    const imgAspectRatio = target.naturalWidth / target.naturalHeight;
    const containerAspectRatio = size.width / size.height;
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
      const padY =
        (target.naturalWidth * size.height -
          size.width * target.naturalHeight) /
        (2 * target.naturalWidth);
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
      // console.log(
      //   `Natural: ${target.naturalWidth} ${target.naturalHeight} (${target.naturalWidth / target.naturalHeight}) Normal: ${size.width} ${size.height} (${size.width / size.height})`
      // );
      // setImageContainerSize(size);
    });
    resizeObserver.observe(imageRef.current);
  }, [imageRef.current, updateContainerSize]);
  const deselectCheck = useCallback(
    (e: KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>) => {
      {
        const clickedOnEmpty = e.target === e.target.getStage();
        if (clickedOnEmpty) {
          setFocusedLabel(null);
        }
      }
    },
    [setFocusedLabel]
  );
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
        onMouseDown={deselectCheck}
        onTouchStart={deselectCheck}
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
        </Layer>
      </Stage>
    </>
  );
}
