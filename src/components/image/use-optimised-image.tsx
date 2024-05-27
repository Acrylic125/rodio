import { imageOptimiser } from "@/commands/image-optimiser";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type ImageResizeThreshold =
  | "VerySmall"
  | "Small"
  | "Medium"
  | "Large"
  | "VeryLarge";

interface ThresholdPreset {
  desiredValue: number;
  prefix: string;
}

const thresholds: { [key in ImageResizeThreshold]: ThresholdPreset } = {
  VerySmall: { desiredValue: 240, prefix: "very_small" },
  Small: { desiredValue: 480, prefix: "small" },
  Medium: { desiredValue: 640, prefix: "medium" },
  Large: { desiredValue: 1080, prefix: "large" },
  VeryLarge: { desiredValue: 1440, prefix: "very_large" },
};

function getThreshold(width: number, height: number): ImageResizeThreshold {
  const max = Math.max(width, height);
  if (max <= thresholds.VerySmall.desiredValue) return "VerySmall";
  if (max <= thresholds.Small.desiredValue) return "Small";
  if (max <= thresholds.Medium.desiredValue) return "Medium";
  if (max <= thresholds.Large.desiredValue) return "Large";
  return "VeryLarge";
}

export function useOptimisedImage(
  ref: React.RefObject<HTMLImageElement>,
  src: string,
  cacheDir: string = "",
  scope: string = ""
) {
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];

      const target = entry.target;
      if (!(target instanceof HTMLImageElement)) return;
      const bb = target.getBoundingClientRect();
      setImageSize({
        width: bb.width,
        height: bb.height,
      });
    });
    resizeObserver.observe(ref.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, [ref.current, setImageSize]);

  const query = useQuery({
    queryKey: [`image-${scope}`, src],
    queryFn: async () => {
      if (!imageSize) return;
      if (cacheDir === "") throw new Error("Cache directory not set");
      return imageOptimiser(src, imageSize.width, imageSize.height, cacheDir);
    },
    enabled: !!imageSize,
  });
  const threshold = imageSize
    ? getThreshold(imageSize.width, imageSize.height)
    : null;
  useEffect(() => {
    if (!threshold) return;
    query.refetch();
  }, [threshold, query.refetch]);

  return query;
}
