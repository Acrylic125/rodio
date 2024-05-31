import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import ImagePreview from "@/components/project/image-preview";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentProjectStore } from "@/stores/current-project-store";
import { ImageList } from "@/components/project/image-list";
import { LabelList } from "@/components/project/label-list";
import { ClassList } from "@/components/project/class-list";
import { ExportModal } from "@/components/project/export/export-modal";
import { TauriEvent } from "@tauri-apps/api/event";
import { appWindow } from "@tauri-apps/api/window";

export const Route = createFileRoute("/project/$path")({
  component: Project,
});

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
  useEffect(() => {
    // const appWindow = window.__TAURI__.window;

    const unsub = appWindow
      // .getCurrent()
      .listen(TauriEvent.WINDOW_CLOSE_REQUESTED, async () => {
        // const confirmed = await dialog.confirm(
        //   "Are you sure you want to exit?"
        // );
        // if (confirmed) {
        //   appWindow.close();
        // } else {
        //   // Prevent closing if user cancels (currently not possible directly)
        //   //  We can use a timeout to close after a short delay to simulate prevention
        //   // setTimeout(function () {
        //   //   appWindow.close();
        //   // }, 4000);
        // }
      });
    return () => {
      unsub.then((u) => u());
    };
  }, []);

  let imagePreview = null;
  if (currentProjectStore.loadStatus.state === "success") {
    if (currentProjectStore.selectedImage !== null) {
      imagePreview = (
        <ImagePreview
          key={currentProjectStore.selectedImage}
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
      <nav className="flex flex-row items-center justify-between w-full h-12 border-b border-gray-300 dark:border-gray-700 px-3">
        {currentProjectStore.project === null ? (
          <Skeleton className="w-32 h-4" />
        ) : (
          <h1>{currentProjectStore.project.config.values.name}</h1>
        )}
        <ExportModal>
          <Button variant="secondary">Export</Button>
        </ExportModal>
      </nav>
      <div className="w-full h-[calc(100svh-3rem)] flex flex-row">
        <section className="flex flex-col w-full h-[calc(100svh-3rem)] max-w-64">
          <ImageList />
        </section>
        <div className="relative w-full h-full bg-black flex items-center justify-center border-x border-gray-300 dark:border-gray-700">
          {imagePreview}
        </div>
        <section className="flex flex-col w-full h-[calc(100svh-3rem)] max-w-64">
          <ClassList
            isPending={currentProjectStore.loadStatus.state !== "success"}
          />
          <LabelList
            isPending={currentProjectStore.loadStatus.state !== "success"}
          />
        </section>
      </div>
    </main>
  );
}
