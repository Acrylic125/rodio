import { QueryKey } from "@tanstack/react-query";

export type PartialQueryKey = string | string[];

export const ImagesQueryKey = "images" satisfies PartialQueryKey;

export function isKeyStartingWith(
  queryKey: QueryKey,
  startingWith: PartialQueryKey
) {
  if (typeof startingWith === "string") {
    if (queryKey.length === 0) return false;
    return queryKey[0] === startingWith;
  }
  return startingWith.every((key, index) => queryKey[index] === key);
}
