"use client";

import { useEffect, useState } from "react";

export function useImageElement(src?: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    setImage(null);

    let cancelled = false;
    const nextImage = new window.Image();
    nextImage.crossOrigin = "anonymous";
    nextImage.onload = () => {
      if (!cancelled) {
        setImage(nextImage);
      }
    };
    nextImage.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return image;
}

