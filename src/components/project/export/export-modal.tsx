import { useCallback, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "../../ui/dialog";
import {
  ExportOptions,
  ExportTypes,
  ExportModalSelectExportType,
} from "./select-export-type";
import { ExportPreview } from "./export-preview";
import { ExportInPorgress } from "./export-in-progress";
import useExportStore from "./export-store";

const ExportInProgressPageId = 2;

export function ExportModal({ children }: { children: React.ReactNode }) {
  const exportStore = useExportStore(({ isPending, mutate }) => {
    return {
      isPending,
      mutate,
    };
  });
  const [page, setPage] = useState(
    exportStore.isPending ? ExportInProgressPageId : 0
  );
  const nextPage = () => setPage(page + 1);
  const prevPage = () => setPage(page - 1);
  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setPage((prev) => {
          if (prev !== ExportInProgressPageId) {
            return 0;
          }
          return prev;
        });
      }
    },
    [setPage]
  );
  const [options, setExportOptions] = useState<ExportOptions>({
    type: ExportTypes[0],
    onlyExportLabelled: true,
    deleteOldExport: false,
  });

  let content = null;
  if (page === 0) {
    content = (
      <ExportModalSelectExportType
        nextPage={nextPage}
        options={options}
        onOptionsChange={setExportOptions}
      />
    );
  } else if (page === 1) {
    content = (
      <ExportPreview
        prevPage={prevPage}
        onRequestExport={(images: string[]) => {
          exportStore.mutate(images);
          setPage(ExportInProgressPageId);
        }}
        options={options}
      />
    );
  } else if (page === ExportInProgressPageId) {
    content = (
      <ExportInPorgress
        onRequestConfigureExport={() => {
          setPage(1);
        }}
      />
    );
  }

  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-full max-w-xl md:max-w-2xl lg:max-w-3xl">
        {content}
      </DialogContent>
    </Dialog>
  );
}
