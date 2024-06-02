import { useMemo, useState } from "react";
import { DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";
import { useCurrentProjectStore } from "@/stores/current-project-store";
import { ExportDistribution, ExportDistributionType } from "./export-types";
import { DatasetGrid } from "./export-dataset-grid";
import { ExportDistributionInputs } from "./export-distribution-inputs";
import { useExportImages } from "./use-export-images";
import { ExportOptions } from "./select-export-type";
import { Button } from "@/components/ui/button";

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
  onRequestExport,
  prevPage,
  options,
}: {
  onRequestExport: (
    images: string[],
    exportTypeMap: Map<string, ExportDistributionType>
  ) => void;
  prevPage: () => void;
  options: ExportOptions;
}) {
  const [distribution, setDistribution] = useState({
    train: 0.7,
    validation: 0.2,
    test: 0.1,
  });
  const currentProjectStore = useCurrentProjectStore(({ project }) => {
    return {
      project,
    };
  });
  const exportImagesQuery = useExportImages(options);
  const images = exportImagesQuery.data;
  const { exportTypeMap, numberOfImages } = useMemo(() => {
    if (!images) {
      return {
        exportTypeMap: new Map<string, ExportDistributionType>(),
        numberOfImages: {
          train: 0,
          validation: 0,
          test: 0,
        },
      };
    }
    const numberOfImages = getNumberOfImagesDistribution(
      distribution,
      images.length
    );
    const numberOfImagesIterator = Object.entries(numberOfImages) as [
      ExportDistributionType,
      number,
    ][];
    const exportTypeMap: Map<string, ExportDistributionType> = new Map();

    let imagePtr = 0;
    for (const [type, count] of numberOfImagesIterator) {
      for (let j = 0; j < count; j++) {
        exportTypeMap.set(images[imagePtr], type);
        imagePtr += 1;
      }
    }

    return {
      exportTypeMap,
      numberOfImages,
    };
  }, [distribution, images]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Export Preview</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span>
            Dataset Distribution {"("}
            {images?.length ?? 0} items{")"}
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
          images={images ?? []}
          cacheDir={currentProjectStore.project.getProjectFileFullPath(
            currentProjectStore.project.cache
          )}
          exportTypeMap={exportTypeMap}
        />
      )}

      <DialogFooter>
        <Button variant="secondary" onMouseDown={prevPage} type="button">
          Back
        </Button>
        <Button
          disabled={exportImagesQuery.isLoading || exportImagesQuery.isError}
          onMouseDown={() => {
            onRequestExport(images ?? [], exportTypeMap);
          }}
          type="button"
        >
          Start Export
        </Button>
      </DialogFooter>
    </>
  );
}
