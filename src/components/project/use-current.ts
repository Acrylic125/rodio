import { useCurrentProjectFileStore } from "@/stores/current-project-file-store";
import { useCurrentProjectStore } from "@/stores/current-project-store";

export function useCurrent() {
  const currentProjectFileStore = useCurrentProjectFileStore(
    ({
      filePath: projectPath,
      focusedLabel,
      setFocusedLabel,
      labels,
      setLabels,
    }) => {
      return {
        focusedLabel,
        setFocusedLabel,
        projectPath,
        labels,
        setLabels,
      };
    }
  );
  const currentProjectStore = useCurrentProjectStore(
    ({ project, selectedClass }) => {
      return {
        project,
        selectedClass,
      };
    }
  );
  return {
    currentProjectFileStore,
    currentProjectStore,
  };
}
