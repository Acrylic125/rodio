import { useCallback, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "../../ui/dialog";
import {
  ExportOptions,
  ExportTypes,
  ExportModalSelectExportType,
} from "./select-export-type";
import { ExportPreview } from "./export-preview";

export function ExportModal({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState(0);
  const nextPage = () => setPage(page + 1);
  const prevPage = () => setPage(page - 1);
  const startExport = (images: string[]) => {};

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setPage(0);
      }
    },
    [setPage]
  );
  const [options, setExportOptions] = useState<ExportOptions>({
    type: ExportTypes[0],
    onlyExportLabelled: true,
  });

  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-full max-w-xl md:max-w-2xl lg:max-w-3xl">
        {page === 0 && (
          <ExportModalSelectExportType
            nextPage={nextPage}
            options={options}
            onOptionsChange={setExportOptions}
          />
        )}
        {page === 1 && (
          <ExportPreview
            prevPage={prevPage}
            onRequestExport={startExport}
            options={options}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
