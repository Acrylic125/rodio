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
    <Group onTap={onRequestSelect} onMouseDown={onRequestSelect}>
      {/* <Rect /> */}
      <Rect
        x={startPos.x * containerDimensions.width}
        y={startPos.y * containerDimensions.height}
        width={Math.abs(endPos.x - startPos.x) * containerDimensions.width}
        height={Math.abs(endPos.y - startPos.y) * containerDimensions.height}
        fill="#ff00004f"
        stroke="#ff0000"
        strokeWidth={4}
        draggable
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
          // console.log(`${node.width()}, ${node.height()}`);
          const width = Math.max(node.width() * scaleX, 1);
          const height = Math.max(node.height() * scaleY, 1);

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
          // anchorDragBoundFunc={(oldPos, newPos) => {
          //   console.log(newPos);
          //   return {
          //     x: Math.max(Math.min(newPos.x, containerDimensions.width), 0),
          //     // y: 0,
          //     y: Math.max(Math.min(newPos.y, containerDimensions.height), 0),
          //   };
          // }}
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
      console.log(`PadX ${padX} ${size.width} ${size.height}`);
    }
    // Otherwise,
    // (wH - Wh) / 2w = y
    else {
      const padY =
        (target.naturalWidth * size.height -
          size.width * target.naturalHeight) /
        (2 * target.naturalWidth);
      size.height = size.width + padY * 2;
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

  return (
    <>
      <img
        src={convertFileSrc(currentPath)}
        loading="lazy"
        alt="test"
        // className="w-full h-full object-fill"
        className="w-full h-full object-contain"
        ref={imageRef}
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
