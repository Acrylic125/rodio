import { clamp } from "@/lib/utils";

export type Pos = { x: number; y: number };
export const dynDesiredSize = 64;
export const labelAnchorSize = 12;

export function dynLabelAnchorSize(size: number) {
  const dynSizeScaling = clamp(size / dynDesiredSize, 0.25, 1);
  let v = Math.round(labelAnchorSize * dynSizeScaling);
  if (v % 2 === 0) {
    v += 1;
  }
  return v;
}

export const labelBorderWidth = 4;

export function dynLabelborderWidth(size: number) {
  const dynSizeScaling = clamp(size / dynDesiredSize, 0, 1);
  let v = Math.floor(labelBorderWidth * dynSizeScaling);
  return v;
}

export const borderSelectedWidth = 2;

export function dynLabelSelectedBorder(size: number) {
  const dynSizeScaling = clamp(size / dynDesiredSize, 0, 1);
  let v = Math.floor(borderSelectedWidth * dynSizeScaling);
  return v;
}

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
