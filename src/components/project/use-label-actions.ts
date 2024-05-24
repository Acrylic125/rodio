import { KonvaEventObject } from "konva/lib/Node";
import { useCallback, useState } from "react";
import { Pos } from "./label-anchors";
import { useKeyPress } from "@/lib/use-keypress";
import { LabelId } from "@/lib/rodio-project";
import { nanoid } from "nanoid";
import { useSaveLabels } from "./use-save-labels";
import { useCurrent } from "./use-current";

export function useLabelActions({
  imageContainerSize,
  saveLabels,
  currentProjectFileStore,
  currentProjectStore,
}: {
  imageContainerSize: { width: number; height: number };
  saveLabels: ReturnType<typeof useSaveLabels>["saveLabels"];
} & ReturnType<typeof useCurrent>) {
  const [focuusedLabel, setFocusedLabel] = useState<LabelId | null>(null);
  const [newLabel, setNewLabel] = useState<{
    pos1: Pos;
    pos2: Pos;
  } | null>(null);
  const onStageMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setFocusedLabel(null);
        const pos = {
          x: e.evt.offsetX,
          y: e.evt.offsetY,
        };
        const relPos = {
          x:
            imageContainerSize.width > 0 ? pos.x / imageContainerSize.width : 0,
          y:
            imageContainerSize.height > 0
              ? pos.y / imageContainerSize.height
              : 0,
        };
        setNewLabel({
          pos1: {
            ...relPos,
          },
          pos2: {
            ...relPos,
          },
        });
      }
    },
    [setFocusedLabel, setNewLabel, imageContainerSize]
  );
  const onStageMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      setNewLabel((prev) => {
        if (prev === null) return prev;
        const pos = {
          x: e.evt.offsetX,
          y: e.evt.offsetY,
        };
        return {
          ...prev,
          pos2: {
            x:
              imageContainerSize.width > 0
                ? pos.x / imageContainerSize.width
                : 0,
            y:
              imageContainerSize.height > 0
                ? pos.y / imageContainerSize.height
                : 0,
          },
        };
      });
    },
    [imageContainerSize, setNewLabel]
  );
  const onStageMouseUp = useCallback(() => {
    if (newLabel !== null) {
      const id = nanoid(16);
      const start = {
        x: Math.min(newLabel.pos1.x, newLabel.pos2.x),
        y: Math.min(newLabel.pos1.y, newLabel.pos2.y),
      };
      const end = {
        x: Math.max(newLabel.pos1.x, newLabel.pos2.x),
        y: Math.max(newLabel.pos1.y, newLabel.pos2.y),
      };

      const prev = currentProjectFileStore.labels;
      if (currentProjectStore.selectedClass !== null) {
        const newLabels = new Map(prev);
        newLabels.set(id, {
          id,
          class: currentProjectStore.selectedClass,
          start,
          end,
        });
        currentProjectFileStore.setLabels(newLabels);
        saveLabels(Array.from(newLabels.values()), () => {
          currentProjectFileStore.setLabels(prev);
        });
      }

      setFocusedLabel(id);
      setNewLabel(null);
    }
  }, [
    currentProjectFileStore.labels,
    currentProjectStore.selectedClass,
    newLabel,
    setFocusedLabel,
    setNewLabel,
    currentProjectFileStore.setLabels,
    saveLabels,
  ]);
  useKeyPress(() => setFocusedLabel(null), ["Escape"]);
  useKeyPress(() => {
    const _focuusedLabel = focuusedLabel;
    if (_focuusedLabel === null) return;
    setFocusedLabel(null);
    const prev = currentProjectFileStore.labels;
    if (prev.get(_focuusedLabel) !== undefined) {
      const newLabels = new Map(prev);
      newLabels.delete(_focuusedLabel);
      currentProjectFileStore.setLabels(newLabels);
      saveLabels(Array.from(newLabels.values()), () => {
        currentProjectFileStore.setLabels(prev);
      });
    }
  }, ["Backspace"]);
  const onResize = useCallback(
    (id: LabelId, start: Pos, end: Pos) => {
      const prev = currentProjectFileStore.labels;
      const label = prev.get(id);
      if (label) {
        const newLabels = new Map(prev);
        newLabels.set(id, {
          id: label.id,
          class: label.class,
          start,
          end,
        });
        currentProjectFileStore.setLabels(newLabels);
        saveLabels(Array.from(newLabels.values()), () => {
          currentProjectFileStore.setLabels(prev);
        });
      }
    },
    [
      currentProjectFileStore.labels,
      currentProjectFileStore.setLabels,
      saveLabels,
    ]
  );

  return {
    setFocusedLabel,
    focuusedLabel,
    onStageMouseDown,
    onStageMouseMove,
    onStageMouseUp,
    onResize,
    newLabel,
  };
}