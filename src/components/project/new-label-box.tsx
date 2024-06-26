import { Pos, dynLabelborderWidth } from "./label-anchors";
import { ResizableRect } from "./resizable-rect";
import { Rect, Group } from "react-konva";

export function NewLabelBox({
  pos1,
  pos2,
  color,
  containerDimensions,
}: {
  pos1: Pos;
  pos2: Pos;
  color: string;
  containerDimensions: { width: number; height: number };
}) {
  const x = Math.min(pos1.x, pos2.x) * containerDimensions.width;
  const y = Math.min(pos1.y, pos2.y) * containerDimensions.height;
  const width = Math.abs(pos2.x - pos1.x) * containerDimensions.width;
  const height = Math.abs(pos2.y - pos1.y) * containerDimensions.height;
  const size = Math.min(width, height);

  return (
    <Group>
      <ResizableRect x={x} y={y} width={width} height={height} isSelected>
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={`${color}4f`}
          stroke={color}
          strokeWidth={dynLabelborderWidth(size)}
        />
      </ResizableRect>
    </Group>
  );
}
