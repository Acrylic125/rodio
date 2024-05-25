import { useCallback, useMemo, useState } from "react";
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
import { useCurrentProjectStore } from "@/stores/current-project-store";

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

function ExportDistributionInputs({
  numberOfImages,
  onDistributionChange,
}: {
  numberOfImages: {
    train: number;
    validation: number;
    test: number;
  };
  onDistributionChange?: (distribution: {
    train: number;
    validation: number;
    test: number;
  }) => void;
}) {
  const [train, setTrain] = useState("70");
  const [validation, setValidation] = useState("30");
  const [test, setTest] = useState("10");
  const distribute = useCallback(
    (_train: string, _validation: string, _test: string) => {
      let train = parseInt(_train);
      let validation = parseInt(_validation);
      let test = parseInt(_test);

      train = isNaN(train) ? 0 : Math.max(train, 0);
      validation = isNaN(validation) ? 0 : Math.max(validation, 0);
      test = isNaN(test) ? 0 : Math.max(test, 0);

      let total = train + validation + test;
      if (total <= 0) {
        train = 1;
        validation = 1;
        test = 1;

        total = 3;
      }
      train = train / total;
      validation = validation / total;
      test = test / total;
      onDistributionChange?.({
        train,
        validation,
        test,
      });
    },
    [onDistributionChange]
  );

  return (
    <div className="flex flex-row gap-2 pb-4">
      <label className="w-full flex flex-col gap-2">
        <Input
          className="w-full"
          min={0}
          value={train}
          onChange={(e) => {
            setTrain(e.target.value);
            distribute(e.target.value, validation, test);
          }}
          placeholder="Train"
          type="number"
        />
        <div className="flex flex-row gap-2 items-center">
          <div className="w-4 h-4 rounded-sm bg-yellow-500" />
          <span className="text-gray-500">{numberOfImages.train} Train</span>
        </div>
      </label>
      <label className="w-full flex flex-col gap-2">
        <Input
          className="w-full"
          min={0}
          value={validation}
          onChange={(e) => {
            setValidation(e.target.value);
            distribute(train, e.target.value, test);
          }}
          placeholder="Validation"
          type="number"
        />
        <div className="flex flex-row gap-2 items-center">
          <div className="w-4 h-4 rounded-sm bg-green-500" />
          <span className="text-gray-500">
            {numberOfImages.validation} Validation
          </span>
        </div>
      </label>
      <label className="w-full flex flex-col gap-2">
        <Input
          className="w-full"
          min={0}
          value={test}
          onChange={(e) => {
            setTest(e.target.value);
            distribute(train, validation, e.target.value);
          }}
          placeholder="Test"
          type="number"
        />
        <div className="flex flex-row gap-2 items-center">
          <div className="w-4 h-4 rounded-sm bg-blue-500" />
          <span className="text-gray-500">{numberOfImages.test} Test</span>
        </div>
      </label>
    </div>
  );
}

function ExportPreview({
  nextPage,
  prevPage,
}: {
  nextPage?: () => void;
  prevPage?: () => void;
}) {
  const [distribution, setDistribution] = useState({
    train: 0.7,
    validation: 0.2,
    test: 0.1,
  });
  const currentProjectStore = useCurrentProjectStore(({ images }) => {
    return {
      images,
    };
  });
  const numberOfImages = useMemo(() => {
    const entries = Object.entries(distribution).map(([key, value]) => {
      return {
        key: key as keyof typeof distribution,
        value: Math.floor(value * currentProjectStore.images.length),
        weight: value,
      };
    });
    // The remainder will always be less than or equal to the number of classes - 1 (2).
    // [0, 2]
    const remainder =
      currentProjectStore.images.length -
      entries.reduce((acc, entry) => acc + entry.value, 0);
    const hiToLoEntries = entries.sort((a, b) => b.weight - a.weight);
    for (let r = 0; r < remainder; r++) {
      // Safety: Use modulo to prevent out of bounds in case logic fails.
      hiToLoEntries[r % hiToLoEntries.length].value += 1;
    }

    const numberOfImages = entries.reduce(
      (acc, entry) => {
        acc[entry.key] = entry.value;
        return acc;
      },
      {
        train: 0,
        validation: 0,
        test: 0,
      }
    );

    return numberOfImages;
  }, [distribution, currentProjectStore.images.length]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Export Preview</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span>
            Dataset Distribution {"("}
            {currentProjectStore.images.length} items{")"}
          </span>
          <ExportDistributionInputs
            numberOfImages={numberOfImages}
            onDistributionChange={setDistribution}
          />

          <div className="flex flex-row rounded-sm overflow-hidden">
            <div
              className="h-4 bg-yellow-500 text-xs text-center"
              style={{
                width: `${distribution.train * 100}%`,
              }}
            >
              {(distribution.train * 100).toFixed(1)}%
            </div>
            <div
              className="h-4 bg-green-500 text-xs text-center"
              style={{
                width: `${distribution.validation * 100}%`,
              }}
            >
              {(distribution.validation * 100).toFixed(1)}%
            </div>
            <div
              className="h-4 bg-blue-500 text-xs text-center overflow-hidden"
              style={{
                width: `${distribution.test * 100}%`,
              }}
            >
              {(distribution.test * 100).toFixed(1)}%
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
