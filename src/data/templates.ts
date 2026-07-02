export type SlotMask = "roundedRect" | "oval" | "circle" | "heart";

export type PhotoSlot = {
  x: number;
  y: number;
  width: number;
  height: number;
  mask: SlotMask;
};

export type IdolTemplate = {
  id: string;
  name: string;
  file: string;
  thumbnail: string;
  mask: string;
  overlay: string;
  slot: PhotoSlot;
};

const templateFiles = [
  "template-01.png",
  "template-02.PNG",
  "template-03.PNG",
  "template-04.PNG",
  "template-05.PNG",
  "template-06.PNG",
  "template-07.PNG",
  "template-08.PNG",
  "template-09.png",
  "template-10.png",
  "template-11.png",
  "template-12.png",
  "template-13.png",
  "template-14.png",
  "template-15.png",
  "template-16.png",
  "template-17.png",
  "template-18.png",
  "template-19.png",
  "template-20.png",
  "template-21.png",
  "template-22.png",
  "template-23.png",
  "template-24.png",
  "template-25.png",
  "template-26.png",
  "template-27.png",
  "template-28.png",
  "template-29.png",
  "template-30.png",
  "template-31.png",
  "template-32.png",
  "template-33.png",
  "template-34.png",
  "template-35.png",
  "template-36.png",
  "template-37.png",
  "template-38.png",
  "template-39.png",
  "template-40.png",
  "template-41.png",
  "template-42.png",
  "template-43.png",
  "template-44.png",
  "template-45.png",
  "template-46.png",
  "template-47.png",
  "template-48.png",
  "template-49.png",
  "template-50.png",
  "template-51.png",
  "template-52.png",
  "template-53.png",
  "template-54.png",
  "template-55.png",
  "template-56.png",
  "template-57.png",
  "template-58.png",
  "template-59.png",
  "template-60.png",
  "template-61.png",
] as const;

