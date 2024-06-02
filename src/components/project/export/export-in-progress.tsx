import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lock } from "@/lib/async";
import { cn, resolveError } from "@/lib/utils";
import { AlertTriangle, Loader2 } from "lucide-react";
import { nanoid } from "nanoid";
import { useRef, useState } from "react";

const ExportConcurrentLimit = 8;

export function useExport() {
  const [images, setImages] = useState<string[]>([]);
  const [errors, setErrors] = useState<
    {
      id: string;
      title: string;
      message: string;
    }[]
  >([]);
  const [isPending, setIsPending] = useState(false);
  const [haltError, setHaltError] = useState<unknown | null>(null);
  const [processCounts, setProcessCounts] = useState({
    processed: 0,
    total: 0,
  });
  const [processResultEntries, setProcessResultEntries] = useState({
    pending: new Set<string>(),
    errors: new Set<string>(),
  });
  const exportId = useRef(0); // Used to cancel previous exports.
  const processLock = useRef(new Lock());
  const saveImage = async (imagePath: string) => {
    setProcessResultEntries((prev) => {
      prev.pending.add(imagePath);
      return {
        ...prev,
      };
    });
    try {
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));
      throw new Error("Fuck");
    } catch (err) {
      setProcessResultEntries((prev) => {
        prev.errors.add(imagePath);
        return {
          ...prev,
        };
      });
      setErrors((prev) => [
        ...prev,
        {
          id: nanoid(12),
          title: imagePath,
          message: resolveError(err),
        },
      ]);
    } finally {
      setProcessResultEntries((prev) => {
        prev.pending.delete(imagePath);
        return {
          ...prev,
        };
      });
      setProcessCounts((prev) => ({
        processed: prev.processed + 1,
        total: prev.total,
      }));
    }
  };
  const mutate = async (images: string[]) => {
    setImages(images);
    setErrors([]);
    setIsPending(true);
    setHaltError(null);
    setProcessResultEntries({
      pending: new Set(),
      errors: new Set(),
    });
    setProcessCounts({
      processed: 0,
      total: images.length,
    });
    const currentExportId = exportId.current + 1;
    exportId.current = currentExportId;

    const totalIterations = Math.ceil(images.length / ExportConcurrentLimit);
    for (let i = 0; i < totalIterations; i++) {
      if (exportId.current !== currentExportId) {
        break;
      }
      await processLock.current.acquire();
      try {
        const start = i * ExportConcurrentLimit;
        const end = Math.min(images.length, start + ExportConcurrentLimit);
        await Promise.allSettled(images.slice(start, end).map(saveImage));
        // if (exportId.current !== currentExportId) {
        //   console.log(
        //     `Cancelled export ${currentExportId} !== ${exportId.current}`
        //   );
        // }
      } finally {
        processLock.current.release();
      }
    }
    setIsPending(false);
  };

  return {
    isPending,
    errors,
    haltError,
    counts: processCounts,
    isComplete: processCounts.processed >= processCounts.total,
    processResultEntries,
    retry: () => {
      mutate(images);
    },
    cancel: () => {
      exportId.current += 1;
      setIsPending(false);
    },
    mutate,
  };
}

export function ExportInPorgress({
  result,
  onRequestConfigureExport,
  onRequestRetry,
  onRequestCancel,
  onRequestComplete,
}: {
  result: ReturnType<typeof useExport>;
  onRequestConfigureExport?: () => void;
  onRequestRetry?: () => void;
  onRequestCancel?: () => void;
  onRequestComplete?: () => void;
}) {
  let processStatus = null;
  let actions = null;

  if (result.isComplete) {
    processStatus = <p className="text-green-500">Export completed!</p>;
    actions = (
      <>
        <Button onMouseDown={onRequestConfigureExport} variant="ghost">
          Configure Export
        </Button>
        <Button onMouseDown={onRequestRetry} variant="secondary">
          Retry
        </Button>
        <Button onMouseDown={onRequestComplete}>Complete</Button>
      </>
    );
  } else if (result.isPending) {
    processStatus = <Loader2 className="animate-spin" />;
    actions = (
      <Button onMouseDown={onRequestCancel} variant="secondary">
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
        <Button onMouseDown={onRequestRetry} variant="secondary">
          Retry
        </Button>
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
        {result.errors.map((error) => {
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
              "bg-primary": !result.isComplete,
              "bg-green-500": result.isComplete,
            })}
            style={{
              width: `${(result.counts.processed / result.counts.total) * 100}%`,
            }}
          />
        </div>
        <div className="flex flex-row gap-2 justify-between">
          <span className="flex flex-row gap-1">
            <p>
              {result.counts.processed} / {result.counts.total} Processed
            </p>
            <p>
              {"("}
              <span className="text-green-500">
                {result.counts.processed -
                  result.processResultEntries.errors.size}{" "}
                Success
              </span>
              {", "}
              <span className="text-yellow-500">
                {result.processResultEntries.pending.size} Processing
              </span>
              {", "}
              <span className="text-red-500">
                {result.processResultEntries.errors.size} Failed
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
