import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { cn, resolveError } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterIcon, Loader2, PlusIcon } from "lucide-react";
import ImagePreview from "@/components/project/image-preview";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog } from "@radix-ui/react-dialog";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ColorPicker, colors } from "@/components/ui/color-picker";
import { useCurrentProjectStore } from "@/stores/current-project-store";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/project/$path")({
  component: Project,
});

const classes = [
  {
    id: "1",
    name: "bus_number",
    color: "#FF0000",
  },
] as const;

const labels = [
  {
    id: "1",
    class: "1",
    start: [0, 0],
    end: [1, 1],
  },
] as const;

function ImageList() {
  const currentProjectStore = useCurrentProjectStore((state) => {
    return {
      project: state.project,
      selectedImage: state.selectedImage,
      selectImage: state.selectImage,
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
            onClick={() => currentProjectStore.selectImage(path)}
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

export function CreateOrEditClassModal({
  isOpen,
  setIsOpen,
  onRequestSave,
  error,
  isPending,
  mode,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onRequestSave?: (cls: { name: string; color: string }) => void;
  error?: string | null;
  isPending?: boolean;
  mode: "create" | "edit";
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(
    colors[Math.floor(Math.random() * colors.length)]
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md md:max-w-lg lg:max-w-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onRequestSave?.({ name, color });
          }}
        >
          {mode === "create" ? (
            <DialogHeader>
              <DialogTitle>Create Class</DialogTitle>
              <DialogDescription>
                Specify the class to create.
              </DialogDescription>
            </DialogHeader>
          ) : (
            <DialogHeader>
              <DialogTitle>Edit Class</DialogTitle>
              <DialogDescription>
                Specify the changes to make to this class.
              </DialogDescription>
            </DialogHeader>
          )}
          <div className="grid gap-4 py-4">
            <label className="flex flex-col gap-2">
              <span>Name</span>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                }}
                name="Name"
                placeholder="Class Name (e.g. bus_number)"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span>Color</span>
              <ColorPicker
                background={color}
                setBackground={setColor}
                className="w-full"
              />
            </label>
          </div>

          {error && (
            <Alert className="mb-4" variant="error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              type="submit"
              disabled={isPending}
              className="flex flex-row gap-2"
            >
              {isPending && <Loader2 className="animate-spin" />}
              {mode === "create" ? "Create" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ClassList() {
  const [createClassModalOpen, setCreateClassModalOpen] = useState(false);
  const currentProjectStore = useCurrentProjectStore(
    ({ classes, project, selectedClass, selectClass, setClasses }) => {
      return {
        classes,
        project,
        selectedClass,
        selectClass,
        setClasses,
      };
    }
  );
  const createClassMut = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      // await currentProjectStore.project.
      if (currentProjectStore.project === null) return;
      await currentProjectStore.project.db.addClass(name, color);
      currentProjectStore.setClasses([
        ...currentProjectStore.classes,
        {
          id: String(currentProjectStore.classes.length + 1),
          name,
          color,
        },
      ]);
    },
    onSuccess: () => {
      setCreateClassModalOpen(false);
    },
  });

  return (
    <>
      <CreateOrEditClassModal
        isOpen={createClassModalOpen}
        setIsOpen={setCreateClassModalOpen}
        onRequestSave={createClassMut.mutate}
        isPending={createClassMut.isPending}
        error={
          createClassMut.error ? resolveError(createClassMut.error) : undefined
        }
        mode="create"
      />

      <div className="flex flex-row items-baseline justify-between gap-2 p-2 border-b border-gray-300 dark:border-gray-700 select-none">
        <h2 className="text-gray-500 font-medium">CLASSES</h2>
        <Button
          className="px-0 py-0 w-8 h-8 aspect-square"
          variant="secondary"
          onClick={(e) => {
            e.preventDefault();
            setCreateClassModalOpen(true);
          }}
        >
          <PlusIcon className="w-6 h-6" />
        </Button>
      </div>

      <ul className="flex flex-col gap-0">
        {currentProjectStore.classes.map((cls) => (
          <li
            key={cls.id}
            className="px-1 cursor-pointer"
            onClick={() => currentProjectStore.selectClass(cls.id)}
          >
            <div
              className={cn(
                "flex flex-row items-center gap-2 p-1 transition ease-in-out duration-200",
                {
                  "bg-primary text-gray-50 dark:text-gray-950 rounded-sm":
                    cls.id === currentProjectStore.selectedClass,
                }
              )}
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: cls.color }}
              />
              <p>{cls.name}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function Project() {
  const { path: _path } = Route.useParams();
  const path = useMemo(() => decodeURIComponent(_path), [_path]);
  const currentProjectStore = useCurrentProjectStore((state) => {
    return {
      selectedImage: state.selectedImage,
      project: state.project,
      loadStatus: state.loadStatus,
      load: state.load,
    };
  });
  useEffect(() => {
    if (
      currentProjectStore.project === null ||
      currentProjectStore.project.projectPath !== path
    ) {
      currentProjectStore.load(path);
    }
  }, [currentProjectStore.project, currentProjectStore.load, path]);

  let imagePreview = null;
  if (currentProjectStore.loadStatus.state === "success") {
    if (currentProjectStore.selectedImage !== null) {
      imagePreview = (
        <ImagePreview
          currentPath={currentProjectStore.selectedImage}
          mode="label"
        />
      );
    } else {
      imagePreview = (
        <div className="flex flex-col gap-1">
          <h2 className="text-gray-950 dark:text-gray-50 text-lg font-medium text-center">
            No image selected
          </h2>
          <h2 className="text-gray-500 dark:text-gray-500 font-medium text-center">
            Select an image from the "Files" section.
          </h2>
        </div>
      );
    }
  } else if (currentProjectStore.loadStatus.state === "error") {
    imagePreview = (
      <div className="flex flex-col gap-1">
        <h2 className="text-red-500 text-lg font-medium text-center">
          Error loading project
        </h2>
        <h2 className="text-gray-500 dark:text-gray-500 font-medium text-center">
          {currentProjectStore.loadStatus.message}
        </h2>
      </div>
    );
  } else {
    imagePreview = <Loader2 className="animate-spin w-8 h-8" />;
  }

  return (
    <main className="flex flex-col items-center bg-background w-screen h-svh">
      <nav className="flex flex-row items-center w-full h-12 border-b border-gray-300 dark:border-gray-700 px-3">
        {currentProjectStore.project === null ? (
          <Skeleton className="w-32 h-4" />
        ) : (
          <h1>{currentProjectStore.project.config.values.name}</h1>
        )}
      </nav>
      <div className="w-full h-[calc(100svh-3rem)] flex flex-row">
        <section className="w-full h-[calc(100svh-3rem)] max-w-64 overflow-auto relative">
          <div className="flex flex-col gap-2 sticky w-full border-b bg-background/75 backdrop-blur-md border-gray-300 dark:border-gray-700 top-0 p-3">
            <h2 className="text-gray-500 font-medium">FILES</h2>
            <div className="flex flex-row gap-2">
              <Input placeholder="Search" />
              <Button
                className="px-0 py-0 w-fit aspect-square"
                variant="secondary"
              >
                <FilterIcon />
              </Button>
            </div>
          </div>
          <ImageList />
        </section>
        <div className="relative w-full h-full bg-black flex items-center justify-center border-x border-gray-300 dark:border-gray-700">
          {imagePreview}
        </div>
        <section className="w-full h-[calc(100svh-3rem)] max-w-64 overflow-auto relative">
          <h2 className="text-gray-500 font-medium p-2 border-b border-gray-300 dark:border-gray-700 select-none">
            LABELS
          </h2>
          <ul>
            {labels.map((label) => (
              <li key={label.class} className="p-2">
                <div className="flex flex-row items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: classes[0].color }}
                  />
                  <span className="flex flex-row gap-2">
                    <p className="text-gray-950 dark:text-gray-50">
                      {"("}
                      {label.start.join(", ")}
                      {")"}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300"> to </p>
                    <p className="text-gray-950 dark:text-gray-50">
                      {"("}
                      {label.end.join(", ")}
                      {")"}
                    </p>
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <ClassList />
        </section>
      </div>
    </main>
  );
}
