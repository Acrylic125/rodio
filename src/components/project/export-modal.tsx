import { useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";

function ModalFooter({
  nextPage,
  prevPage,
}: {
  nextPage?: () => void;
  prevPage?: () => void;
}) {
  return (
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
  );
}

function SelectExportType({
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

function ExportPreview({
  nextPage,
  prevPage,
}: {
  nextPage?: () => void;
  prevPage?: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Export Preview</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span>Dataset Distribution</span>
          <div className="flex flex-row gap-2 pb-4">
            <label className="w-full flex flex-col gap-2">
              <Input
                className="w-full"
                min={0}
                placeholder="Train Weight"
                type="number"
              />
              <div className="flex flex-row gap-1 items-center">
                <div className="w-4 h-4 rounded-sm bg-yellow-500" />
                <span className="text-gray-500">Train</span>
              </div>
            </label>
            <label className="w-full flex flex-col gap-2">
              <Input
                className="w-full"
                min={0}
                placeholder="Validation Weight"
                type="number"
              />
              <div className="flex flex-row gap-1 items-center">
                <div className="w-4 h-4 rounded-sm bg-green-500" />
                <span className="text-gray-500">Validation</span>
              </div>
            </label>
            <label className="w-full flex flex-col gap-2">
              <Input
                className="w-full"
                min={0}
                placeholder="Test Weight"
                type="number"
              />
              <div className="flex flex-row gap-1 items-center">
                <div className="w-4 h-4 rounded-sm bg-blue-500" />
                <span className="text-gray-500">Test</span>
              </div>
            </label>
            <Button>Apply</Button>
          </div>
          <div className="flex flex-row rounded-sm overflow-hidden">
            <div
              className="h-4 bg-yellow-500 text-xs text-center"
              style={{
                width: "70%",
              }}
            >
              70%
            </div>
            <div
              className="h-4 bg-green-500 text-xs text-center"
              style={{
                width: "20%",
              }}
            >
              20%
            </div>
            <div
              className="h-4 bg-blue-500 text-xs text-center overflow-hidden"
              style={{
                width: "10%",
              }}
            >
              10%
            </div>
          </div>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className="py-4">
          <div className="flex flex-col gap-2">
            <span>Export Type</span>
            <Select>
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

function ExportOptions({
  nextPage,
  prevPage,
}: {
  nextPage?: () => void;
  prevPage?: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Export Options</DialogTitle>
        <DialogDescription>
          View the export preview of the project.
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className="py-4">
          <div className="flex flex-col gap-2">
            <span>Export Type</span>
            <Select>
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
