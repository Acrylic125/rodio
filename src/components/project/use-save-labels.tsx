import { useCallback, useMemo } from "react";
import { Label, RodioProject } from "@/lib/rodio-project";
import { ProcessQueue } from "@/lib/async";
import { useToast } from "../ui/use-toast";
import { ToastAction } from "../ui/toast";

export function useSaveLabels(
  projectPath: string,
  project: RodioProject | null
) {
  const { toast } = useToast();
  const processQueue = useMemo(() => {
    return new ProcessQueue<void>();
  }, []);
  const saveLabels = useCallback(
    async (labels: Label[], requestRevert: () => void) => {
      async function doSave() {
        if (project === null) return;
        try {
          await project.db.setLabels(projectPath, labels);
        } catch (err) {
          toast({
            title: "Failed to save",
            action: (
              <div className="flex flex-row gap-2">
                <ToastAction onMouseDown={requestRevert} altText="Revert">
                  Revert
                </ToastAction>
                <ToastAction onMouseDown={doSave} altText="Try again">
                  Try again
                </ToastAction>
              </div>
            ),
          });
          console.error(err);
        }
      }
      return processQueue.do(doSave);
    },
    [projectPath, project, processQueue.do, toast]
  );
  return {
    processQueue,
    saveLabels,
  };
}
