import { createFileRoute } from "@tanstack/react-router";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterIcon, PlusIcon } from "lucide-react";
import ImagePreview from "@/components/project/image-preview";

export const Route = createFileRoute("/project/$path")({
  component: Project,
});

const paths = [
  "/Users/benedicttan/Desktop/projects/weyes/dataset/IMG_7447.JPG",
  "/Users/benedicttan/Desktop/projects/weyes/dataset/IMG_7479.JPG",
  "/Users/benedicttan/Desktop/projects/weyes/dataset/IMG_7451.JPG",
  "/Users/benedicttan/Desktop/tttt.jpeg",
];

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

function Project() {
  // const { path } = Route.useParams();
  const [currentPath, setCurrentPath] = useState(paths[0]);
  // const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <main className="flex flex-col items-center bg-background w-screen h-svh">
      <nav className="flex flex-row items-center w-full h-12 border-b border-gray-300 dark:border-gray-700 px-3">
        <h1>Rodio</h1>
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
          <ul className="w-full p-2">
            {paths.map((path) => (
              <li
                key={path}
                className={cn(
                  "p-1 cursor-pointer truncate w-full transition ease-in-out duration-200",
                  {
                    "text-gray-50 dark:text-gray-950 bg-primary rounded-sm":
                      path === currentPath,
                    "text-gray-700 dark:text-gray-300": path !== currentPath,
                  }
                )}
                onClick={() => setCurrentPath(path)}
              >
                {path.split("/").pop()}
              </li>
            ))}
          </ul>
        </section>
        <div className="relative w-full h-full bg-black flex items-center justify-center border-x border-gray-300 dark:border-gray-700">
          <ImagePreview currentPath={currentPath} />
        </div>
        <section className="w-full h-[calc(100svh-3rem)] max-w-64 overflow-auto relative">
          <h2 className="text-gray-500 font-medium p-2 border-b border-gray-300 dark:border-gray-700">
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
          <h2 className="text-gray-500 font-medium p-2 border-b border-gray-300 dark:border-gray-700">
            CLASSES
          </h2>
          <ul>
            {classes.map((cls) => (
              <li key={cls.id} className="p-2">
                <div className="flex flex-row items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: cls.color }}
                  />
                  <p>{cls.name}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
