"use client";

import { useEffect, useState } from "react";

const loadedImages = new Map<string, HTMLImageElement>();
const loadingImages = new Map<string, Promise<HTMLImageElement>>();

function loadImage(src: string) {
  const cached = loadedImages.get(src);
  if (cached) {
    return Promise.resolve(cached);
  }

  const pending = loadingImages.get(src);
  if (pending) {
    return pending;
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new window.Image();
    nextImage.crossOrigin = "anonymous";
    nextImage.decoding = "async";
    nextImage.onload = () => {
      loadedImages.set(src, nextImage);
      loadingImages.delete(src);
      resolve(nextImage);
    };
    nextImage.onerror = () => {
      loadingImages.delete(src);
      reject(new Error(`Image failed to load: ${src}`));
    };
    nextImage.src = src;
  });

  loadingImages.set(src, promise);
  return promise;
}

export function useImageElement(src?: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(() => (src ? loadedImages.get(src) ?? null : null));

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }

    const cached = loadedImages.get(src);
    if (cached) {
      setImage(cached);
      return;
    }

    setImage(null);
    let cancelled = false;

    loadImage(src)
      .then((nextImage) => {
        if (!cancelled) {
          setImage(nextImage);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setImage(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return image;
}
