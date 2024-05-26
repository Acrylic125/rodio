import { useCallback, useEffect, useRef, useState } from "react";

export function useImageContainer() {
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageContainerSize, setImageContainerSize] = useState({
    width: 0,
    height: 0,
  });
  const updateContainerSize = useCallback((target: HTMLImageElement) => {
    const bb = target.getBoundingClientRect();
    const size = {
      width: bb.width,
      height: bb.height,
    };
    const imgAspectRatio =
      target.naturalHeight > 0 ? target.naturalWidth / target.naturalHeight : 0;
    const containerAspectRatio = size.height > 0 ? size.width / size.height : 0;
    // W = container width
    // H = container height
    // w = image width
    // h = image height
    // IMPORTANT! The image resolution DOES NOT EQUAL TO THE space used by the image element.

    // If w/h < W/H, then we have to add padding, x, to the width
    // (Hw/h - W) / -2 = x
    if (imgAspectRatio < containerAspectRatio) {
      const padX = (size.height * imgAspectRatio - size.width) / -2;
      size.width = size.width - padX * 2;
    }
    // Otherwise,
    // (wH - Wh) / 2w = y
    else {
      let padY = 0;
      if (target.naturalWidth > 0) {
        padY =
          (target.naturalWidth * size.height -
            size.width * target.naturalHeight) /
          (2 * target.naturalWidth);
      }
      size.height = size.height - padY * 2;
    }
    setImageContainerSize(size);
  }, []);
  useEffect(() => {
    if (!imageRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];

      const target = entry.target;
      if (!(target instanceof HTMLImageElement)) return;
      updateContainerSize(target);
    });
    resizeObserver.observe(imageRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, [imageRef.current, updateContainerSize]);
  return {
    imageRef,
    imageContainerSize,
    updateContainerSize,
  };
}
