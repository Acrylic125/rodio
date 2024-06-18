import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RodioProject } from "./rodio-project";
import { useEffect } from "react";
import { asClassesQK, isKeyStartingWith } from "./query-keys";
import { appWindow } from "@tauri-apps/api/window";

export function useLabelClasses(project: RodioProject | null) {
  const classesQuery = useQuery({
    queryKey: asClassesQK(project?.projectPath),
    queryFn: async () => {
      if (!project) return [];
      await new Promise((resolve) => setTimeout(resolve, 5000));
      let classes = await project.db.getClasses();
      return classes;
    },
  });
  const queryClient = useQueryClient();
  useEffect(() => {
    // React query focus does not work in tauri.
    // We will use the tauri window focus event to refetch the images.
    const unsub = appWindow.listen("tauri://focus", async () => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          isKeyStartingWith(query.queryKey, asClassesQK(project?.projectPath)),
      });
    });
    return () => {
      unsub.then((u) => u());
    };
  }, [classesQuery.refetch, project?.projectPath]);
  return {
    classesQuery,
  };
}
