export type Pos = { x: number; y: number };
export const labelAnchorSize = 12;
export const borderSelectedWidth = 2;
/**
 * [-1, -1] [0, -1] [1, -1]
 * [-1, 0]         [1, 0]
 * [-1, 1] [0, 1] [1, 1]
 */
export const labelBoxAnchors = [
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
