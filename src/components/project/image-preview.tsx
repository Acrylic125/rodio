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
  const handleTransform = (triggerOnResize: boolean) => {
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
    if (triggerOnResize) {
      onResize(id, start, {
        x: start.x + width,
        y: start.y + height,
      });
    }
  };

  return (
    <Group onTap={_onRequestSelect} onMouseDown={_onRequestSelect}>
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
        onDragEnd={(e) => handleDrag(e, true)}
        onDragMove={(e) => handleDrag(e, false)}
        onTransformEnd={() => handleTransform(false)}
        onTransform={() => handleTransform(false)}
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
        alt="test"
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
