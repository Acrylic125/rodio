import { useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useBreakpoint } from "@/lib/use-breakpoint";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { cn, resolveError } from "@/lib/utils";
import { useOptimisedImage } from "../../image/use-optimised-image";
import { ExportDistributionType } from "./export-types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentProjectStore } from "@/stores/current-project-store";
import * as frontendEvents from "@/lib/frontend-events";
import { SaveEventManager } from "../use-save-labels";
import { useImageContainer } from "../use-image-container";
import { Group, Layer, Rect, Stage } from "react-konva";
import { Loader2 } from "lucide-react";
import { LabelClass, LabelClassId } from "@/lib/rodio-project";
import { useLabelClasses } from "@/lib/use-label-classes";

function DatasetGridItem({
  imagePath,
  cacheDir,
  type,
  classesMap,
}: {
  imagePath: string;
  cacheDir: string;
  type?: ExportDistributionType;
  classesMap: Map<LabelClassId, LabelClass>;
}) {
  const {
    imageRef: ref,
    imageContainerSize,
    updateContainerSize,
  } = useImageContainer();
  const img = useOptimisedImage(ref, imagePath, cacheDir, "dataset-grid");
  const currentProjectStore = useCurrentProjectStore(({ project }) => {
    return {
      project,
    };
  });
  const queryClient = useQueryClient();
  const labelsQuery = useQuery({
    queryKey: ["labels", currentProjectStore.project?.projectPath, imagePath],
    enabled: currentProjectStore.project !== null,
    queryFn: async () => {
      if (currentProjectStore.project === null) {
        return [];
      }
      return currentProjectStore.project.db.getLabels(imagePath);
    },
  });

  useEffect(() => {
    const unsubscribe = frontendEvents.subscribe(
      SaveEventManager,
      ({ payload }) => {
        if (
          payload.type === "success" &&
          payload.filePath === imagePath &&
          currentProjectStore.project !== null &&
          payload.projectPath === currentProjectStore.project.projectPath
        ) {
          queryClient.setQueryData(
            ["labels", currentProjectStore.project.projectPath, imagePath],
            payload.labels
          );
        }
      }
    );
    return unsubscribe;
  }, [currentProjectStore.project?.projectPath, imagePath, queryClient]);

  let overlayElement = null;
  if (img.isError || labelsQuery.isError) {
    overlayElement = (
      <div className="absolute top-0 left-0 bg-black w-full h-full flex flex-col items-center justify-center gap-1 p-4">
        <h2 className="text-red-500 text-sm text-center">
          Error loading image
        </h2>
        <p className="text-sm text-gray-300">
          {resolveError(img.isError ? img.error : labelsQuery.error)}
        </p>
      </div>
    );
  } else if (
    (img.isPending && !img.data) ||
    (labelsQuery.isPending && !labelsQuery.data)
  ) {
    overlayElement = (
      <div className="bg-black absolute top-0 left-0 w-full h-full overflow-hidden flex flex-col items-center justify-center">
        <Loader2 className="text-primary w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 animate-spin" />
      </div>
    );
  } else if (labelsQuery.data) {
    const labels = labelsQuery.data;
    overlayElement = (
      <div className="absolute top-0 left-0 bg-black/50 w-full h-full flex flex-col items-center justify-center">
        <Stage
          className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 absolute"
          width={imageContainerSize.width}
          height={imageContainerSize.height}
        >
          <Layer>
            {labels.map((label) => {
              const color = classesMap.get(label.class)?.color ?? "#000000";
              const x = label.start.x * imageContainerSize.width;
              const y = label.start.y * imageContainerSize.height;
              const width =
                (label.end.x - label.start.x) * imageContainerSize.width;
              const height =
                (label.end.y - label.start.y) * imageContainerSize.height;

              return (
                <Group key={label.id} id={label.id}>
                  <Rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={`${color}4f`}
                    stroke={`${color}`}
                    strokeWidth={1}
                  />
                </Group>
              );
            })}
          </Layer>
        </Stage>
      </div>
    );
  }

  // let exportTypeTag = null;
  // if (type === "train") {
  //   exportTypeTag = (
  //     <div className="bg-yellow-500 rounded-tr-sm rounded-bl-sm px-2 oy-1 font-bold text-xs">
  //       Train
  //     </div>
  //   );
  // } else if (type === "validation") {
  //   exportTypeTag = (
  //     <div className="bg-green-500 rounded-tr-sm rounded-bl-sm px-2 oy-1 font-bold text-xs">
  //       Validation
  //     </div>
  //   );
  // } else if (type === "test") {
  //   exportTypeTag = (
  //     <div className="bg-blue-500 rounded-tr-sm rounded-bl-sm px-2 oy-1 font-bold text-xs">
  //       Test
  //     </div>
  //   );
  // }

  return (
    <div
      className={cn(
        "relative w-full h-full border rounded-sm overflow-hidden",
        {
          "border-yellow-500": type === "train",
          "border-green-500": type === "validation",
          "border-blue-500": type === "test",
        }
      )}
    >
      <img
        ref={ref}
        loading="lazy"
        className="w-full h-full flex flex-1 object-contain bg-black"
        src={img.data ? convertFileSrc(img.data) : ""}
        alt={imagePath}
        onLoad={(e) => {
          if (!(e.target instanceof HTMLImageElement)) return;
          updateContainerSize(e.target);
        }}
      />
      {overlayElement !== null && overlayElement}
      {/* <div className="absolute top-0 right-0">{exportTypeTag}</div> */}
    </div>
  );
}

