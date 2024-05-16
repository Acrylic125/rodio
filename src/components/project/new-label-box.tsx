import { Group } from "lucide-react";
import { Pos } from "./label-anchors";
import { ResizableRect } from "./resizable-rect";
import { Rect } from "react-konva";

export function NewLabelBox({
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
