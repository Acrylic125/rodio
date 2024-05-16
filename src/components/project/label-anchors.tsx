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

function hashAnchor(x: number, y: number) {
  return x + y * (labelBoxAnchors.length * 10);
}

const compiledCursors = new Map<
  number,
  (typeof labelBoxAnchors)[number]["cursor"]
>(
  labelBoxAnchors.map((anchor) => [
    hashAnchor(anchor.at[0], anchor.at[1]),
    anchor.cursor,
  ])
);

const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);

export function getResizeCursorByAnchor(x: number, y: number) {
  const xSign = sign(x);
  const ySign = sign(y);

  return compiledCursors.get(hashAnchor(xSign, ySign)) ?? null;
}
