import { useMemo, useState } from "react";
import { DialogHeader, DialogTitle } from "../../ui/dialog";
import { useCurrentProjectStore } from "@/stores/current-project-store";
import { ExportDistribution, ExportDistributionType } from "./export-types";
import { DatasetGrid } from "./export-dataset-grid";
import { ModalFooter } from "./export-modal-footer";
import { ExportDistributionInputs } from "./export-distribution-inputs";

export function getNumberOfImagesDistribution(
  distribution: ExportDistribution,
  _numberOfImages: number
): ExportDistribution {
  const entries = Object.entries(distribution).map(([key, value]) => {
    return {
      key: key as keyof typeof distribution,
      value: Math.floor(value * _numberOfImages),
      weight: value,
    };
  });
  // The remainder will always be less than or equal to the number of classes - 1 (2).
  // [0, 2]
  const remainder =
    _numberOfImages - entries.reduce((acc, entry) => acc + entry.value, 0);
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
}

export function ExportPreview({
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
  const currentProjectStore = useCurrentProjectStore(({ images, project }) => {
    return {
      images,
      project,
    };
  });
  const { exportTypeMap, numberOfImages } = useMemo(() => {
    const numberOfImages = getNumberOfImagesDistribution(
      distribution,
      currentProjectStore.images.length
    );
    const images = currentProjectStore.images;
    const numberOfImagesIterator = Object.entries(numberOfImages) as [
      ExportDistributionType,
      number,
    ][];
    let iteratorIndex = numberOfImagesIterator.findIndex(
      ([, count]) => count > 0
    );
    const exportTypeMap: Map<string, ExportDistributionType> = new Map();

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const _item = numberOfImagesIterator[iteratorIndex];
      if (!_item) {
        break;
      }

      const [type, count] = _item;
      if (count === 0) {
        iteratorIndex += 1;
      }
      exportTypeMap.set(image.path, type);
      numberOfImagesIterator[iteratorIndex][1] -= 1;
    }
    return {
      exportTypeMap,
      numberOfImages,
    };
  }, [distribution, currentProjectStore.images]);

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
      {currentProjectStore.project && (
        <DatasetGrid
          images={currentProjectStore.images}
          cacheDir={currentProjectStore.project.getProjectFileFullPath(
            currentProjectStore.project.cache
          )}
          exportTypeMap={exportTypeMap}
        />
      )}

      <ModalFooter nextPage={nextPage} prevPage={prevPage} />
    </>
  );
}
