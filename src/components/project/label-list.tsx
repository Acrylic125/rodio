import { useCurrentProjectFileStore } from "@/stores/current-project-file-store";
import { useCurrentProjectStore } from "@/stores/current-project-store";
import { Skeleton } from "../ui/skeleton";
import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useLabelClasses } from "@/lib/use-label-classes";
import { LabelClass, LabelClassId } from "@/lib/rodio-project";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

export function LabelList({ isPending }: { isPending?: boolean }) {
  const currentProjectStore = useCurrentProjectStore(({ project }) => {
    return {
      project,
    };
  });
  const currentProjectFileStore = useCurrentProjectFileStore(
    ({ labels, focusedLabel, setFocusedLabel }) => {
      return {
        labels,
        focusedLabel,
        setFocusedLabel,
      };
    }
  );
  const { classesQuery } = useLabelClasses(currentProjectStore.project);
  const classesMap = useMemo<Map<LabelClassId, LabelClass>>(() => {
    if (!classesQuery.data) return new Map();
    return new Map(classesQuery.data.map((c) => [c.id, c]));
  }, [classesQuery.data]);
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
        className="flex-1 flex flex-col gap-0 py-1 overflow-auto"
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
                const isSelected =
                  currentProjectFileStore.focusedLabel === label.id;
                return (
                  <li
                    key={virtualRow.key}
                    className="w-full px-1 h-10"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <Button
                      variant={isSelected ? "default" : "ghost"}
                      onClick={() => {
                        if (isSelected) {
                          currentProjectFileStore.setFocusedLabel(null);
                          return;
                        }
                        currentProjectFileStore.setFocusedLabel(label.id);
                      }}
                      className="text-left w-full h-fit flex flex-row items-center justify-start gap-2 px-1"
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{
                          backgroundColor:
                            classesMap.get(label.class)?.color ?? "#000",
                        }}
                      />
                      <span className="flex flex-row gap-2">
                        {classesMap.get(label.class)?.name ?? "Unknown"}
                      </span>
                    </Button>
                  </li>
                );
              })}
        </ul>
      </div>
    </>
  );
}
