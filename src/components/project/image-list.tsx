import { cn, resolveError } from "@/lib/utils";
import { useCurrentProjectStore } from "@/stores/current-project-store";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "../ui/skeleton";
import { useCurrentProjectFileStore } from "@/stores/current-project-file-store";

export function ImageList() {
  const currentProjectStore = useCurrentProjectStore((state) => {
    return {
      project: state.project,
      selectedImage: state.selectedImage,
      selectImage: state.selectImage,
    };
  });
  const currentProjectFileStore = useCurrentProjectFileStore((state) => {
    return {
      load: state.load,
    };
  });
  const imagesQuery = useQuery({
    queryKey: ["project-images", currentProjectStore.project?.projectPath],
    queryFn: async () => {
      const project = currentProjectStore.project;
      if (project === null) return [];
      return project.images.getImages(project.projectPath);
    },
    enabled: currentProjectStore.project !== null,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  if (imagesQuery.isError) {
    return (
      <div className="flex flex-col gap-1 w-full p-4 items-center justify-center">
        <p className="text-red-500 text-lg text-center">Error loading images</p>
        <p className="text-gray-600 dark:text-gray-400 text-sm text-center">
          {resolveError(imagesQuery.error)}
        </p>
      </div>
    );
  }
  if (imagesQuery.data === undefined || imagesQuery.isPending) {
    return (
      <ul className="w-full p-2 select-none">
        {new Array(5).fill(null).map((_, i) => (
          <li key={i} className="p-1">
            <Skeleton className="w-full h-8" />
          </li>
        ))}
      </ul>
    );
  }

  const imagePaths = imagesQuery.data.map((image) => image.path);
  return (
    <ul className="w-full p-2 select-none">
      {imagePaths.length > 0 ? (
        imagePaths.map((path) => (
          <li
            key={path}
            className={cn(
              "p-1 cursor-pointer truncate w-full transition ease-in-out duration-200",
              {
                "text-gray-50 dark:text-gray-950 bg-primary rounded-sm":
                  path === currentProjectStore.selectedImage,
                "text-gray-700 dark:text-gray-300":
                  path !== currentProjectStore.selectedImage,
              }
            )}
            onClick={() => {
              currentProjectStore.selectImage(path);
              if (currentProjectStore.project)
                currentProjectFileStore.load(currentProjectStore.project, path);
            }}
          >
            {path.split("/").pop()}
          </li>
        ))
      ) : (
        <div className="w-full p-4 flex items-center justify-center">
          <p>No images found</p>
        </div>
      )}
    </ul>
  );
}
