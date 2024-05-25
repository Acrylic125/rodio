import { useCurrentProjectFileStore } from "@/stores/current-project-file-store";
import { useCurrentProjectStore } from "@/stores/current-project-store";
import { Skeleton } from "../ui/skeleton";
import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export function LabelList({ isPending }: { isPending?: boolean }) {
  const currentProjectStore = useCurrentProjectStore(({ classesMap }) => {
    return {
      classesMap,
    };
  });
  const currentProjectFileStore = useCurrentProjectFileStore(({ labels }) => {
    return {
      labels,
    };
  });
  const classesMap = currentProjectStore.classesMap;
  const parentRef = useRef(null);

  const rowVirtualizer = useVirtualizer({
    count: currentProjectFileStore.labels.size,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // h-10
    overscan: 5,
  });
  const labels = useMemo(
    () => Array.from(currentProjectFileStore.labels.values()),
    [currentProjectFileStore.labels]
  );

  return (
    <>
      <h2 className="text-gray-500 font-medium p-2 border-b border-gray-300 dark:border-gray-700 select-none">
        LABELS
      </h2>
      <div
        className="flex-1 flex flex-col gap-0 py-2 overflow-auto"
        ref={parentRef}
      >
        <ul
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {isPending
            ? new Array(5).fill(null).map((_, i) => (
                <li key={i} className="p-1">
                  <Skeleton className="w-full h-8" />
                </li>
              ))
            : rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const label = labels[virtualRow.index];
                return (
                  <li
                    key={virtualRow.key}
                    className="p-2 h-10"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="flex flex-row items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{
                          backgroundColor:
                            classesMap.get(label.class)?.color ?? "#000",
                        }}
                      />
                      <span className="flex flex-row gap-2">
                        <p className="text-gray-950 dark:text-gray-50">
                          {"("}
                          {label.start.x.toFixed(2)}, {label.start.y.toFixed(2)}
                          {")"}
                        </p>
                        <p className="text-gray-700 dark:text-gray-300"> to </p>
                        <p className="text-gray-950 dark:text-gray-50">
                          {"("}
                          {label.end.x.toFixed(2)}, {label.end.y.toFixed(2)}
                          {")"}
                        </p>
                      </span>
                    </div>
                  </li>
                );
              })}
        </ul>
      </div>
    </>
  );
}
