import { QueryKey } from "@tanstack/react-query";

export type PartialQueryKey = string | string[];

export const ImagesQueryKey = "images" satisfies PartialQueryKey;
export const LabelClassesQueryKey = "classes" satisfies PartialQueryKey;

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
