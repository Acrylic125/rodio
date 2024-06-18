import { useRef, useState } from "react";
import { ColorPicker, colors } from "../ui/color-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogFooter,
  DialogHeader,
} from "../ui/dialog";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { Loader2, PlusIcon, Trash2 } from "lucide-react";
import { Input } from "../ui/input";
import { useCurrentProjectStore } from "@/stores/current-project-store";
import { cn, resolveError } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { array, maxLength, minLength, object, regex, string } from "valibot";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../ui/context-menu";
import { LabelClass } from "@/lib/rodio-project";
import { useCurrentProjectFileStore } from "@/stores/current-project-file-store";
import { useSaveStore } from "@/stores/save-store";
import { useLabelClasses } from "@/lib/use-label-classes";
import { asClassesQK } from "@/lib/query-keys";
import { nanoid } from "nanoid";

const schema = object({
  classes: array(
    object({
      name: string([
        minLength(1, "Class name is required"),
        maxLength(32, "Class name must be less than 32 characters"),
        regex(/^[a-zA-Z0-9_]+$/, "Class name must be alphanumeric"),
      ]),
      color: string([
        minLength(7, "Color is required"),
        maxLength(7, "Color must be a valid 6 character hex"),
        regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color"),
      ]),
    })
  ),
});

