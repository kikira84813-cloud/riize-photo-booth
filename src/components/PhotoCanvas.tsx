"use client";

import Konva from "konva";
import { Image as KonvaImage, Layer, Rect, Stage, Group } from "react-konva";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { IdolTemplate } from "@/data/templates";
import { useImageElement } from "./useImageElement";

type Placement = {
  x: number;
  y: number;
  scale: number;
};

export type PhotoAdjustments = {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
};

function hasPhotoAdjustments(adjustments: PhotoAdjustments) {
  return adjustments.brightness !== 0 || adjustments.contrast !== 0 || adjustments.saturation !== 0 || adjustments.hue !== 0;
}

function buildCanvasFilter(adjustments: PhotoAdjustments) {
  const brightness = Math.max(0, 1 + adjustments.brightness);
  const contrast = Math.max(0, 1 + adjustments.contrast / 100);
  const saturation = Math.max(0, 1 + adjustments.saturation);
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) hue-rotate(${adjustments.hue}deg)`;
}
function clampChannel(value: number) {
  return Math.max(0, Math.min(255, value));
}

function hueToRgb(p: number, q: number, t: number) {
  let nextT = t;
  if (nextT < 0) nextT += 1;
  if (nextT > 1) nextT -= 1;
  if (nextT < 1 / 6) return p + (q - p) * 6 * nextT;
  if (nextT < 1 / 2) return q;
  if (nextT < 2 / 3) return p + (q - p) * (2 / 3 - nextT) * 6;
  return p;
}

function rgbToHsl(r: number, g: number, b: number) {
  const nextR = r / 255;
  const nextG = g / 255;
  const nextB = b / 255;
  const max = Math.max(nextR, nextG, nextB);
  const min = Math.min(nextR, nextG, nextB);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case nextR:
        h = (nextG - nextB) / d + (nextG < nextB ? 6 : 0);
        break;
      case nextG:
        h = (nextB - nextR) / d + 2;
        break;
      default:
        h = (nextR - nextG) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
  if (s === 0) {
    const gray = l * 255;
    return { r: gray, g: gray, b: gray };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hueToRgb(p, q, h + 1 / 3) * 255,
    g: hueToRgb(p, q, h) * 255,
    b: hueToRgb(p, q, h - 1 / 3) * 255
  };
}

function applyPixelAdjustments(ctx: CanvasRenderingContext2D, width: number, height: number, adjustments: PhotoAdjustments) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;
  const brightnessOffset = adjustments.brightness * 255;
  const contrast = Math.max(0, 1 + adjustments.contrast / 100);
  const saturation = Math.max(0, 1 + adjustments.saturation);
  const hueShift = adjustments.hue / 360;

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) {
      continue;
    }

    let r = clampChannel((data[index] - 128) * contrast + 128 + brightnessOffset);
    let g = clampChannel((data[index + 1] - 128) * contrast + 128 + brightnessOffset);
    let b = clampChannel((data[index + 2] - 128) * contrast + 128 + brightnessOffset);

    if (saturation !== 1 || hueShift !== 0) {
      const hsl = rgbToHsl(r, g, b);
      const shiftedHue = (hsl.h + hueShift + 1) % 1;
      const shiftedSaturation = Math.max(0, Math.min(1, hsl.s * saturation));
      const rgb = hslToRgb(shiftedHue, shiftedSaturation, hsl.l);
      r = rgb.r;
      g = rgb.g;
      b = rgb.b;
    }

    data[index] = clampChannel(r);
    data[index + 1] = clampChannel(g);
    data[index + 2] = clampChannel(b);
  }

  ctx.putImageData(imageData, 0, 0);
}
type PhotoCanvasProps = {
  template: IdolTemplate;
  userPhoto: string | null;
  placement: Placement;
  adjustments: PhotoAdjustments;
  onPlacementChange: (placement: Placement) => void;
  onReady: (stage: Konva.Stage | null) => void;
};

export function PhotoCanvas({
  template,
  userPhoto,
  placement,
  adjustments,
  onPlacementChange,
  onReady
}: PhotoCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ distance: number; center: { x: number; y: number }; placement: Placement } | null>(null);
  const [displayWidth, setDisplayWidth] = useState(720);
  const templateImage = useImageElement(template.file);
  const thumbnailImage = useImageElement(template.thumbnail);
  const maskImage = useImageElement(template.mask);
  const sourceUserImage = useImageElement(userPhoto);
  const [adjustedPhoto, setAdjustedPhoto] = useState<string | null>(null);
  const userImage = useImageElement(adjustedPhoto ?? userPhoto);

  const displayTemplateImage = templateImage ?? thumbnailImage;
  const templateReady = Boolean(templateImage && maskImage);
  const photoRenderKey = [
    template.id,
    userPhoto ? userPhoto.length : 0,
    adjustments.brightness,
    adjustments.contrast,
    adjustments.saturation,
    adjustments.hue,
    adjustedPhoto ? "adjusted" : "original"
  ].join("-");

  const size = useMemo(() => {
    const sourceImage = maskImage ?? templateImage ?? thumbnailImage;
    return {
      width: sourceImage?.naturalWidth ?? 1030,
      height: sourceImage?.naturalHeight ?? 681
    };
  }, [maskImage, templateImage, thumbnailImage]);

  const displayScale = displayWidth / size.width;
  const displayHeight = size.height * displayScale;

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) {
      return;
    }

    const syncWidth = () => {
      setDisplayWidth(Math.min(node.clientWidth, 720, size.width));
    };

    syncWidth();
    const resizeObserver = new ResizeObserver(syncWidth);
    resizeObserver.observe(node);

    return () => resizeObserver.disconnect();
  }, [size.width]);

  useEffect(() => {
    onReady(stageRef.current);
    return () => onReady(null);
  }, [onReady]);
  useEffect(() => {
    if (!sourceUserImage || !hasPhotoAdjustments(adjustments)) {
      setAdjustedPhoto(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    const frame = window.requestAnimationFrame(() => {
      const canvas = document.createElement("canvas");
      canvas.width = sourceUserImage.naturalWidth;
      canvas.height = sourceUserImage.naturalHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        setAdjustedPhoto(null);
        return;
      }

      const usePixelAdjustments = window.matchMedia("(max-width: 768px)").matches;
      ctx.filter = usePixelAdjustments ? "none" : buildCanvasFilter(adjustments);
      ctx.drawImage(sourceUserImage, 0, 0);
      ctx.filter = "none";

      if (usePixelAdjustments) {
        applyPixelAdjustments(ctx, canvas.width, canvas.height, adjustments);
      }
      canvas.toBlob(
        (blob) => {
          if (!blob || cancelled) {
            return;
          }

          objectUrl = URL.createObjectURL(blob);
          setAdjustedPhoto(objectUrl);
        },
        "image/jpeg",
        0.92
      );
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [template.id, sourceUserImage, adjustments.brightness, adjustments.contrast, adjustments.saturation, adjustments.hue]);
  useLayoutEffect(() => {
    if (!sourceUserImage || !templateReady) {
      return;
    }

    const slot = {
      x: template.slot.x * size.width,
      y: template.slot.y * size.height,
      width: template.slot.width * size.width,
      height: template.slot.height * size.height
    };
    const nextScale = Number(Math.min(slot.width / sourceUserImage.naturalWidth, slot.height / sourceUserImage.naturalHeight).toFixed(3));
    onPlacementChange({
      x: slot.x + (slot.width - sourceUserImage.naturalWidth * nextScale) / 2,
      y: slot.y + (slot.height - sourceUserImage.naturalHeight * nextScale) / 2,
      scale: nextScale
    });
  }, [template.id, sourceUserImage, templateReady, size.width, size.height, onPlacementChange]);


  const getTouchInfo = (event: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = event.evt.touches;
    if (touches.length < 2 || !stageRef.current) {
      return null;
    }

    const rect = stageRef.current.container().getBoundingClientRect();
    const first = touches[0];
    const second = touches[1];
    const center = {
      x: ((first.clientX + second.clientX) / 2 - rect.left) / displayScale,
      y: ((first.clientY + second.clientY) / 2 - rect.top) / displayScale
    };
    const distance = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);

    return { center, distance };
  };

  const handleTouchStart = (event: Konva.KonvaEventObject<TouchEvent>) => {
    const info = getTouchInfo(event);
    if (!info) {
      pinchRef.current = null;
      return;
    }

    event.evt.preventDefault();
    pinchRef.current = { ...info, placement };
  };

  const handleTouchMove = (event: Konva.KonvaEventObject<TouchEvent>) => {
    const start = pinchRef.current;
    const info = getTouchInfo(event);
    if (!start || !info) {
      return;
    }

    event.evt.preventDefault();
    const nextScale = Math.min(3.5, Math.max(0.05, start.placement.scale * (info.distance / start.distance)));
    const nextX = info.center.x - (start.center.x - start.placement.x) * (nextScale / start.placement.scale);
    const nextY = info.center.y - (start.center.y - start.placement.y) * (nextScale / start.placement.scale);

    onPlacementChange({ x: nextX, y: nextY, scale: Number(nextScale.toFixed(3)) });
  };

  const handleTouchEnd = (event: Konva.KonvaEventObject<TouchEvent>) => {
    if (event.evt.touches.length < 2) {
      pinchRef.current = null;
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-[760px]">
      <div ref={wrapperRef} className="mx-auto w-[62%] max-w-[720px] sm:w-full">
      <div className="relative overflow-hidden rounded-[3px] border border-black bg-white shadow-sticker">
        <Stage
          ref={stageRef}
          width={displayWidth}
          height={displayHeight}
          className="block touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Layer scaleX={displayScale} scaleY={displayScale}>
            <Rect width={size.width} height={size.height} fill="#fff" />
            {displayTemplateImage ? <KonvaImage image={displayTemplateImage} width={size.width} height={size.height} /> : null}
          </Layer>
          <Layer scaleX={displayScale} scaleY={displayScale}>
            {userImage && maskImage && templateReady ? (
              <Group key={`photo-layer-${photoRenderKey}`}>
                <KonvaImage
                  key={`photo-${photoRenderKey}`}
                  image={userImage}
                  x={placement.x}
                  y={placement.y}
                  scaleX={placement.scale}
                  scaleY={placement.scale}
                  draggable
                  onDragEnd={(event) => {
                    onPlacementChange({
                      ...placement,
                      x: event.target.x(),
                      y: event.target.y()
                    });
                  }}
                />
                <KonvaImage
                  key={`mask-${template.id}`}
                  image={maskImage}
                  width={size.width}
                  height={size.height}
                  listening={false}
                  globalCompositeOperation="destination-in"
                />
              </Group>
            ) : null}
          </Layer>
          <Layer scaleX={displayScale} scaleY={displayScale}>
            {templateImage ? <KonvaImage image={templateImage} width={size.width} height={size.height} listening={false} /> : null}
          </Layer>
        </Stage>
      </div>
      </div>
    </div>
  );
}
