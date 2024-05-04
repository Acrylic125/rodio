import { Link, createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createDir, exists } from "@tauri-apps/api/fs";
import { useMutation } from "@tanstack/react-query";
import { open } from "@tauri-apps/api/dialog";
import { appLocalDataDir } from "@tauri-apps/api/path";
import { useState } from "react";
import path from "path";

// readDir("");

export const Route = createLazyFileRoute("/new-project")({
  component: NewProject,
});

function shouldUseProjectNameAsBasename(_path: string, projectName: string) {
  const basename = path.basename(_path);
  return basename === projectName || _path === "" || projectName === "";
}

function NewProject() {
  const navigate = useNavigate({ from: "/new-project" });
  const createProjectMut = useMutation({
    mutationFn: async ({ path, name }: { path: string; name: string }) => {
      // const fullPath = path.join(dir, name);
      if (await exists(path)) {
        throw Error(`${path} already exists.`);
      }
      createDir(name, {
        recursive: true,
      });
    },
  });
  const [projectName, setProjectName] = useState("");
  const [projectPath, setProjectPath] = useState("");

  return (
    <main className="flex flex-col items-center bg-background w-screen h-svh">
      <section className="w-full h-full flex flex-col gap-4 md:gap-8 lg:gap-12 max-w-screen-xl p-4 md:p-8 lg:p-12">
        <div className="flex flex-col gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>New Project</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-xl md:text-2xl lg:text-3xl text-gray-950 dark:text-gray-50 font-bold">
            New Project
          </h1>
        </div>
        <form
          className="flex flex-col gap-4 md:gap-8 lg:gap-12"
          onSubmit={(e) => {
            e.preventDefault();
            // invoke("hello_world", { name: "World" })
            //   // `invoke` returns a Promise
            //   .then((response) => console.log(response));
            navigate({
              to: "/project/$path",
              params: { path: "helloworld" },
            });
          }}
        >
          <div className="flex flex-col gap-2 md:gap-4 lg:gap-6">
            <label className="flex flex-col gap-2">
              <p>Project Name</p>
              <Input
                placeholder="Project name (e.g. Bus Detector)"
                className="h-12"
                value={projectName}
                onChange={(e) => {
                  const newProjectName = e.target.value;
                  setProjectName(newProjectName);
                  const currentProjectPath = projectPath;
                  if (
                    shouldUseProjectNameAsBasename(
                      currentProjectPath,
                      projectName
                    )
                  ) {
                    const selectedProjectPath = path.join(
                      projectName === ""
                        ? currentProjectPath
                        : path.dirname(currentProjectPath),
                      newProjectName
                    );
                    setProjectPath(selectedProjectPath);
                  }
                }}
              />
            </label>
            <div></div>
            <label className="flex flex-col gap-2">
              <p>Project Path</p>
              <div className="w-full flex flex-row gap-2">
                <div className="w-full flex flex-row">
                  <Button
                    onClick={async (e) => {
                      e.preventDefault();
                      const currentProjectPath = projectPath;
                      const selected = await open({
                        directory: true,
                        multiple: false,
                        defaultPath:
                          currentProjectPath == ""
                            ? await appLocalDataDir()
                            : currentProjectPath,
                      });
                      if (!selected) return;
                      let selectedProjectPath = Array.isArray(selected)
                        ? selected[0]
                        : selected;
                      if (
                        shouldUseProjectNameAsBasename(
                          currentProjectPath,
                          projectName
                        )
                      ) {
                        selectedProjectPath = path.join(
                          selectedProjectPath,
                          projectName
                        );
                      }
                      setProjectPath(selectedProjectPath);
                    }}
                    type="button"
                    variant="secondary"
                    className="h-full rounded-r-none"
                  >
                    Browse
                  </Button>
                  <Input
                    placeholder="Browse project location"
                    className="w-full h-12 rounded-l-none"
                    aria-label="Project Directory Base Path"
                    value={projectPath}
                    onChange={(e) => setProjectPath(e.target.value)}
                  />
                </div>
              </div>
              {/* <Input type="file" className="h-12" /> */}
            </label>
          </div>
          <div className="flex flex-row gap-2">
            <Button asChild variant="outline">
              <Link to="/">Cancel</Link>
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </section>
    </main>
  );
}
