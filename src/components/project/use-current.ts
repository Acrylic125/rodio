import { useCurrentProjectFileStore } from "@/stores/current-project-file-store";
import { useCurrentProjectStore } from "@/stores/current-project-store";

export function useCurrent() {
  const currentProjectFileStore = useCurrentProjectFileStore(
    ({ filePath: projectPath, labels, setLabels }) => {
      return {
        projectPath,
        labels,
        setLabels,
      };
    }
  );
  const currentProjectStore = useCurrentProjectStore(
    ({ project, classesMap, selectedClass }) => {
      return {
        project,
        classesMap,
        selectedClass,
      };
    }
  );
  return {
    currentProjectFileStore,
    currentProjectStore,
  };
}