export function DatasetGrid({
  images,
  cacheDir,
  exportTypeMap,
}: {
  images: string[];
  cacheDir: string;
  exportTypeMap: Map<string, ExportDistributionType>;
}) {
  const { isAboveMd } = useBreakpoint("md");
  const { isAboveLg } = useBreakpoint("lg");

  let columns = 2;
  let imageHeight = 144; // h-36
  if (isAboveMd) {
    columns = 3;
    imageHeight = 176; // h-44
  }
  if (isAboveLg) {
    columns = 4;
    imageHeight = 208; // h-52
  }
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(images.length / columns),
    getScrollElement: () => parentRef.current,
    estimateSize: () => imageHeight,
    overscan: 2,
  });
  const items = rowVirtualizer.getVirtualItems();
  const currentProjectStore = useCurrentProjectStore(({ project }) => ({
    project,
  }));
  const { classesQuery } = useLabelClasses(currentProjectStore.project);
  const classesMap = useMemo(() => {
    if (!classesQuery.data) {
      return new Map();
    }
    return new Map(classesQuery.data.map((cls) => [cls.id, cls]));
  }, [classesQuery.data]);

  return (
    <div ref={parentRef} className="w-full h-96 overflow-auto">
      <div
        className="w-full relative"
        style={{
          height: rowVirtualizer.getTotalSize(),
        }}
      >
        <div
          className="absolute top-0 left-0 w-full flex flex-col gap-4"
          style={{
            transform: `translateY(${items[0]?.start ?? 0}px)`,
          }}
        >
          {items.map((virtualRow) => {
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                className="w-full flex flex-row gap-4"
              >
                {new Array(columns).fill(null).map((_, i) => {
                  const index = virtualRow.index * columns + i;
                  if (index >= images.length) {
                    return <div key={i} className="w-full h-full" />;
                  }
                  const imagePath = images[index];
                  const exportType = exportTypeMap.get(imagePath);
                  return (
                    <div
                      key={i}
                      className={cn("w-full", {
                        "h-36": !isAboveMd,
                        "h-44": isAboveMd,
                        "h-52": isAboveLg,
                      })}
                    >
                      <DatasetGridItem
                        imagePath={imagePath}
                        cacheDir={cacheDir}
                        type={exportType}
                        classesMap={classesMap}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
