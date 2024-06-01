import { useCurrentProjectStore } from "@/stores/current-project-store";
import { useQuery } from "@tanstack/react-query";

export function useExportImages(options: { onlyExportLabelled: boolean }) {
  const currentProjectStore = useCurrentProjectStore(({ images, project }) => {
    return {
      images,
      project,
    };
  });
  return useQuery({
    queryKey: [
      "export-images",
      currentProjectStore.project?.projectPath,
      options.onlyExportLabelled,
    ],
    enabled: currentProjectStore.project !== null,
    queryFn: async () => {
      if (currentProjectStore.project === null) {
        return [];
      }
      const images = currentProjectStore.images.map((image) => image.path);
      if (!options.onlyExportLabelled) {
        return images;
      }
      const _filtered =
        await currentProjectStore.project.db.getAllLabelledFiles();
      const filtered = new Set(_filtered.map((file) => file.path));
      const labelledImages = images.filter((image) => filtered.has(image));
      return labelledImages;
    },
  });
}
