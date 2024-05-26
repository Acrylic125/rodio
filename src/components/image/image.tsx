import { imageOptimiser } from "@/commands/image-optimiser";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function useOptimisedImage(
  ref: React.RefObject<HTMLImageElement>,
  src: string
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

  return useQuery({
    queryKey: ["image", src],
    queryFn: async () => {
      if (!imageSize) return;
      return imageOptimiser(src, imageSize.width, imageSize.height);
    },
    enabled: !!imageSize,
  });
}
