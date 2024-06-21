import { asImagesQK } from "@/lib/query-keys";
import { useCurrentProjectStore } from "@/stores/current-project-store";
import { useQuery } from "@tanstack/react-query";

export function useExportImages(options: { onlyExportLabelled: boolean }) {
  const currentProjectStore = useCurrentProjectStore(({ project }) => {
    return {
      project,
    };
  });
  return useQuery({
    queryKey: asImagesQK(
      currentProjectStore.project?.projectPath,
      options.onlyExportLabelled ? "export-labelled" : "export-all"
    ),
    enabled: currentProjectStore.project !== null,
    queryFn: async () => {
      if (currentProjectStore.project === null) {
        return [];
      }
      const _images = await currentProjectStore.project.images.getImages(
        currentProjectStore.project.projectPath
      );
      const images = _images.map((image) => image.path);
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
