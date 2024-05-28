import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useBreakpoint } from "@/lib/use-breakpoint";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { cn } from "@/lib/utils";
import { RodioImage } from "@/lib/rodio-project";
import { useOptimisedImage } from "../../image/use-optimised-image";
import { Skeleton } from "../../ui/skeleton";
import { ExportDistributionType } from "./export-types";

function DatasetGridItem({
  image,
  cacheDir,
  type,
}: {
  image: RodioImage;
  cacheDir: string;
  type?: ExportDistributionType;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const img = useOptimisedImage(ref, image.path, cacheDir, "dataset-grid");

  let overlayElement = null;
  if (img.isPending && !img.data) {
    overlayElement = (
      <div className="bg-black absolute top-0 left-0 w-full h-full overflow-hidden">
        <Skeleton className="w-full h-full rounded-none" />
      </div>
    );
  } else if (img.isError) {
    overlayElement = (
      <div className="absolute top-0 left-0 bg-black w-full h-full flex flex-col items-center justify-center gap-2">
        <h2 className="text-red-500 text-lg font-medium text-center">
          Error loading image
        </h2>
      </div>
    );
  }

  let exportTypeTag = null;
  if (type === "train") {
    exportTypeTag = (
      <div className="bg-yellow-500 rounded-tr-sm rounded-bl-sm px-2 oy-1 font-bold text-xs">
        Train
      </div>
    );
  } else if (type === "validation") {
    exportTypeTag = (
      <div className="bg-green-500 rounded-tr-sm rounded-bl-sm px-2 oy-1 font-bold text-xs">
        Validation
      </div>
    );
  } else if (type === "test") {
    exportTypeTag = (
      <div className="bg-blue-500 rounded-tr-sm rounded-bl-sm px-2 oy-1 font-bold text-xs">
        Test
      </div>
    );
  }

  return (
    <div className="relative w-full h-full border border-gray-300 dark:border-gray-700 rounded-sm overflow-hidden">
      <img
        ref={ref}
        loading="lazy"
        className="w-full h-full flex flex-1 object-contain bg-black"
        src={img.data ? convertFileSrc(img.data) : ""}
        alt={image.path}
      />
      {overlayElement !== null && overlayElement}
      <div className="absolute top-0 right-0">{exportTypeTag}</div>
    </div>
  );
}

export function DatasetGrid({
  images,
  cacheDir,
  exportTypeMap,
}: {
  images: RodioImage[];
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
                  const imageFile = images[index];
                  const exportType = exportTypeMap.get(imageFile.path);
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
                        image={imageFile}
                        cacheDir={cacheDir}
                        type={exportType}
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
