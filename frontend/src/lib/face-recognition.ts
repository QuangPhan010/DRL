import { Human } from "@vladmandic/human";

export interface DetectedFace {
  embedding: number[];
  liveness: number;
  realness: number;
}

const human = new Human({
  backend: "webgl",
  modelBasePath: "/models",
  cacheSensitivity: 0,
  face: {
    enabled: true,
    detector: {
      modelPath: "blazeface.json",
      rotation: true,
      maxDetected: 2,
      minConfidence: 0.6,
      minSize: 100,
    },
    mesh: { enabled: true, modelPath: "facemesh.json" },
    iris: { enabled: false },
    description: { enabled: true, modelPath: "faceres.json" },
    emotion: { enabled: false },
    antispoof: { enabled: true, modelPath: "antispoof.json" },
    liveness: { enabled: true, modelPath: "liveness.json" },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
});

let loadPromise: Promise<void> | null = null;

export const loadFaceModels = () => {
  if (!loadPromise) {
    loadPromise = (async () => {
      await human.load();
      await human.warmup();
    })();
  }
  return loadPromise;
};

const faceFromInput = async (
  input: HTMLImageElement | HTMLVideoElement,
): Promise<DetectedFace> => {
  await loadFaceModels();
  const result = await human.detect(input);
  if (result.face.length !== 1) {
    throw new Error(
      result.face.length === 0
        ? "Không tìm thấy khuôn mặt."
        : "Khung hình phải chỉ có một khuôn mặt.",
    );
  }
  const face = result.face[0];
  if (!face.embedding?.length) {
    throw new Error("Không thể trích xuất đặc trưng khuôn mặt.");
  }
  return {
    embedding: [...face.embedding],
    liveness: face.live ?? 0,
    realness: face.real ?? 0,
  };
};

export const detectFaceFromVideo = (video: HTMLVideoElement) =>
  faceFromInput(video);

export const detectFaceFromDataUrl = async (dataUrl: string) => {
  const image = new window.Image();
  image.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Không thể đọc ảnh đại diện."));
  });
  return faceFromInput(image);
};

export const compareFaces = (left: number[], right: number[]) =>
  human.match.similarity(left, right);
