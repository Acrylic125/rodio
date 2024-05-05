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
import { useMutation } from "@tanstack/react-query";
import { open } from "@tauri-apps/api/dialog";
import { appLocalDataDir } from "@tauri-apps/api/path";
import { useState } from "react";
import path from "path";
import { Loader2 } from "lucide-react";
import { isValidFilepath } from "@/lib/file";
import { RodioProject } from "@/lib/rodio";
import { resolveError } from "@/lib/utils";

// readDir("");
type CreateProjectErrors = {
  projectName?: string;
  projectPath?: string;
};

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
    mutationFn: async ({
      path,
      name,
    }: {
      path: string;
      name: string;
    }): Promise<
      | {
          state: "valid";
        }
      | {
          state: "invalid";
          errors: CreateProjectErrors;
        }
    > => {
      let errors: CreateProjectErrors = {};
      const trimmedName = name.trim();
      if (trimmedName === "") {
        errors.projectName = "Project name is required";
      } else if (name.length > 32) {
        errors.projectName = "Project name is too long (Max 32 characters";
      }

      const project = new RodioProject(path);
      project.config.values.name = name;
      if (!isValidFilepath(path)) {
        errors.projectPath = "Invalid project path";
      } else {
        // Check if the directory exists
        if (await project.configExists()) {
          errors.projectPath = `Cannot create project at '${path}'. Project config already exists!`;
        }
      }

      // Check if there are any errors
      const hasErrors = Object.values(errors).findIndex((v) => v !== undefined);
      if (hasErrors !== -1) {
        return {
          state: "invalid",
          errors,
        };
      }
      await project.init();
      navigate({
        to: "/project/$path",
        params: { path: encodeURIComponent(path) },
      });
      return {
        state: "valid",
      };
    },
    onError: (error) => {
      console.error(typeof error);
    },
  });
  const [projectName, setProjectName] = useState("");
  const [projectPath, setProjectPath] = useState("");
  const validationStatus = createProjectMut.data ?? {
    state: "invalid",
    errors: {},
  };

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
            createProjectMut.mutate({
              path: projectPath,
              name: projectName,
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
                  // Update project name
                  const newProjectName = e.target.value;
                  setProjectName(newProjectName);

                  // Update project path
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
              {validationStatus.state === "invalid" &&
                validationStatus.errors.projectName && (
                  <p className="text-red-500">
                    {validationStatus.errors.projectName}
                  </p>
                )}
            </label>
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
                    onChange={(e) => {
                      setProjectPath(e.target.value);
                    }}
                  />
                </div>
              </div>
              {validationStatus.state === "invalid" &&
                validationStatus.errors.projectPath && (
                  <p className="text-red-500">
                    {validationStatus.errors.projectPath}
                  </p>
                )}
            </label>
          </div>
          {createProjectMut.error && (
            <p className="w-full bg-red-200 dark:bg-red-300 border-2 border-red-400 dark:border-red-500 text-red-500 dark:text-red-500 p-2 md:p-4 rounded-md">
              {resolveError(createProjectMut.error)}
            </p>
          )}
          <div className="flex flex-row gap-2">
            <Button type="button" asChild variant="outline">
              <Link to="/">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={
                createProjectMut.isPending || createProjectMut.isSuccess
              }
            >
              {createProjectMut.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
