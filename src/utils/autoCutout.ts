const MAX_PROCESS_SIZE = 1400;

type Rgb = {
  r: number;
  g: number;
  b: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image failed to load."));
    image.src = src;
  });
}

function colorDistance(a: Rgb, b: Rgb) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function getPixel(data: Uint8ClampedArray, width: number, x: number, y: number): Rgb {
  const index = (y * width + x) * 4;
  return { r: data[index], g: data[index + 1], b: data[index + 2] };
}

function estimateBackground(data: Uint8ClampedArray, width: number, height: number): Rgb {
  const samples: Rgb[] = [];
  const sampleCount = 18;

  for (let i = 0; i <= sampleCount; i += 1) {
    const x = Math.round((width - 1) * (i / sampleCount));
    const y = Math.round((height - 1) * (i / sampleCount));
    samples.push(getPixel(data, width, x, 0));
    samples.push(getPixel(data, width, x, height - 1));
    samples.push(getPixel(data, width, 0, y));
    samples.push(getPixel(data, width, width - 1, y));
  }

  const brightSamples = samples
    .map((sample) => ({ ...sample, brightness: (sample.r + sample.g + sample.b) / 3 }))
    .sort((a, b) => b.brightness - a.brightness)
    .slice(0, Math.max(8, Math.floor(samples.length * 0.45)));

  return brightSamples.reduce(
    (sum, sample) => ({ r: sum.r + sample.r / brightSamples.length, g: sum.g + sample.g / brightSamples.length, b: sum.b + sample.b / brightSamples.length }),
    { r: 0, g: 0, b: 0 }
  );
}

export async function autoCutoutPhoto(src: string): Promise<string> {
  const image = await loadImage(src);
  const scale = Math.min(1, MAX_PROCESS_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    throw new Error("Canvas is not available.");
  }

  ctx.drawImage(image, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const background = estimateBackground(data, width, height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const pixel = { r: data[index], g: data[index + 1], b: data[index + 2] };
      const brightness = (pixel.r + pixel.g + pixel.b) / 3;
      const distance = colorDistance(pixel, background);
      const edge = Math.min(x, y, width - 1 - x, height - 1 - y);
      const edgeBoost = edge < 18 ? 16 : 0;
      const whiteLike = brightness > 205 && distance < 86 + edgeBoost;
      const closeToBg = distance < 44 + edgeBoost && brightness > 150;

      if (whiteLike || closeToBg) {
        data[index + 3] = 0;
      } else if (brightness > 190 && distance < 112) {
        data[index + 3] = Math.max(70, Math.round((distance - 44) * 3));
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}
