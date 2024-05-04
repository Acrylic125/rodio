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

type Label = {
  id: string;
  class: string;
  start: [number, number];
  end: [number, number];
};

function Anchor({
  x,
  y,
  onResize,
}: {
  x: number;
  y: number;
  onResize: () => void;
}) {
  return (
    <Rect
      x={x}
      y={y}
      width={10}
      height={10}
      fill="white"
      stroke="gray"
      strokeWidth={2}
      draggable
      onDragEnd={onResize}
    />
  );
}

function LabelBox({
  isSelected,
  onRequestSelect,
  label,
  containerDimensions,
}: {
  isSelected: boolean;
  onRequestSelect: () => void;
  label: Label;
  containerDimensions: { width: number; height: number };
}) {
  const ref = useRef<RectType | null>(null);
  const transformerRef = useRef<TransformerType | null>(null);
  const [startPos, setStartPos] = useState<{
    x: number;
    y: number;
  }>({
    x: 0,
    y: 0,
  });
  const [endPos, setEndPos] = useState<{
    x: number;
    y: number;
  }>({
    x: 0.2,
    y: 0.2,
  });

  useEffect(() => {
    if (!ref.current || !transformerRef.current) return;
    if (!isSelected) return;
    transformerRef.current.setNodes([ref.current]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [ref.current, transformerRef.current, isSelected]);

  return (
    <Group
      onClick={() => {
        onRequestSelect();
      }}
    >
      {/* <Rect /> */}
      <Rect
        // x={x}
        // y={y}
        // width={width}
        // height={height}
        // width={100}
        // height={100}

        x={startPos.x * containerDimensions.width}
        y={startPos.y * containerDimensions.height}
        width={Math.abs(endPos.x - startPos.x) * containerDimensions.width}
        height={Math.abs(endPos.y - startPos.y) * containerDimensions.height}
        fill="#ff00004f"
        stroke="#ff0000"
        strokeWidth={4}
        draggable
        // onDragEnd={(e) => {
        //   const pos = e.target.getPosition();
        //   const start: [number, number] = [
        //     Math.max(pos.x / imageContainerSize.width, 0),
        //     Math.max(pos.y / imageContainerSize.height, 0),
        //   ];
        //   e.target.setPosition({ x: start[0], y: start[1] });
        //   setLabels((prev) => {
        //     const temp = new Map(prev);
        //     temp.set(label.id, {
        //       ...label,
        //       start: start,
        //       end: [
        //         (start[0] + width) / imageContainerSize.width,
        //         (start[1] + height) / imageContainerSize.height,
        //       ],
        //     });
        //     return temp;
        //   });
        // }}
        // dragBoundFunc={}
        ref={ref}
        onDragMove={(e) => {
          const pos = e.target.position();
          const width =
            Math.abs(endPos.x - startPos.x) * containerDimensions.width;
          const height =
            Math.abs(endPos.y - startPos.y) * containerDimensions.height;

          const start = {
            x: Math.min(Math.max(pos.x, 0), containerDimensions.width - width),
            y: Math.min(
              Math.max(pos.y, 0),
              containerDimensions.height - height
            ),
          };
          const newStartPos = {
            x: start.x / containerDimensions.width,
            y: start.y / containerDimensions.height,
          };

          e.target.position(start);
          setStartPos(newStartPos);
          setEndPos({
            x: (start.x + width) / containerDimensions.width,
            y: (start.y + height) / containerDimensions.height,
          });
        }}
        onTransform={() => {
          const node = ref.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          node.scaleX(1);
          node.scaleY(1);
          const width = node.width() * scaleX;
          const height = node.height() * scaleY;

          const start = {
            x: node.x(),
            y: node.y(),
          };
          setStartPos({
            x: Math.max(Math.min(start.x / containerDimensions.width, 1), 0),
            y: Math.max(Math.min(start.y / containerDimensions.height, 1), 0),
          });
          setEndPos({
            x: Math.max(
              Math.min((start.x + width) / containerDimensions.width, 1),
              0
            ),
            y: Math.max(
              Math.min((start.y + height) / containerDimensions.height, 1),
              0
            ),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          flipEnabled={false}
        />
      )}
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
        start: [0, 0],
        end: [0.3, 0.3],
      });
    }
    return temp;
  });

  useEffect(() => {
    if (!imageRef.current) return;
    const resizeObserver = new ResizeObserver((entry) => {
      const size = entry[0].contentRect;
      setImageContainerSize(size);
    });
    resizeObserver.observe(imageRef.current);
  }, [imageRef.current]);
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

  return (
    <>
      <img
        src={convertFileSrc(currentPath)}
        loading="lazy"
        alt="test"
        className="w-full h-full object-contain"
        ref={imageRef}
      />
      <Stage
        width={imageContainerSize.width}
        height={imageContainerSize.height}
        className="top-0 left-0 absolute"
        onMouseDown={deselectCheck}
        onTouchStart={deselectCheck}
      >
        <Layer>
          {Array.from(labels.values()).map((label) => {
            const [x, y] = [
              label.start[0] * imageContainerSize.width,
              label.start[1] * imageContainerSize.height,
            ];
            // console.log(x, y);
            const [width, height] = [
              (label.end[0] - label.start[0]) * imageContainerSize.width,
              (label.end[1] - label.start[1]) * imageContainerSize.height,
            ];

            return (
              <LabelBox
                key={label.id}
                isSelected={focuusedLabel === label.id}
                onRequestSelect={() => {
                  setFocusedLabel(label.id);
                }}
                label={label}
                containerDimensions={imageContainerSize}
              />
            );
          })}
        </Layer>
      </Stage>
    </>
  );
}
