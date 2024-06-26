import { QueryKey } from "@tanstack/react-query";

export type PartialQueryKey = string | string[];

export function asImagesQK(projectPath?: string | null, filter?: string) {
  if (filter === undefined)
    return ["images", projectPath ?? ""] satisfies PartialQueryKey;
  return ["images", projectPath ?? "", filter ?? ""] satisfies PartialQueryKey;
}

export function asClassesQK(projectPath?: string | null) {
  return ["classes", projectPath ?? ""] satisfies PartialQueryKey;
}

export function isKeyStartingWith(
  queryKey: QueryKey,
  startingWith: PartialQueryKey
) {
  if (queryKey.length < startingWith.length) return false;

  if (typeof startingWith === "string") {
    if (queryKey.length === 0) return false;
    return queryKey[0] === startingWith;
  }
  return startingWith.every((key, index) => queryKey[index] === key);
}

export function isKeyStartingWithAnd(
  queryKey: QueryKey,
  startingWith: PartialQueryKey,
  and: PartialQueryKey
) {
  let offsetCheckIndex =
    typeof startingWith === "string" ? 1 : startingWith.length;
  if (queryKey.length < offsetCheckIndex + and.length) return false;
  if (!isKeyStartingWith(queryKey, startingWith)) return false;

  if (typeof and === "string") {
    return queryKey[offsetCheckIndex] === and;
  }
  return and.every((key, index) => queryKey[offsetCheckIndex + index] === key);
}
