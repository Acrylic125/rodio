import { useCurrentProjectFileStore } from "@/stores/current-project-file-store";
import { useCurrentProjectStore } from "@/stores/current-project-store";

export function LabelList({ isPending }: { isPending?: boolean }) {
  const currentProjectStore = useCurrentProjectStore(({ classesMap }) => {
    return {
      classesMap,
    };
  });
  const currentProjectFileStore = useCurrentProjectFileStore(({ labels }) => {
    return {
      labels,
      // tempLabels,
    };
  });
  const classesMap = currentProjectStore.classesMap;

  return (
    <>
      <h2 className="text-gray-500 font-medium p-2 border-b border-gray-300 dark:border-gray-700 select-none">
        LABELS
      </h2>
      <ul>
        {Array.from(currentProjectFileStore.labels.values()).map((label) => (
          <li key={label.id} className="p-2">
            <div className="flex flex-row items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{
                  backgroundColor: classesMap.get(label.class)?.color ?? "#000",
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
        ))}
        {/* {Array.from(currentProjectFileStore.tempLabels.values()).map(
          (label) => (
            <li key={label.class} className="p-2">
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
          )
        )} */}
      </ul>
    </>
  );
}
