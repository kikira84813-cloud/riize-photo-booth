"use client";

import dynamic from "next/dynamic";
import type Konva from "konva";
import {
  Camera,
  Download,
  Folder,
  ImagePlus,
  Monitor,
  RefreshCcw,
  Upload
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { templates } from "@/data/templates";
import { WindowFrame } from "@/components/WindowFrame";
import type { PhotoAdjustments } from "@/components/PhotoCanvas";

const PhotoCanvas = dynamic(() => import("@/components/PhotoCanvas").then((mod) => mod.PhotoCanvas), {
  ssr: false
});

type Placement = {
  x: number;
  y: number;
  scale: number;
};

const defaultPhotoAdjustments: PhotoAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0
};

const filterPresets: Array<{ name: string; adjustments: PhotoAdjustments }> = [
  {
    name: "Y2K Dream",
    adjustments: { brightness: 0.2, contrast: -10, saturation: 0.06, hue: -6 }
  },
  {
    name: "Soft Angel",
    adjustments: { brightness: 0.12, contrast: -16, saturation: -0.16, hue: 5 }
  },
  {
    name: "Cyber Blue",
    adjustments: { brightness: 0.07, contrast: 14, saturation: 0.08, hue: -8 }
  },
  {
    name: "Warm Flash",
    adjustments: { brightness: 0.22, contrast: 2, saturation: -0.06, hue: 9 }
  }
];

const adjustmentControls: Array<{
  key: keyof PhotoAdjustments;
  label: string;
  min: number;
  max: number;
  step: number;
  display: (value: number) => string;
}> = [
  { key: "brightness", label: "Brightness", min: -0.35, max: 0.45, step: 0.01, display: (value) => `${Math.round(value * 100)}%` },
  { key: "contrast", label: "Contrast", min: -60, max: 70, step: 1, display: (value) => `${value}` },
  { key: "saturation", label: "Saturation", min: -1, max: 0.8, step: 0.01, display: (value) => `${Math.round(value * 100)}%` },
  { key: "hue", label: "Hue", min: -180, max: 360, step: 1, display: (value) => `${value}deg` }
];

const initialPlacement: Placement = { x: 0, y: 0, scale: 1 };

const MAX_PHOTO_SIDE = 1600;

function loadPhotoImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Photo failed to load."));
    image.src = src;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.9): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Photo export failed."));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Photo conversion failed."));
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

