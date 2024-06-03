import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, resolveError } from "@/lib/utils";
import { AlertTriangle, Loader2 } from "lucide-react";
import useExportStore from "./export-store";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { openInFileManager } from "@/commands/open-in-fm";

export function ExportProgress({
  onRequestConfigureExport,
  onRequestComplete,
}: {
  onRequestConfigureExport?: () => void;
  onRequestComplete?: () => void;
}) {
  const exportStore = useExportStore(
    ({ currentSession, cancel, retry, continue: _continue }) => {
      return {
        currentSession,
        cancel,
        retry,
        continue: _continue,
      };
    }
  );
  const currentSession = exportStore.currentSession;
  let processStatus = null;
  let actions = null;

  if (currentSession?.status === "complete") {
    processStatus = <p className="text-green-500">Export completed!</p>;
    actions = (
      <>
        <Button onMouseDown={onRequestConfigureExport} variant="ghost">
          Configure Export
        </Button>
        <Button onMouseDown={exportStore.retry} variant="secondary">
          Retry
        </Button>
        <Button onMouseDown={onRequestComplete}>Complete</Button>
      </>
    );
  } else if (currentSession?.status === "pending") {
    processStatus = <Loader2 className="animate-spin" />;
    actions = (
      <Button onMouseDown={exportStore.cancel} variant="secondary">
        Cancel
      </Button>
    );
  } else {
    processStatus = <p className="text-red-500">Export cancelled</p>;
    actions = (
      <>
        <Button onMouseDown={onRequestConfigureExport} variant="ghost">
          Configure Export
        </Button>
        <Button onMouseDown={exportStore.retry} variant="secondary">
          Retry
        </Button>
        <Button onMouseDown={exportStore.continue}>Continue</Button>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Export Progress</DialogTitle>
        <DialogDescription>This project is being exported.</DialogDescription>
      </DialogHeader>
      {currentSession && currentSession.errors.length > 0 ? (
        <ul className="flex flex-col w-full h-48 overflow-auto gap-2 py-4">
          {currentSession.errors.map((error) => {
            return (
              <li
                key={error.id}
                className="flex flex-row gap-2 border p-4 border-gray-300 dark:border-gray-700"
              >
                <div className="text-red-500">
                  <AlertTriangle />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-red-500 text-base">{error.title}</span>
                  <span className="text-gray-700 dark:text-gray-300 text-sm">
                    {error.message}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-48 gap-2 py-4">
          <h3>No errors found</h3>
        </div>
      )}

      <div className="flex flex-col gap-2 py-4">
        <div className="relative w-full bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 h-4 rounded-sm">
          <div
            className={cn("absolute top-0 left-0 h-full rounded-sm", {
              "bg-primary": !(currentSession?.status === "complete"),
              "bg-green-500": currentSession?.status === "complete",
            })}
            style={{
              width: `${currentSession ? (currentSession.processedImages.size / currentSession.data.images.length) * 100 : 0}%`,
            }}
          />
        </div>
        <div className="flex flex-row gap-2 justify-between">
          <span className="flex flex-row gap-1">
            <p>
              {currentSession?.processedImages.size ?? 0} /{" "}
              {currentSession?.data.images.length ?? 0} Processed
            </p>
            <p>
              {"("}
              <span className="text-green-500">
                {currentSession
                  ? currentSession.processedImages.size -
                    currentSession.erroredImages.size
                  : 0}{" "}
                Success
              </span>
              {", "}
              <span className="text-yellow-500">
                {currentSession?.processingImages.size ?? 0} Processing
              </span>
              {", "}
              <span className="text-red-500">
                {currentSession?.erroredImages.size ?? 0} Failed
              </span>
              {")"}
            </p>
          </span>
          <span>{processStatus}</span>
        </div>
      </div>
      {currentSession?.haltError && (
        <Alert className="mb-4" variant="error">
          <AlertDescription>
            {resolveError(currentSession.haltError)}
          </AlertDescription>
        </Alert>
      )}
      {currentSession?.status === "complete" && (
        <Alert className="flex flex-col gap-1">
          <AlertTitle>Export Complete!</AlertTitle>
          <AlertDescription className="text-gray-700 dark:text-gray-300">
            Exported files are located at{" "}
            <a
              className="text-foreground font-medium focus:underline hover:underline"
              onClick={() => {
                openInFileManager(currentSession.exportDir);
              }}
              tabIndex={0}
            >
              {currentSession.exportDir}
            </a>
          </AlertDescription>
        </Alert>
      )}
      <DialogFooter>{actions}</DialogFooter>
    </>
  );
}
