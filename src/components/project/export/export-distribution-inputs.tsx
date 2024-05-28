import { useCallback, useState } from "react";
import { Input } from "../../ui/input";
import { ExportDistribution } from "./export-types";

export function ExportDistributionInputs({
  numberOfImages,
  onDistributionChange,
}: {
  numberOfImages: ExportDistribution;
  onDistributionChange?: (distribution: ExportDistribution) => void;
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
