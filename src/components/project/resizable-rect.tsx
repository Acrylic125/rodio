import { KonvaEventObject } from "konva/lib/Node";
import {
  labelBoxAnchors,
  dynLabelAnchorSize,
  dynLabelSelectedBorder,
} from "./label-anchors";
import { Rect } from "react-konva";

export function ResizableRect({
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
  const borderSelectedWidth = dynLabelSelectedBorder(Math.min(width, height));
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
          const size = Math.min(width, height);
          let labelAnchorSize = dynLabelAnchorSize(size);

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
              }}
              onMouseLeave={(e) => {
                onAnchorMouseLeave?.(e, anchor);
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
