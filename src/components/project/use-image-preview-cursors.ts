import { useState } from "react";
import { Pos, getResizeCursorByAnchor, labelBoxAnchors } from "./label-anchors";

type Cursor =
  | (typeof labelBoxAnchors)[number]["cursor"]
  | "crosshair"
  | "move"
  | "default";

export function useImagePreviewCursors({
  mode,
  newLabel,
}: {
  mode: "label" | "view";
  newLabel: { pos1: Pos; pos2: Pos } | null;
}) {
  const [labelSuggestedCursor, setLabelSuggestedCursor] =
    useState<Cursor | null>(null);
  const newLabelCursor = newLabel
    ? getResizeCursorByAnchor(
        newLabel.pos2.x - newLabel.pos1.x,
        newLabel.pos2.y - newLabel.pos1.y
      )
    : null;

  let cursor: Cursor = mode === "label" ? "crosshair" : ("default" as const);
  if (labelSuggestedCursor !== null) {
    cursor = labelSuggestedCursor;
  }
  if (newLabelCursor !== null) {
    cursor = newLabelCursor;
  }

  return {
    cursor,
    labelSuggestedCursor,
    setLabelSuggestedCursor,
  };
}
