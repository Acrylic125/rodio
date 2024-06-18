import { KonvaEventObject } from "konva/lib/Node";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { Pos } from "./label-anchors";
import { LabelId } from "@/lib/rodio-project";
import { nanoid } from "nanoid";
import { useSaveLabels } from "./use-save-labels";
import { useCurrent } from "./use-current";
import { useCurrentProjectFileStore } from "@/stores/current-project-file-store";
import { useHotkeys } from "react-hotkeys-hook";
import { Stage } from "konva/lib/Stage";
import { clamp } from "@/lib/utils";

export function useLabelActions({
  imageContainerSize,
  saveLabels,
  currentProjectFileStore,
  currentProjectStore,
  ref,
  enableNewLabel,
}: {
  imageContainerSize: { width: number; height: number };
  saveLabels: ReturnType<typeof useSaveLabels>["saveLabels"];
  ref: RefObject<Stage>;
  enableNewLabel?: boolean;
} & ReturnType<typeof useCurrent>) {
  // const [focuusedLabel, setFocusedLabel] = useState<LabelId | null>(null);
  const focuusedLabel = currentProjectFileStore.focusedLabel;
  const setFocusedLabel = currentProjectFileStore.setFocusedLabel;
  const [newLabel, _setNewLabel] = useState<{
    pos1: Pos;
    pos2: Pos;
  } | null>(null);
  const newLabelRef = useRef<typeof newLabel>(newLabel);
  const setNewLabel: typeof _setNewLabel = useCallback(
    (state) => {
      if (typeof state === "function") {
        _setNewLabel((prev) => {
          if (prev === null) return prev;
          const s = state(prev);
          newLabelRef.current = s;
          return s;
        });
        return;
      }
      newLabelRef.current = state;
      _setNewLabel(state);
    },
    [_setNewLabel]
  );
  const onStageMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!enableNewLabel) return;
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
    [setFocusedLabel, setNewLabel, imageContainerSize, enableNewLabel]
  );
  useEffect(() => {
    if (newLabel === null) {
      return;
    }
    const stage = ref.current;
    if (stage === null) {
      return;
    }
    const mouseMove = (e: MouseEvent) => {
      const refPos = stage.content.getBoundingClientRect();
      if (refPos === null) {
        return;
      }
      setNewLabel((prev) => {
        if (prev === null) return prev;
        const pos = {
          x: e.clientX - refPos.left,
          y: e.clientY - refPos.top,
        };
        return {
          ...prev,
          pos2: {
            x:
              imageContainerSize.width > 0
                ? clamp(pos.x / imageContainerSize.width, 0, 1)
                : 0,
            y:
              imageContainerSize.height > 0
                ? clamp(pos.y / imageContainerSize.height, 0, 1)
                : 0,
          },
        };
      });
    };

    const mouseUp = () => {
      if (enableNewLabel) {
        const id = nanoid(16);
        const newLabel = newLabelRef.current;
        if (newLabel === null) return;
        const start = {
          x: Math.min(newLabel.pos1.x, newLabel.pos2.x),
          y: Math.min(newLabel.pos1.y, newLabel.pos2.y),
        };
        const end = {
          x: Math.max(newLabel.pos1.x, newLabel.pos2.x),
          y: Math.max(newLabel.pos1.y, newLabel.pos2.y),
        };

        const selectedClass = currentProjectStore.selectedClass;
        if (selectedClass !== null) {
          const projectPath = currentProjectFileStore.projectPath;
          currentProjectFileStore.setLabels((prev) => {
            const newLabels = new Map(prev);
            newLabels.set(id, {
              id,
              class: selectedClass,
              start,
              end,
            });
            saveLabels(Array.from(newLabels.values()));
            if (
              projectPath !== useCurrentProjectFileStore.getState().filePath
            ) {
              return prev;
            }
            return newLabels;
          });
        }

        setFocusedLabel(id);
      }
      setNewLabel(null);
    };

    document.addEventListener("mousemove", mouseMove);
    document.addEventListener("mouseup", mouseUp);

    return () => {
      document.removeEventListener("mousemove", mouseMove);
      document.removeEventListener("mouseup", mouseUp);
    };
  }, [
    enableNewLabel,
    newLabel !== null,
    ref.current,
    imageContainerSize,
    currentProjectStore.selectedClass,
    currentProjectFileStore.projectPath,
    currentProjectFileStore.setLabels,
    setNewLabel,
    setFocusedLabel,
    saveLabels,
  ]);

  const escHotKeyRef = useHotkeys(
    "esc",
    () => {
      setFocusedLabel(null);
    },
    [setFocusedLabel]
  );
  const deleteLabelHotKeyRef = useHotkeys(
    "backspace",
    () => {
      const _focuusedLabel = focuusedLabel;
      if (_focuusedLabel === null) return;
      setFocusedLabel(null);
      currentProjectFileStore.setLabels((prev) => {
        const projectPath = currentProjectFileStore.projectPath;
        if (prev.get(_focuusedLabel) !== undefined) {
          const newLabels = new Map(prev);
          newLabels.delete(_focuusedLabel);
          saveLabels(Array.from(newLabels.values()));
          if (projectPath !== useCurrentProjectFileStore.getState().filePath) {
            return prev;
          }
          return newLabels;
        }
        return prev;
      });
    },
    [
      setFocusedLabel,
      focuusedLabel,
      currentProjectFileStore.setLabels,
      saveLabels,
    ]
  );

  const onResize = useCallback(
    (id: LabelId, start: Pos, end: Pos) => {
      currentProjectFileStore.setLabels((prev) => {
        const label = prev.get(id);
        if (label === undefined) {
          return prev;
        }
        const newLabels = new Map(prev);
        newLabels.set(id, {
          id: label.id,
          class: label.class,
          start,
          end,
        });
        saveLabels(Array.from(newLabels.values()));
        const projectPath = currentProjectFileStore.projectPath;
        if (projectPath !== useCurrentProjectFileStore.getState().filePath) {
          return prev;
        }
        return newLabels;
      });
    },
    [
      currentProjectFileStore.labels,
      currentProjectFileStore.projectPath,
      currentProjectFileStore.setLabels,
      saveLabels,
    ]
  );

  return {
    setFocusedLabel,
    focuusedLabel,
    onStageMouseDown,
    onResize,
    newLabel,
    hotkeyRefs: [escHotKeyRef, deleteLabelHotKeyRef],
  };
}