async function normalizeUserPhoto(src: string) {
  const image = await loadPhotoImage(src);
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(image.naturalWidth, image.naturalHeight));

  if (scale === 1 && src.startsWith("data:image/jpeg")) {
    return src;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return src;
  }

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvasToJpeg(canvas);
}
export default function Home() {
  const [selectedId, setSelectedId] = useState(templates[0].id);
  const [photo, setPhoto] = useState<string | null>(null);
  const [placement, setPlacement] = useState<Placement>(initialPlacement);
  const [photoAdjustments, setPhotoAdjustments] = useState<PhotoAdjustments>(defaultPhotoAdjustments);
  const [activeTab, setActiveTab] = useState<"template" | "photo" | "export">("template");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [downloadNote, setDownloadNote] = useState("");
  const [stage, setStage] = useState<Konva.Stage | null>(null);
  const [showLoading, setShowLoading] = useState(true);
  const [loadingLeaving, setLoadingLeaving] = useState(false);
  const photoAdjustmentsRef = useRef<PhotoAdjustments>(defaultPhotoAdjustments);
  const adjustmentFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const selectedTemplate = useMemo(() => {
    return templates.find((template) => template.id === selectedId) ?? templates[0];
  }, [selectedId]);

  const updatePlacement = useCallback((nextPlacement: Placement) => {
    setPlacement(nextPlacement);
  }, []);


  useEffect(() => {
    photoAdjustmentsRef.current = photoAdjustments;
  }, [photoAdjustments]);

  useEffect(() => {
    return () => {
      if (adjustmentFrameRef.current !== null) {
        window.cancelAnimationFrame(adjustmentFrameRef.current);
      }
    };
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    const leaveTimer = window.setTimeout(() => setLoadingLeaving(true), 1800);
    const removeTimer = window.setTimeout(() => setShowLoading(false), 2300);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);
  useEffect(() => {
    if (!cameraOpen) {
      stopCamera();
      return;
    }

    let cancelled = false;
    setCameraError("");

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => {
        setCameraError("Camera permission was blocked.");
      });

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [cameraOpen, stopCamera]);

  const handleUpload = (file?: File) => {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const nextPhoto = String(reader.result);
      setPlacement(initialPlacement);
      try {
        setPhoto(await normalizeUserPhoto(nextPhoto));
      } catch {
        setPhoto(nextPhoto);
      }
      setActiveTab("photo");
    };
    reader.readAsDataURL(file);
  };
  const captureCamera = async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const nextPhoto = canvas.toDataURL("image/jpeg", 0.92);
    setPlacement(initialPlacement);
    try {
      setPhoto(await normalizeUserPhoto(nextPhoto));
    } catch {
      setPhoto(nextPhoto);
    }
    setCameraOpen(false);
    setActiveTab("photo");
  };

  const resetPhoto = () => {
    setPlacement(initialPlacement);
    setPhoto(null);
  };
  const updatePhotoAdjustment = (key: keyof PhotoAdjustments, value: number) => {
    const nextAdjustments = { ...photoAdjustmentsRef.current, [key]: value };
    photoAdjustmentsRef.current = nextAdjustments;
    setPhotoAdjustments(nextAdjustments);
  };

  const applyPhotoAdjustments = (nextAdjustments: PhotoAdjustments) => {
    photoAdjustmentsRef.current = nextAdjustments;
    setPhotoAdjustments(nextAdjustments);
  };

  const resetPhotoAdjustments = () => {
    applyPhotoAdjustments(defaultPhotoAdjustments);
  };

  const exportJpg = () => {
    if (!stage) {
      return;
    }
    const uri = stage.toDataURL({ pixelRatio: 2, mimeType: "image/jpeg", quality: 0.92 });
    const link = document.createElement("a");
    link.download = `${selectedTemplate.id}-photo-booth.jpg`;
    link.href = uri;
    link.click();
    setDownloadNote("Downloaded JPG to your browser.");
    window.setTimeout(() => setDownloadNote(""), 2400);
  };

  return (
    <main className="scanlines min-h-screen overflow-x-hidden bg-[#fffdf0] text-black">
      {showLoading ? (
        <div
          className={`loading-overlay ${loadingLeaving ? "loading-overlay--leaving" : ""}`}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: 24,
            backgroundColor: "#fff"
          }}
          aria-live="polite"
          aria-label="riize photo booth loading"
        >
          <div className="loading-window">
            <div className="loading-window__bar">
              <span>riize.kr</span>
              <span className="loading-window__dot" />
            </div>
            <div className="loading-booth" aria-hidden="true">
              <svg viewBox="0 0 168 188" role="img">
                <defs>
                  <linearGradient id="boothSilver" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="0.35" stopColor="#d9e5ec" />
                    <stop offset="0.7" stopColor="#fff7d8" />
                    <stop offset="1" stopColor="#aab7be" />
                  </linearGradient>
                  <linearGradient id="boothBlue" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#eefaff" />
                    <stop offset="1" stopColor="#b9dce8" />
                  </linearGradient>
                  <linearGradient id="boothCurtain" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0" stopColor="#8f3034" />
                    <stop offset="0.5" stopColor="#c78380" />
                    <stop offset="1" stopColor="#7d2b31" />
                  </linearGradient>
                </defs>
                <path d="M34 176 H139" stroke="#6f777b" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
                <rect x="33" y="39" width="101" height="135" rx="7" fill="url(#boothSilver)" stroke="#383f43" strokeWidth="2.5" />
                <rect x="42" y="20" width="84" height="30" rx="4" fill="#fffdf0" stroke="#383f43" strokeWidth="2.5" />
                <rect x="47" y="25" width="74" height="20" rx="2" fill="url(#boothBlue)" stroke="#8bb9c8" strokeWidth="1" />
                <text x="84" y="39" textAnchor="middle" fontSize="16" fontFamily="Arial Black, Arial" fill="#34383b">PHOTOS</text>
                <rect x="45" y="59" width="45" height="104" rx="2" fill="#f8fcff" stroke="#545f65" strokeWidth="1.8" />
                <rect x="51" y="68" width="32" height="22" fill="#d9e5ec" stroke="#8a969c" strokeWidth="1.2" />
                <rect x="55" y="98" width="24" height="42" rx="1" fill="#1f2528" opacity="0.8" />
                <circle cx="67" cy="119" r="8" fill="#fffaf0" opacity="0.9" />
                <rect x="58" y="145" width="19" height="6" rx="1" fill="#363c40" />
                <rect x="96" y="59" width="27" height="104" rx="2" fill="url(#boothCurtain)" stroke="#533033" strokeWidth="1.6" />
                <path d="M106 61 C101 89 101 132 107 161" fill="none" stroke="#edd0c8" strokeWidth="1.6" opacity="0.7" />
                <path d="M116 61 C111 92 111 130 116 161" fill="none" stroke="#f4ddd5" strokeWidth="1.2" opacity="0.55" />
                <rect x="124" y="64" width="5" height="96" rx="2" fill="#eef7fb" opacity="0.72" />
                <g transform="rotate(-8 98 139)">
                  <rect x="83" y="119" width="23" height="47" rx="2" fill="#fffdf7" stroke="#59656b" strokeWidth="1.3" />
                  <rect x="87" y="124" width="15" height="10" fill="#d9e5ec" />
                  <rect x="87" y="137" width="15" height="10" fill="#d9e5ec" />
                  <rect x="87" y="150" width="15" height="10" fill="#d9e5ec" />
                </g>
                <circle cx="45" cy="54" r="3" fill="#fff7c9" stroke="#7d8589" strokeWidth="1" />
                <circle cx="123" cy="54" r="3" fill="#fff7c9" stroke="#7d8589" strokeWidth="1" />
              </svg>
            </div>
            <div className="loading-copy">riize photo booth loading...</div>
            <div className="loading-pixels" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      ) : null}
      <div className={`app-shell ${showLoading ? "app-shell--loading" : ""}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          handleUpload(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      <div className="desktop-grid relative min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(255,62,165,.16),transparent_30%),radial-gradient(circle_at_78%_18%,rgba(64,211,210,.18),transparent_26%),linear-gradient(135deg,#fffdf0,#f5f8ff_48%,#fff5fb)]">
        <header className="fixed left-0 right-0 top-0 z-30 flex h-10 items-center justify-between border-b border-black bg-white px-4 font-pixel text-sm">
          <div className="flex items-center gap-2 font-bold">
            <Monitor size={16} />
            riize.kr
          </div>
          <div className="hidden items-center gap-5 sm:flex">
            <span>September 4, 2023</span>
          </div>
        </header>

        <div className="pointer-events-none absolute left-8 top-20 hidden rotate-[-5deg] border border-black bg-[#a6ff63] px-3 py-1 font-pixel text-xl font-bold shadow-sticker md:block">
          PHOTO BOOTH
        </div>
        <div className="pointer-events-none absolute bottom-10 left-12 hidden border border-black bg-white px-4 py-2 font-pixel text-sm shadow-sticker lg:block">
          LOCAL IMAGE EDITOR
        </div>
        <div className="absolute right-8 top-20 hidden text-center font-pixel text-xs md:block">
          <div className="mx-auto grid h-16 w-20 place-items-center rounded-t-lg border border-black bg-[#b678ff] shadow-sticker">
            <Folder fill="white" strokeWidth={1.5} />
          </div>
          <div className="mt-2 text-[#29c145]">Templates</div>
        </div>

        <div className="relative z-10 grid min-h-screen gap-4 px-3 pb-4 pt-14 lg:grid-cols-[330px_minmax(0,1fr)_300px]">
          <WindowFrame
            title="Templates"
            className="order-1 h-[310px] lg:order-1 lg:h-[calc(100vh-5rem)]"
            bodyClassName="h-[calc(100%-2rem)] overflow-y-auto p-4"
          >
            <div className="grid grid-cols-3 gap-x-4 gap-y-5 sm:grid-cols-4 lg:grid-cols-3">
              {templates.map((template, index) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedId(template.id);
                    setActiveTab(photo ? "photo" : "template");
                  }}
                  className={`group min-w-0 rounded p-1 text-center font-pixel text-[11px] ${
                    selectedId === template.id ? "bg-[#b7ff73] outline outline-2 outline-black" : "hover:bg-[#f1f1f1]"
                  }`}
                >
                  <div className="mx-auto mb-1 h-11 w-14 overflow-hidden border border-black bg-white shadow-[2px_2px_0_rgba(0,0,0,.28)]">
                    <img src={template.thumbnail} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  </div>
                    <span className="block truncate">{`Template ${String(index + 1).padStart(2, "0")}`}</span>
                </button>
              ))}
            </div>
          </WindowFrame>

          <WindowFrame
            title="Photo Booth"
            className="order-2 self-start lg:order-2 lg:h-[calc(100vh-5rem)]"
            bodyClassName="bg-[#e9e9e9] p-2 sm:p-6 lg:h-[calc(100%-2rem)] lg:overflow-y-auto"
          >
            <div className="mb-2 flex items-center justify-between gap-2 sm:mb-4 sm:gap-3">
              <div className="h-10 w-10" aria-hidden="true" />
              <div className="font-pixel text-xs sm:text-sm">
                {selectedTemplate.name} {photo ? "/ Drag photo" : "/ Add photo"}
              </div>
              <button
                onClick={exportJpg}
                className="grid h-10 w-10 place-items-center rounded-full bg-black text-white shadow-sticker disabled:opacity-40"
                disabled={!photo}
                aria-label="Download JPG"
              >
                <Download size={19} />
              </button>
            </div>

            <PhotoCanvas
              template={selectedTemplate}
              userPhoto={photo}
              placement={placement}
              adjustments={photoAdjustments}
              onPlacementChange={updatePlacement}
              onReady={setStage}
            />

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:mt-5 sm:gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-black px-4 font-pixel text-xs text-white shadow-sticker sm:h-11 sm:px-5 sm:text-sm"
              >
                <Upload size={18} />
                Upload
              </button>
              <button
                onClick={() => setCameraOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-black bg-white px-4 font-pixel text-xs shadow-sticker sm:h-11 sm:px-5 sm:text-sm"
              >
                <Camera size={18} />
                Camera
              </button>
              <button
                onClick={exportJpg}
                disabled={!photo}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#a6ff63] px-4 font-pixel text-xs shadow-sticker disabled:opacity-40 sm:h-11 sm:px-5 sm:text-sm"
              >
                <Download size={18} />
                JPG
              </button>
            </div>

            <div className="mt-3 space-y-2 border-t border-black/20 pt-3 sm:hidden">
              <label className="block border border-black bg-[#f3f3f3] p-2 font-pixel text-[11px]">
                <span className="flex items-center justify-between gap-3">
                  <span>Scale</span>
                  <span>{Math.round(placement.scale * 100)}%</span>
                </span>
                <input
                  className="range-retro mt-1 w-full"
                  type="range"
                  min="0.05"
                  max="3.5"
                  step="0.01"
                  value={placement.scale}
                  disabled={!photo}
                  onChange={(event) => setPlacement((current) => ({ ...current, scale: Number(event.target.value) }))}
                />
              </label>
              <div className="border border-black bg-[#fffdf0] p-2 font-pixel text-[11px]">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span>Filter Presets</span>
                  <button
                    type="button"
                    onClick={resetPhotoAdjustments}
                    disabled={!photo}
                    className="border border-black bg-white px-2 py-1 text-[10px] disabled:opacity-40"
                  >
                    Reset
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {filterPresets.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPhotoAdjustments(preset.adjustments)}
                      disabled={!photo}
                      className="min-h-8 border border-black bg-white px-1 py-1 text-[9px] shadow-[1px_1px_0_rgba(0,0,0,.18)] disabled:opacity-40"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 border border-black bg-white p-2 font-pixel text-[10px]">
                {adjustmentControls.map((control) => (
                  <label key={control.key} className="block">
                    <span className="mb-1 flex items-center justify-between gap-2">
                      <span>{control.label}</span>
                      <span>{control.display(photoAdjustments[control.key])}</span>
                    </span>
                    <input
                      className="range-retro w-full touch-pan-y"
                      type="range"
                      min={control.min}
                      max={control.max}
                      step={control.step}
                      value={photoAdjustments[control.key]}
                      disabled={!photo}
                      onChange={(event) => updatePhotoAdjustment(control.key, Number(event.target.value))}
                    />
                  </label>
                ))}
              </div>
              <button
                onClick={resetPhoto}
                className="flex h-9 w-full items-center justify-center gap-2 border border-black bg-white font-pixel text-[11px]"
              >
                <RefreshCcw size={15} />
                Reset Photo
              </button>
            </div>
          </WindowFrame>

          <WindowFrame title="CREATE" className="hidden order-3 self-start sm:block lg:h-[calc(100vh-5rem)]" bodyClassName="bg-white lg:h-[calc(100%-2rem)] lg:overflow-y-auto">
            <div className="grid grid-cols-3 border-b border-black font-pixel text-xs font-bold">
              {(["template", "photo", "export"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`h-11 uppercase ${activeTab === tab ? "bg-black text-white" : "bg-white hover:bg-[#eeeeee]"}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="space-y-3 p-3 sm:space-y-4 sm:p-5">
              {activeTab === "template" ? (
                <>
                  <div className="border border-black bg-[#fffdf0] p-2 font-pixel text-xs sm:p-3">
                    Selected file
                    <div className="mt-1 font-sans text-lg font-bold">{selectedTemplate.name}</div>
                  </div>
                  <img src={selectedTemplate.thumbnail} alt="" loading="lazy" decoding="async" className="aspect-[3/2] w-full border border-black bg-white object-contain" />
                  <button
                    onClick={() => setActiveTab("photo")}
                    className="flex h-11 w-full items-center justify-center gap-2 bg-black font-pixel text-sm text-white"
                  >
                    <ImagePlus size={18} />
                    Add Photo
                  </button>
                </>
              ) : null}

              {activeTab === "photo" ? (
                <>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="hidden h-14 w-full items-center justify-center gap-3 border border-black bg-white font-pixel text-sm shadow-sticker sm:flex"
                  >
                    <Upload size={21} />
                    Upload Photo
                  </button>
                  <button
                    onClick={() => setCameraOpen(true)}
                    className="hidden h-14 w-full items-center justify-center gap-3 border border-black bg-[#ffb8dc] font-pixel text-sm shadow-sticker sm:flex"
                  >
                    <Camera size={21} />
                    Take Photo
                  </button>
                  <label className="block border border-black bg-[#f3f3f3] p-2 font-pixel text-xs sm:p-3">
                    Scale
                    <input
                      className="range-retro mt-2 w-full sm:mt-3"
                      type="range"
                      min="0.05"
                      max="3.5"
                      step="0.01"
                      value={placement.scale}
                      disabled={!photo}
                      onChange={(event) => setPlacement((current) => ({ ...current, scale: Number(event.target.value) }))}
                    />
                    <span className="mt-2 block">{Math.round(placement.scale * 100)}%</span>
                  </label>
                  <div className="border border-black bg-[#fffdf0] p-3 font-pixel text-xs">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span>Filter Presets</span>
                      <button
                        type="button"
                        onClick={resetPhotoAdjustments}
                        disabled={!photo}
                        className="border border-black bg-white px-3 py-1 text-[11px] disabled:opacity-40"
                      >
                        Reset
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {filterPresets.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => applyPhotoAdjustments(preset.adjustments)}
                          disabled={!photo}
                          className="min-h-10 border border-black bg-white px-2 py-2 text-[11px] shadow-[2px_2px_0_rgba(0,0,0,.18)] disabled:opacity-40"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 border border-black bg-white p-2 font-pixel text-xs sm:space-y-3 sm:p-3">
                    {adjustmentControls.map((control) => (
                      <label key={control.key} className="block">
                        <span className="flex items-center justify-between gap-3">
                          <span>{control.label}</span>
                          <span>{control.display(photoAdjustments[control.key])}</span>
                        </span>
                        <input
                          className="range-retro mt-2 w-full touch-pan-y"
                          type="range"
                          min={control.min}
                          max={control.max}
                          step={control.step}
                          value={photoAdjustments[control.key]}
                          disabled={!photo}
                          onChange={(event) => updatePhotoAdjustment(control.key, Number(event.target.value))}
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={resetPhoto}
                    className="flex h-11 w-full items-center justify-center gap-2 border border-black bg-white font-pixel text-sm"
                  >
                    <RefreshCcw size={17} />
                    Reset Photo
                  </button>
                </>
              ) : null}

              {activeTab === "export" ? (
                <>
                  <div className="border border-black p-4 font-pixel text-xs leading-relaxed">
                    Export creates one JPG in your browser. Your photo stays on this device.
                  </div>
                  <button
                    onClick={exportJpg}
                    disabled={!photo}
                    className="flex h-16 w-full items-center justify-center gap-3 bg-black font-pixel text-base text-white shadow-sticker disabled:opacity-40"
                  >
                    <Download size={22} />
                    Download JPG
                  </button>
                  {downloadNote ? <div className="border border-black bg-[#a6ff63] p-3 font-pixel text-xs">{downloadNote}</div> : null}
                </>
              ) : null}
            </div>
          </WindowFrame>
        </div>

        {cameraOpen ? (
          <div className="fixed inset-0 z-40 grid place-items-center bg-black/35 p-4">
            <WindowFrame title="Camera.exe" className="w-full max-w-[560px]" bodyClassName="bg-[#e9e9e9] p-4">
              {cameraError ? (
                <div className="border border-black bg-white p-5 font-pixel text-sm">{cameraError}</div>
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full scale-x-[-1] border border-black bg-black object-cover" />
              )}
              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => setCameraOpen(false)} className="h-10 border border-black bg-white px-4 font-pixel text-sm">
                  Cancel
                </button>
                <button onClick={captureCamera} className="h-10 bg-black px-5 font-pixel text-sm text-white">
                  Use Photo
                </button>
              </div>
            </WindowFrame>
          </div>
        ) : null}
      </div>
      </div>
    </main>
  );
}
