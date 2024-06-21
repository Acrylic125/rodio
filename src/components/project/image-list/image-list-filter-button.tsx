import { resolveError } from "@/lib/utils";
import { Button } from "../../ui/button";
import { Check, FilterIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { RodioProject } from "@/lib/rodio-project";
import { Skeleton } from "../../ui/skeleton";
import { useLabelClasses } from "@/lib/use-label-classes";
import { LabelFilterModes, useImageList } from "./use-image-list";

export function ImageListFilterButton({
  filter,
  setFilter,
  project,
}: ReturnType<typeof useImageList> & {
  project: RodioProject | null;
}) {
  const { classesQuery } = useLabelClasses(project);
  const hasNonSearchStringFilters = filter.labelFilterMode !== "all";

  let labelledWithClassesElement = null;
  if (classesQuery.isFetching) {
    labelledWithClassesElement = (
      <div className="flex flex-col gap-2">
        {new Array(3).fill(null).map((_, i) => (
          <Skeleton key={i} className="w-full h-8" />
        ))}
      </div>
    );
  } else if (classesQuery.isError) {
    labelledWithClassesElement = (
      <div className="w-full p-4 flex flex-col items-center justify-center">
        <h3 className="text-red-500 text-center">Error loading classes</h3>
        <p className="text-gray-500 text-center">
          {resolveError(classesQuery.error)}
        </p>
      </div>
    );
  } else if (classesQuery.data) {
    labelledWithClassesElement = (
      <>
        {classesQuery.data.map((labelClass) => (
          <ul key={labelClass.id}>
            <li>
              <Button
                className="w-full flex flex-row px-2 py-2 gap-1 text-left justify-start h-fit"
                variant="ghost"
                disabled={filter.labelFilterMode !== "includeClass"}
                onClick={() => {
                  setFilter((filter) => {
                    const newFilter = { ...filter };

                    const checked = filter.classesWithLabel?.has(labelClass.id);
                    if (checked) {
                      const newSet = new Set(newFilter.classesWithLabel);
                      newSet.delete(labelClass.id);
                      newFilter.classesWithLabel = newSet;
                    } else {
                      const newSet = new Set(newFilter.classesWithLabel);
                      newSet.add(labelClass.id);
                      newFilter.classesWithLabel = newSet;
                    }
                    return newFilter;
                  });
                }}
              >
                <div className="flex flex-row items-center justify-center w-6">
                  {!!filter.classesWithLabel?.has(labelClass.id) && (
                    <Check className="w-4 h-4 text-foreground" />
                  )}
                </div>
                <div className="flex flex-row items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: labelClass.color,
                    }}
                  />
                  <p>{labelClass.name}</p>
                </div>
              </Button>
            </li>
          </ul>
        ))}
      </>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className="px-0 py-0 w-fit aspect-square"
          variant={hasNonSearchStringFilters ? "default" : "secondary"}
        >
          <FilterIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <div className="px-2 py-2.5 flex flex-row gap-1">
          <div className="w-6" />
          <h3 className="text-sm font-bold">Labelled with Classes</h3>
        </div>
        <div className="w-full border-b" />
        <ul>
          {LabelFilterModes.map((mode) => {
            return (
              <li key={mode.type}>
                <Button
                  className="w-full flex flex-row px-2 py-2 gap-1 text-left justify-start h-fit"
                  variant="ghost"
                  onClick={() => {
                    setFilter((filter) => {
                      return {
                        ...filter,
                        labelFilterMode: mode.type,
                      };
                    });
                  }}
                >
                  <div className="flex flex-row items-center justify-center w-6">
                    {mode.type === filter.labelFilterMode && (
                      <div className="w-2 h-2 bg-foreground rounded-full" />
                    )}
                  </div>
                  <p>{mode.label}</p>
                </Button>
              </li>
            );
          })}
        </ul>
        <div className="w-full border-b" />
        {labelledWithClassesElement}
      </PopoverContent>
    </Popover>
  );
}
