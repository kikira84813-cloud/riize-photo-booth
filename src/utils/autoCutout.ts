const IMG_LY_MODULE_URL = "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/dist/index.mjs";
const MAX_INPUT_SIZE = 1280;

type RemoveBackground = (source: string | Blob, config?: unknown) => Promise<Blob>;

type ImglyModule = {
  default: RemoveBackground;
};

let removeBackgroundPromise: Promise<RemoveBackground> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image failed to load."));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Canvas export failed."));
      }
    }, type, quality);
  });
}

async function normalizeInput(src: string): Promise<Blob> {
  const image = await loadImage(src);
  const scale = Math.min(1, MAX_INPUT_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas is not available.");
  }

  ctx.drawImage(image, 0, 0, width, height);
  return canvasToBlob(canvas, "image/jpeg", 0.92);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Result conversion failed."));
    reader.readAsDataURL(blob);
  });
}

async function getRemoveBackground() {
  if (!removeBackgroundPromise) {
    removeBackgroundPromise = import(/* webpackIgnore: true */ IMG_LY_MODULE_URL).then((mod) => (mod as ImglyModule).default);
  }

  return removeBackgroundPromise;
}

export async function autoCutoutPhoto(src: string): Promise<string> {
  const removeBackground = await getRemoveBackground();
  const input = await normalizeInput(src);
  const result = await removeBackground(input, {
    model: "isnet_quint8",
    device: "cpu",
    output: {
      format: "image/png",
      type: "foreground"
    }
  });

  return blobToDataUrl(result);
}
