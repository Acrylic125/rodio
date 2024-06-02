import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AlertTriangle, Loader2 } from "lucide-react";
import useExportStore from "./export-store";

export function ExportInPorgress({
  onRequestConfigureExport,
  onRequestComplete,
}: {
  onRequestConfigureExport?: () => void;
  onRequestComplete?: () => void;
}) {
  const result = useExportStore(
    ({ currentSession, cancel, retry, continue: _continue }) => {
      return {
        currentSession,
        cancel,
        retry,
        continue: _continue,
      };
    }
  );
  let processStatus = null;
  let actions = null;

  if (result.currentSession?.status === "complete") {
    processStatus = <p className="text-green-500">Export completed!</p>;
    actions = (
      <>
        <Button onMouseDown={onRequestConfigureExport} variant="ghost">
          Configure Export
        </Button>
        <Button onMouseDown={result.retry} variant="secondary">
          Retry
        </Button>
        <Button onMouseDown={onRequestComplete}>Complete</Button>
      </>
    );
  } else if (result.currentSession?.status === "pending") {
    processStatus = <Loader2 className="animate-spin" />;
    actions = (
      <Button onMouseDown={result.cancel} variant="secondary">
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
        <Button onMouseDown={result.retry} variant="secondary">
          Retry
        </Button>
        <Button onMouseDown={result.continue}>Continue</Button>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Export In Progress</DialogTitle>
        <DialogDescription>This project is being exported.</DialogDescription>
      </DialogHeader>
      <ul className="flex flex-col w-full h-48 overflow-auto gap-2 py-4">
        {result.currentSession?.errors.map((error) => {
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
      <div className="flex flex-col gap-2 py-4">
        <div className="relative w-full bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 h-4 rounded-sm">
          <div
            className={cn("absolute top-0 left-0 h-full rounded-sm", {
              "bg-primary": !(result.currentSession?.status === "complete"),
              "bg-green-500": result.currentSession?.status === "complete",
            })}
            style={{
              width: `${result.currentSession ? (result.currentSession.processedImages.size / result.currentSession.images.length) * 100 : 0}%`,
            }}
          />
        </div>
        <div className="flex flex-row gap-2 justify-between">
          <span className="flex flex-row gap-1">
            <p>
              {result.currentSession?.processedImages.size ?? 0} /{" "}
              {result.currentSession?.images.length ?? 0} Processed
            </p>
            <p>
              {"("}
              <span className="text-green-500">
                {result.currentSession
                  ? result.currentSession.processedImages.size -
                    result.currentSession.erroredImages.size
                  : 0}{" "}
                Success
              </span>
              {", "}
              <span className="text-yellow-500">
                {result.currentSession?.processingImages.size ?? 0} Processing
              </span>
              {", "}
              <span className="text-red-500">
                {result.currentSession?.erroredImages.size ?? 0} Failed
              </span>
              {")"}
            </p>
          </span>
          <span>{processStatus}</span>
        </div>
      </div>
      <DialogFooter>{actions}</DialogFooter>
    </>
  );
}
