import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Button } from "@/components/ui/button";

export const ExportTypes = ["yolov8"] as const;
export type ExportType = (typeof ExportTypes)[number];

export type ExportOptions = {
  type: ExportType;
  onlyExportLabelled: boolean;
  deleteOldExport: boolean;
};

export function ExportModalSelectExportType({
  nextPage,
  prevPage,
  options,
  onOptionsChange,
}: {
  nextPage?: () => void;
  prevPage?: () => void;
  options: ExportOptions;
  onOptionsChange: (options: ExportOptions) => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Export</DialogTitle>
        <DialogDescription>
          Select how you want to export this project.
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <span>Export Type</span>
            <Select
              value={options.type}
              onValueChange={(value) => {
                if (ExportTypes.includes(value as ExportType)) {
                  onOptionsChange({
                    ...options,
                    type: value as ExportType,
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an export type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Yolo Models</SelectLabel>
                  <SelectItem value="yolov8">YoloV8</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <label className="w-fit flex flex-row gap-2 items-center">
            <Checkbox
              checked={options.onlyExportLabelled}
              onCheckedChange={(checked) => {
                onOptionsChange({
                  ...options,
                  onlyExportLabelled: !!checked.valueOf(),
                });
              }}
            />
            <span>Only export labelled</span>
          </label>
          <label className="w-fit flex flex-row gap-2 items-center">
            <Checkbox
              checked={options.deleteOldExport}
              onCheckedChange={(checked) => {
                onOptionsChange({
                  ...options,
                  deleteOldExport: !!checked.valueOf(),
                });
              }}
            />
            <span>Delete old exports</span>
          </label>
        </div>
      </form>
      <DialogFooter>
        <Button
          variant="secondary"
          disabled={!prevPage}
          onMouseDown={prevPage}
          type="button"
        >
          Back
        </Button>
        <Button disabled={!nextPage} onMouseDown={nextPage} type="button">
          Next
        </Button>
      </DialogFooter>
    </>
  );
}
