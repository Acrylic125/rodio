import { useCallback } from "react";
import { Label, RodioProject } from "@/lib/rodio-project";
import { ProcessQueue } from "@/lib/async";
import { useToast } from "../ui/use-toast";
import { ToastAction } from "../ui/toast";
import { useSaveStore } from "@/stores/save-store";
import { resolveError } from "@/lib/utils";
import * as frontendEvents from "@/lib/frontend-events";

export type SaveLabelsEventPayload =
  | {
      type: "success";
      filePath: string;
      projectPath: string;
      labels: Label[];
    }
  | {
      type: "error";
      filePath: string;
      projectPath: string;
      error: unknown;
    };
export const SaveEventManager: frontendEvents.EventManager<SaveLabelsEventPayload> =
  {
    listeners: new Set(),
  };

export function useSaveLabels(filePath: string, project: RodioProject | null) {
  const { toast } = useToast();
  const saveStore = useSaveStore(({ setPendingSavess, pendingSavess }) => {
    return {
      setPendingSavess,
      pendingSavess,
    };
  });
  const doSave = useCallback(async () => {
    if (project === null) return;
    try {
      // Use the most recent state
      const beforeCurrentState = useSaveStore.getState();
      const beforeSave = beforeCurrentState.pendingSavess.get(filePath);
      if (beforeSave === undefined) {
        throw new Error("No state found to save.");
      }
      await project.db.setLabels(filePath, beforeSave.state);
      frontendEvents.dispatch(SaveEventManager, {
        type: "success",
        filePath,
        projectPath: project.projectPath,
        labels: beforeSave.state,
      });

      // Retrieve freshes state
      const afterCurrentState = useSaveStore.getState();
      const afterSave = afterCurrentState.pendingSavess.get(filePath);
      if (afterSave === undefined) {
        console.warn("No state found after saving.");
        return;
      }

      // We only want to invalidate the pending saves if the state saved
      // is the most recent state.
      if (afterSave !== beforeSave) {
        return;
      }

      const newSaves = new Map(afterCurrentState.pendingSavess);
      newSaves.delete(filePath);
      afterCurrentState.setPendingSavess(newSaves);
    } catch (err) {
      console.error(err);
      frontendEvents.dispatch(SaveEventManager, {
        type: "error",
        filePath,
        projectPath: project.projectPath,
        error: err,
      });
      toast({
        title: `Failed to save labels ${filePath}`,
        description: resolveError(err),
        action: (
          <div className="flex flex-row gap-2">
            {/* <ToastAction onMouseDown={onRequestRevert} altText="Try again">
              Revert
            </ToastAction> */}
            <ToastAction onMouseDown={doSave} altText="Try again">
              Try again
            </ToastAction>
          </div>
        ),
      });
      console.error(err);
    }
  }, [filePath, project, toast, useSaveStore]);
  const saveLabels = useCallback(
    async (labels: Label[]) => {
      const prev = saveStore.pendingSavess;
      let pendingSave = prev.get(filePath);
      if (pendingSave === undefined) {
        const processQueue = new ProcessQueue<void>();
        pendingSave = {
          state: labels,
          processQueue,
        };
      }
      const newSaves = new Map(prev);
      newSaves.set(filePath, {
        ...pendingSave,
        state: labels,
      });
      saveStore.setPendingSavess(newSaves);

      return pendingSave.processQueue.do(doSave);
    },
    [filePath, saveStore.pendingSavess, saveStore.setPendingSavess]
  );
  return {
    saveLabels,
  };
}