export function DeleteClassModal({
  onRequestClose,
  labelClass,
}: {
  onRequestClose?: () => void;
  labelClass: LabelClass | null;
}) {
  const currentProjectStore = useCurrentProjectStore(({ project }) => {
    return { project };
  });
  const currrentProjectFileStore = useCurrentProjectFileStore(
    ({ setLabels }) => {
      return { setLabels };
    }
  );
  const saveStore = useSaveStore(({ setPendingSavess }) => {
    return {
      setPendingSavess,
    };
  });
  const queryClient = useQueryClient();
  const deleteClassMut = useMutation({
    mutationFn: async () => {
      if (currentProjectStore.project === null) return;
      if (labelClass === null) return;
      await currentProjectStore.project.db.deleteClass(labelClass.id);
    },
    onSuccess: () => {
      if (labelClass === null) return;
      queryClient.setQueryData(
        asClassesQK(currentProjectStore.project?.projectPath),
        (classes: LabelClass[] | undefined) => {
          if (!classes) return [];
          return classes.filter((c) => c.id !== labelClass.id);
        }
      );
      currrentProjectFileStore.setLabels((labels) => {
        const newLabels = new Map();
        for (const [labelId, label] of labels) {
          if (label.class !== labelClass.id) {
            newLabels.set(labelId, label);
          }
        }
        return newLabels;
      });
      saveStore.setPendingSavess((pendingSavess) => {
        const newPendingSavess = new Map(pendingSavess);
        for (const [path, pendingSave] of pendingSavess) {
          newPendingSavess.set(path, {
            state: pendingSave.state.filter(
              (label) => label.class !== labelClass.id
            ),
            processQueue: pendingSave.processQueue,
          });
        }
        return newPendingSavess;
      });
      onRequestClose?.();
    },
  });
  return (
    <Dialog
      open={labelClass !== null}
      onOpenChange={(open) => {
        if (!open) {
          onRequestClose?.();
        }
      }}
    >
      {labelClass !== null && (
        <DialogContent className="max-w-md md:max-w-lg lg:max-w-xl">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription className="flex flex-row items-center gap-1">
              Are you sure you want to delete{" "}
              <span className="flex flex-row gap-1 items-center">
                <span
                  className="w-4 h-4 rounded-sm border border-gray-300 dark:border-gray-700"
                  style={{
                    backgroundColor: labelClass.color,
                  }}
                />{" "}
                <span className="text-foreground">{labelClass.name}</span>?
              </span>
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertDescription>
              Deleting this class will remove all associated labels. This action
              cannot be undone.
            </AlertDescription>
          </Alert>
          {deleteClassMut.error ? (
            <Alert variant="error">
              <AlertDescription>
                {resolveError(deleteClassMut.error)}
              </AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onMouseDown={onRequestClose}>
              Cancel
            </Button>
            <Button
              disabled={deleteClassMut.isPending}
              variant="destructive"
              onClick={() => {
                deleteClassMut.mutate();
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
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
  onRequestSave?: (classes: { name: string; color: string }[]) => void;
  error?: string | null;
  isPending?: boolean;
  mode: "create" | "edit";
}) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: valibotResolver(schema),
    shouldFocusError: false,
    defaultValues: {
      classes: [
        {
          name: "",
          color: colors[Math.floor(Math.random() * colors.length)],
        },
      ],
    },
  });
  const classesField = useFieldArray({
    control,
    name: "classes",
  });
  const numberOfClasses = classesField.fields.length;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          reset();
          classesField.remove();
          classesField.append({
            name: "",
            color: colors[Math.floor(Math.random() * colors.length)],
          });
        }
        setIsOpen(open);
      }}
    >
      <DialogContent className="max-w-md md:max-w-lg lg:max-w-xl">
        <form
          onSubmit={handleSubmit((data) => {
            onRequestSave?.(data.classes);
          })}
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
          <div className="flex flex-col gap-2 py-4">
            <div className="flex flex-row gap-2 w-full">
              <div className="flex-[2]">
                <span>Name</span>
              </div>
              <div className="flex-1">
                <span>Color</span>
              </div>
              <div className="w-6" />
            </div>
            {classesField.fields.length > 0 ? (
              <ul className="flex flex-col gap-4 w-full h-44 overflow-y-scroll p-1">
                {new Array(numberOfClasses).fill(null).map((_, i) => {
                  const cls = classesField.fields?.[i];
                  if (!cls) return null;

                  const nameError = errors.classes?.[i]?.name;
                  const colorError = errors.classes?.[i]?.color;

                  return (
                    <div key={cls.id} className="flex flex-col gap-2">
                      <div className="flex flex-row gap-2 w-full items-center justify-start">
                        <div className="w-full grid grid-cols-3 gap-2">
                          <label className="col-span-2 flex flex-col gap-2">
                            <Input
                              key={cls.id}
                              {...register(`classes.${i}.name`)}
                              // name="Name"
                              placeholder="Class Name (e.g. bus_number)"
                            />
                          </label>
                          <label className="col-span-1 flex flex-col gap-2">
                            <Controller
                              key={cls.id}
                              control={control}
                              name={`classes.${i}.color`}
                              render={({ field: { value, onChange } }) => {
                                // console.log(`${value}`);
                                return (
                                  <ColorPicker
                                    background={value}
                                    setBackground={onChange}
                                    className="w-full"
                                  />
                                );
                              }}
                            />
                          </label>
                        </div>

                        <div className="h-10 flex items-center justify-center">
                          <Button
                            className="w-6 h-6 p-1"
                            variant="ghost"
                            type="button"
                            onMouseDown={() => {
                              classesField.remove(i);
                            }}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                      {nameError && (
                        <p className="text-red-500">
                          {nameError.message || "Name is invalid"}
                        </p>
                      )}
                      {colorError && (
                        <p className="text-red-500">
                          {colorError.message || "Color is invalid"}
                        </p>
                      )}
                    </div>
                  );
                })}
              </ul>
            ) : (
              <div className="flex flex-col w-full h-44 items-center justify-center gap-1">
                <h3>No Class Added</h3>
                <p className="w-64 text-center text-gray-700 dark:text-gray-300">
                  Click the {'"'}Add{'"'} button to add a new class.
                </p>
              </div>
            )}

            <div>
              <Button
                onMouseDown={(e) => {
                  e.preventDefault();
                  classesField.append({
                    name: "",
                    color: colors[Math.floor(Math.random() * colors.length)],
                  });
                }}
                type="button"
                variant="secondary"
              >
                Add
              </Button>
            </div>
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

export function ClassList({ isPending }: { isPending?: boolean }) {
  const [createClassModalOpen, setCreateClassModalOpen] = useState<
    string | null
  >(null);
  const currentProjectStore = useCurrentProjectStore(
    ({ project, selectedClass, selectClass }) => {
      return {
        project,
        selectedClass,
        selectClass,
      };
    }
  );
  const queryClient = useQueryClient();
  const createClassMut = useMutation({
    mutationFn: async (classes: { name: string; color: string }[]) => {
      if (currentProjectStore.project === null) return;
      await currentProjectStore.project.db.addClasses(classes);
      const updatedClasses = await currentProjectStore.project.db.getClasses();
      queryClient.setQueryData(
        asClassesQK(currentProjectStore.project.projectPath),
        updatedClasses
      );
    },
    onSuccess: () => {
      setCreateClassModalOpen(null);
    },
  });
  const { classesQuery } = useLabelClasses(currentProjectStore.project);
  const parentRef = useRef(null);
  const classes = classesQuery.data ?? [];

  const rowVirtualizer = useVirtualizer({
    count: classes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // h-8
    overscan: 5,
  });
  const [deleteClassModalOpen, setDeleteClassModalOpen] =
    useState<LabelClass | null>(null);

  return (
    <>
      <CreateOrEditClassModal
        key={createClassModalOpen}
        isOpen={!!createClassModalOpen}
        setIsOpen={(isOpen) =>
          setCreateClassModalOpen(isOpen ? nanoid(12) : null)
        }
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
          onMouseDown={(e) => {
            e.preventDefault();
            setCreateClassModalOpen(nanoid(12));
          }}
          disabled={isPending}
        >
          <PlusIcon className="w-6 h-6" />
        </Button>
      </div>

      <div
        className="flex-1 flex flex-col gap-0 py-2 overflow-auto"
        ref={parentRef}
      >
        <ul
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {isPending
            ? new Array(5).fill(null).map((_, i) => (
                <li key={i} className="p-1">
                  <Skeleton className="w-full h-8" />
                </li>
              ))
            : rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const cls = classes[virtualRow.index];
                return (
                  <li
                    key={virtualRow.key}
                    className="group px-1 cursor-pointer h-8 w-full"
                    onMouseDown={() => currentProjectStore.selectClass(cls.id)}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <ContextMenu>
                      <ContextMenuTrigger>
                        <div
                          className={cn(
                            "h-full flex flex-row items-center justify-between gap-2 p-1 transition ease-in-out duration-200",
                            {
                              "bg-primary text-gray-50 dark:text-gray-950 rounded-sm":
                                cls.id === currentProjectStore.selectedClass,
                            }
                          )}
                        >
                          <div className="flex flex-row items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: cls.color }}
                            />
                            <p>{cls.name}</p>
                          </div>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-64">
                        <ContextMenuItem
                          onClick={() => {
                            setDeleteClassModalOpen(cls);
                          }}
                        >
                          Delete
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  </li>
                );
              })}
        </ul>
      </div>
      <DeleteClassModal
        onRequestClose={() => setDeleteClassModalOpen(null)}
        key={deleteClassModalOpen?.id}
        labelClass={deleteClassModalOpen}
      />
    </>
  );
}
