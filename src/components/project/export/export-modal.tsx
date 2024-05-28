import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "../../ui/dialog";
import { SelectExportType } from "./select-export-type";
import { ExportPreview } from "./export-preview";

export function ExportModal({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState(0);
  const nextPage = () => setPage(page + 1);
  const prevPage = () => setPage(page - 1);
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-full max-w-xl md:max-w-2xl lg:max-w-3xl">
        {page === 0 && <SelectExportType nextPage={nextPage} />}
        {page === 1 && <ExportPreview prevPage={prevPage} />}
      </DialogContent>
    </Dialog>
  );
}
