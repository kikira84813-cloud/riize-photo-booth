"use client";

import Konva from "konva";
import { Image as KonvaImage, Layer, Rect, Stage, Group } from "react-konva";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const userImageRef = useRef<Konva.Image>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ distance: number; center: { x: number; y: number }; placement: Placement } | null>(null);
  const [displayWidth, setDisplayWidth] = useState(720);
  const templateImage = useImageElement(template.file);
  const maskImage = useImageElement(template.mask);
  const overlayImage = useImageElement(template.overlay);
  const userImage = useImageElement(userPhoto);

  const size = useMemo(() => {
    return {
      width: templateImage?.naturalWidth ?? 1030,
      height: templateImage?.naturalHeight ?? 681
    };
  }, [templateImage]);

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
    const imageNode = userImageRef.current;
    if (!imageNode || !userImage) {
      return;
    }

    const cachePixelRatio = window.matchMedia("(max-width: 768px)").matches ? 1 : 2;
    imageNode.cache({ pixelRatio: cachePixelRatio });
    imageNode.getLayer()?.batchDraw();

    return () => {
      imageNode.clearCache();
    };
  }, [userImage]);

  useEffect(() => {
    if (!userImage) {
      return;
    }

    const slot = {
      x: template.slot.x * size.width,
      y: template.slot.y * size.height,
      width: template.slot.width * size.width,
      height: template.slot.height * size.height
    };
    const nextScale = Number(Math.min(slot.width / userImage.naturalWidth, slot.height / userImage.naturalHeight).toFixed(3));
    onPlacementChange({
      x: slot.x + (slot.width - userImage.naturalWidth * nextScale) / 2,
      y: slot.y + (slot.height - userImage.naturalHeight * nextScale) / 2,
      scale: nextScale
    });
  }, [template.id, userImage, size.width, size.height, onPlacementChange]);


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
      <div ref={wrapperRef} className="mx-auto w-full max-w-[720px]">
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
            {templateImage ? <KonvaImage image={templateImage} width={size.width} height={size.height} /> : null}
          </Layer>
          <Layer scaleX={displayScale} scaleY={displayScale}>
            {userImage && maskImage ? (
              <Group>
                <KonvaImage
                  ref={userImageRef}
                  image={userImage}
                  filters={[Konva.Filters.Brighten, Konva.Filters.Contrast, Konva.Filters.HSL]}
                  brightness={adjustments.brightness}
                  contrast={adjustments.contrast}
                  saturation={adjustments.saturation}
                  hue={adjustments.hue}
                  luminance={0}
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
            {overlayImage ? <KonvaImage image={overlayImage} width={size.width} height={size.height} listening={false} /> : null}
          </Layer>
        </Stage>
      </div>
      </div>
    </div>
  );
}