const slots: Array<PhotoSlot> = [
  { x: 0.0399, y: 0.0248, width: 0.9192, height: 0.9431, mask: "roundedRect" },
  { x: 0.0, y: 0.1886, width: 1.0, height: 0.8114, mask: "roundedRect" },
  { x: 0.0, y: 0.0, width: 1.0, height: 1.0, mask: "roundedRect" },
  { x: 0.0, y: 0.0, width: 1.0, height: 1.0, mask: "roundedRect" },
  { x: 0.0, y: 0.0, width: 1.0, height: 1.0, mask: "roundedRect" },
  { x: 0.0, y: 0.0, width: 1.0, height: 1.0, mask: "roundedRect" },
  { x: 0.0, y: 0.0, width: 1.0, height: 1.0, mask: "roundedRect" },
  { x: 0.0, y: 0.0, width: 1.0, height: 1.0, mask: "roundedRect" },
  { x: 0.0324, y: 0.0251, width: 0.9263, height: 0.9528, mask: "roundedRect" },
  { x: 0.0491, y: 0.0332, width: 0.9066, height: 0.9322, mask: "roundedRect" },
  { x: 0.0452, y: 0.0274, width: 0.9077, height: 0.9322, mask: "roundedRect" },
  { x: 0.1786, y: 0.0926, width: 0.7036, height: 0.8, mask: "roundedRect" },
  { x: 0.1024, y: 0.0789, width: 0.7863, height: 0.8012, mask: "roundedRect" },
  { x: 0.0328, y: 0.0304, width: 0.918, height: 0.9392, mask: "roundedRect" },
  { x: 0.0417, y: 0.0364, width: 0.9146, height: 0.8675, mask: "roundedRect" },
  { x: 0.0468, y: 0.0359, width: 0.8987, height: 0.9268, mask: "roundedRect" },
  { x: 0.0507, y: 0.0387, width: 0.8967, height: 0.9226, mask: "roundedRect" },
  { x: 0.0385, y: 0.0222, width: 0.925, height: 0.9497, mask: "roundedRect" },
  { x: 0.0384, y: 0.0222, width: 0.9241, height: 0.9527, mask: "roundedRect" },
  { x: 0.0971, y: 0.0616, width: 0.8509, height: 0.9249, mask: "roundedRect" },
  { x: 0.1037, y: 0.0974, width: 0.843, height: 0.7733, mask: "roundedRect" },
  { x: 0.0343, y: 0.0338, width: 0.9246, height: 0.9486, mask: "roundedRect" },
  { x: 0.1733, y: 0.0, width: 0.7062, height: 0.9821, mask: "roundedRect" },
  { x: 0.04, y: 0.0307, width: 0.9162, height: 0.9415, mask: "roundedRect" },
  { x: 0.0506, y: 0.0358, width: 0.8979, height: 0.9242, mask: "roundedRect" },
  { x: 0.0541, y: 0.0385, width: 0.8955, height: 0.9174, mask: "roundedRect" },
  { x: 0.0486, y: 0.0386, width: 0.8961, height: 0.9185, mask: "roundedRect" },
  { x: 0.1112, y: 0.1118, width: 0.7582, height: 0.7141, mask: "roundedRect" },
  { x: 0.5093, y: 0.1075, width: 0.3847, height: 0.5744, mask: "roundedRect" },
  { x: 0.0436, y: 0.0247, width: 0.9166, height: 0.9432, mask: "roundedRect" },
  { x: 0.1133, y: 0.0916, width: 0.7706, height: 0.8212, mask: "roundedRect" },
  { x: 0.0417, y: 0.0335, width: 0.9126, height: 0.9374, mask: "roundedRect" },
  { x: 0.0507, y: 0.0388, width: 0.8976, height: 0.9253, mask: "roundedRect" },
  { x: 0.0435, y: 0.0334, width: 0.911, height: 0.9347, mask: "roundedRect" },
  { x: 0.051, y: 0.0274, width: 0.9028, height: 0.9293, mask: "roundedRect" },
  { x: 0.0417, y: 0.1061, width: 0.4787, height: 0.5407, mask: "roundedRect" },
  { x: 0.1195, y: 0.099, width: 0.7553, height: 0.7776, mask: "roundedRect" },
  { x: 0.0513, y: 0.0334, width: 0.9119, height: 0.9332, mask: "roundedRect" },
  { x: 0.2281, y: 0.3737, width: 0.3638, height: 0.5887, mask: "roundedRect" },
  { x: 0.0399, y: 0.0336, width: 0.9144, height: 0.9401, mask: "roundedRect" },
  { x: 0.0452, y: 0.036, width: 0.9038, height: 0.9251, mask: "roundedRect" },
  { x: 0.0346, y: 0.0252, width: 0.926, height: 0.9511, mask: "roundedRect" },
  { x: 0.0401, y: 0.0308, width: 0.9169, height: 0.9413, mask: "roundedRect" },
  { x: 0.501, y: 0.1206, width: 0.4147, height: 0.7122, mask: "roundedRect" },
  { x: 0.1027, y: 0.0883, width: 0.7836, height: 0.7006, mask: "roundedRect" },
  { x: 0.0348, y: 0.0164, width: 0.9333, height: 0.9612, mask: "roundedRect" },
  { x: 0.0966, y: 0.165, width: 0.3805, height: 0.7934, mask: "roundedRect" },
  { x: 0.0471, y: 0.0303, width: 0.9058, height: 0.9322, mask: "roundedRect" },
  { x: 0.0414, y: 0.0332, width: 0.9094, height: 0.9335, mask: "roundedRect" },
  { x: 0.0506, y: 0.0387, width: 0.8997, height: 0.9226, mask: "roundedRect" },
  { x: 0.0504, y: 0.0385, width: 0.8954, height: 0.9187, mask: "roundedRect" },
  { x: 0.3424, y: 0.0568, width: 0.3395, height: 0.425, mask: "roundedRect" },
  { x: 0.1787, y: 0.1145, width: 0.6551, height: 0.7652, mask: "roundedRect" },
  { x: 0.2404, y: 0.4267, width: 0.4291, height: 0.5374, mask: "roundedRect" },
  { x: 0.1106, y: 0.0, width: 0.7769, height: 0.9207, mask: "roundedRect" },
  { x: 0.1087, y: 0.2193, width: 0.8137, height: 0.6802, mask: "roundedRect" },
  { x: 0.0645, y: 0.0914, width: 0.865, height: 0.799, mask: "roundedRect" },
  { x: 0.1549, y: 0.2774, width: 0.692, height: 0.5659, mask: "roundedRect" },
  { x: 0.06, y: 0.2547, width: 0.6975, height: 0.5542, mask: "roundedRect" },
  { x: 0.1094, y: 0.1027, width: 0.7822, height: 0.7959, mask: "roundedRect" },
  { x: 0.0728, y: 0.0176, width: 0.8381, height: 0.9521, mask: "roundedRect" },
];

export const templates: IdolTemplate[] = templateFiles.map((file, index) => {
  const number = String(index + 1).padStart(2, "0");
  const templateFile = index >= 55 ? `/templates/new/${file}` : `/templates/new/optimized/template-${number}.webp`;
  return {
    id: `template-${number}`,
    name: file,
    file: templateFile,
    thumbnail: `/templates/new/thumbs/template-${number}.jpg`,
    mask: `/templates/new/masks/mask-${number}.png`,
    overlay: templateFile,
    slot: slots[index]
  };
});




