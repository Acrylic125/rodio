import { useCallback, useEffect, useState } from "react";
import { appWindow } from "@tauri-apps/api/window";
import { useDebounce } from "@uidotdev/usehooks";
import { LabelClassId, RodioProject } from "@/lib/rodio-project";
import Fuse from "fuse.js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { basename } from "path";
import { ImagesQueryKey, isKeyStartingWith } from "@/lib/query-keys";

export const LabelFilterModes = [
  {
    type: "all",
    label: "All",
  },
  {
    type: "includeClass",
    label: "Include Class",
  },
] as const;

type ImageListFilter = {
  searchString: string;
  labelFilterMode: (typeof LabelFilterModes)[number]["type"];
  classesWithLabel: Set<LabelClassId>;
};

function serializeFilter(filter: ImageListFilter) {
  return `${filter.searchString}:${filter.labelFilterMode}:${Array.from(filter.classesWithLabel)}`;
}

export function useImageList(
  project: RodioProject | null,
  options: {
    onFilter?: (filter: ImageListFilter) => void;
  }
) {
  const [filter, _setFilter] = useState<ImageListFilter>({
    searchString: "",
    labelFilterMode: "all",
    classesWithLabel: new Set(),
  });
  const setFilter = useCallback(
    (filter: ImageListFilter) => {
      _setFilter(filter);
      options.onFilter?.(filter);
    },
    [_setFilter]
  );
  const debouncedFilter = useDebounce(filter, 500);
  const filterImagesQuery = useQuery({
    queryKey: [
      ImagesQueryKey,
      project?.projectPath,
      serializeFilter(debouncedFilter),
    ],
    queryFn: async () => {
      if (!project) return [];
      const filter = debouncedFilter;
      let images = await project.images.getImages(project.projectPath);
      if (filter.searchString !== "") {
        const fuse = new Fuse(
          images.map((image) => {
            return {
              ...image,
              __name: basename(image.path),
            };
          }),
          {
            keys: ["__name"],
          }
        );
        images = fuse.search(filter.searchString).map((result) => result.item);
      }
      if (filter.labelFilterMode === "includeClass") {
        const imagesWithLabelClass = await project.db.getImagesWithLabelClass(
          Array.from(filter.classesWithLabel.values())
        );
        const imagesWithLabelClassSet = new Set(imagesWithLabelClass);
        images = images.filter((image) =>
          imagesWithLabelClassSet.has(image.path)
        );
      }
      return images;
    },
  });
  const queryClient = useQueryClient();
  useEffect(() => {
    // React query focus does not work in tauri.
    // We will use the tauri window focus event to refetch the images.
    const unsub = appWindow.listen("tauri://focus", async () => {
      queryClient.invalidateQueries({
        predicate: (query) => isKeyStartingWith(query.queryKey, ImagesQueryKey),
      });
    });
    return () => {
      unsub.then((u) => u());
    };
  }, [filterImagesQuery.refetch, project?.projectPath, debouncedFilter]);
  return {
    filterImagesQuery,
    filter,
    setFilter,
  };
}
