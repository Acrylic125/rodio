import { type Rect as RectType } from "konva/lib/shapes/Rect";
import { Pos, labelAnchorSize, labelBoxAnchors } from "./label-anchors";
import { clamp } from "@/lib/utils";
import { KonvaEventObject } from "konva/lib/Node";
import { useCallback, useRef, useState } from "react";
import { ResizableRect } from "./resizable-rect";
import { Rect, Group } from "react-konva";
import { LabelId } from "@/lib/rodio-project";

export function LabelBox({
  isSelected,
  id,
  onRequestSelect,
  onResize,
  onRequestCursorChange,
  containerDimensions,
  color,
  defaultStartPos,
  defaultEndPos,
}: {
  isSelected: boolean;
  id: LabelId;
  onRequestSelect?: (id: LabelId) => void;
  onResize?: (id: LabelId, start: Pos, end: Pos) => void;
  onRequestCursorChange?: (
    cursor: (typeof labelBoxAnchors)[number]["cursor"] | "move" | null
  ) => void;
  containerDimensions: { width: number; height: number };
  color: string;
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
        onAnchorMouseEnter={(_, anchor) => {
          onRequestCursorChange?.(anchor.cursor);
        }}
        onAnchorMouseLeave={() => {
          onRequestCursorChange?.(null);
        }}
        onAnchorDragStart={(_, anchor) => {
          initialResizePositions.current = {
            startPos,
            endPos,
          };
          onRequestCursorChange?.(anchor.cursor);
        }}
        onAnchorDragEnd={() => {
          initialResizePositions.current = undefined;
          setResizeRotation([1, 1]);
          onRequestCursorChange?.(null);
          onResize?.(id, startPos, endPos);
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
          fill={`${color}4f`}
          stroke={color}
          strokeWidth={4}
          draggable
          ref={ref}
          onMouseEnter={() => {
            onRequestCursorChange?.("move");
          }}
          onMouseLeave={() => {
            onRequestCursorChange?.(null);
          }}
          onDragStart={() => {
            onRequestCursorChange?.("move");
          }}
          onDragEnd={(e) => {
            handleDrag(e, true);
            onRequestCursorChange?.(null);
          }}
          onDragMove={(e) => handleDrag(e, false)}
        />
      </ResizableRect>
    </Group>
  );
}
