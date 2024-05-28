import { DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { ModalFooter } from "./export-modal-footer";

export function SelectExportType({
  nextPage,
  prevPage,
}: {
  nextPage?: () => void;
  prevPage?: () => void;
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
            <Select defaultValue="yolov8">
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
        </div>
      </form>
      <ModalFooter nextPage={nextPage} prevPage={prevPage} />
    </>
  );
}
