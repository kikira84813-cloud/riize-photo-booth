"use client";

import Konva from "konva";
import { Image as KonvaImage, Layer, Rect, Stage } from "react-konva";
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
  const renderedPhotoRef = useRef<Konva.Image>(null);
  const renderCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ distance: number; center: { x: number; y: number }; placement: Placement } | null>(null);
  const [displayWidth, setDisplayWidth] = useState(720);
  const [renderedPhotoCanvas, setRenderedPhotoCanvas] = useState<HTMLCanvasElement | null>(null);
  const templateImage = useImageElement(template.file);
  const thumbnailImage = useImageElement(template.thumbnail);
  const maskImage = useImageElement(template.mask);
  const sourceUserImage = useImageElement(userPhoto);

  const displayTemplateImage = templateImage ?? thumbnailImage;
  const templateReady = Boolean(templateImage && maskImage);

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
    if (!sourceUserImage || !maskImage || !templateReady) {
      setRenderedPhotoCanvas(null);
      return;
    }

    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      const canvas = renderCanvasRef.current ?? document.createElement("canvas");
      if (canvas.width !== size.width || canvas.height !== size.height) {
        canvas.width = size.width;
        canvas.height = size.height;
      }
      renderCanvasRef.current = canvas;
      const ctx = canvas.getContext("2d");

      if (!ctx || cancelled) {
        return;
      }

      ctx.clearRect(0, 0, size.width, size.height);
      ctx.filter = hasPhotoAdjustments(adjustments) ? buildCanvasFilter(adjustments) : "none";
      ctx.drawImage(
        sourceUserImage,
        placement.x,
        placement.y,
        sourceUserImage.naturalWidth * placement.scale,
        sourceUserImage.naturalHeight * placement.scale
      );
      ctx.filter = "none";
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(maskImage, 0, 0, size.width, size.height);
      ctx.globalCompositeOperation = "source-over";
      setRenderedPhotoCanvas((current) => current ?? canvas);
      renderedPhotoRef.current?.getLayer()?.batchDraw();
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [
    template.id,
    sourceUserImage,
    maskImage,
    templateReady,
    size.width,
    size.height,
    placement.x,
    placement.y,
    placement.scale,
    adjustments.brightness,
    adjustments.contrast,
    adjustments.saturation,
    adjustments.hue
  ]);

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
              {renderedPhotoCanvas && templateReady ? (
                <KonvaImage
                  ref={renderedPhotoRef}
                  image={renderedPhotoCanvas}
                  width={size.width}
                  height={size.height}
                  listening={false}
                />
              ) : null}
              {sourceUserImage && templateReady ? (
                <Rect
                  key={`photo-drag-${template.id}`}
                  x={placement.x}
                  y={placement.y}
                  width={sourceUserImage.naturalWidth * placement.scale}
                  height={sourceUserImage.naturalHeight * placement.scale}
                  fill="rgba(0,0,0,0)"
                  draggable
                  onDragMove={(event) => {
                    onPlacementChange({
                      ...placement,
                      x: event.target.x(),
                      y: event.target.y()
                    });
                  }}
                  onDragEnd={(event) => {
                    onPlacementChange({
                      ...placement,
                      x: event.target.x(),
                      y: event.target.y()
                    });
                  }}
                />
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
