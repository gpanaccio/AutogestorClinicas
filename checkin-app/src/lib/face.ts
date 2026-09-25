"use client";

import type { FaceDetector } from "@mediapipe/tasks-vision";

type VisionModule = typeof import("@mediapipe/tasks-vision");

const MEDIAPIPE_VERSION = "1.0.1";
const BUNDLE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/vision_bundle.mjs`;
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

let detectorPromise: Promise<FaceDetector> | null = null;

// El bundle de MediaPipe usa imports dinámicos que el bundler no puede resolver,
// por eso se carga desde el CDN en tiempo de ejecución.
function loadVision() {
  return import(/* webpackIgnore: true */ /* turbopackIgnore: true */ BUNDLE_URL) as Promise<VisionModule>;
}

async function createDetector(delegate: "GPU" | "CPU") {
  const { FaceDetector, FilesetResolver } = await loadVision();
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  return FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate,
    },
    runningMode: "VIDEO",
    minDetectionConfidence: 0.62,
  });
}

export function getFaceDetector() {
  if (!detectorPromise) {
    detectorPromise = createDetector("GPU").catch(() => createDetector("CPU"));
  }
  return detectorPromise;
}

export type FaceCheck = {
  ok: boolean;
  message: string;
};

export function evaluateFace(
  detections: { boundingBox?: { originX: number; originY: number; width: number; height: number } }[],
  videoWidth: number,
  videoHeight: number,
): FaceCheck {
  if (!videoWidth || !videoHeight) {
    return { ok: false, message: "Esperando la cámara..." };
  }
  if (detections.length === 0) {
    return { ok: false, message: "No se detectó un rostro" };
  }
  if (detections.length > 1) {
    return { ok: false, message: "Debe verse una sola persona" };
  }

  const box = detections[0].boundingBox;
  if (!box) {
    return { ok: false, message: "No se detectó un rostro" };
  }

  const centerX = (box.originX + box.width / 2) / videoWidth;
  const centerY = (box.originY + box.height / 2) / videoHeight;
  const size = Math.min(box.width / videoWidth, box.height / videoHeight);

  if (size < 0.2) {
    return { ok: false, message: "Acercá un poco más el rostro" };
  }
  if (Math.abs(centerX - 0.5) > 0.22 || Math.abs(centerY - 0.48) > 0.24) {
    return { ok: false, message: "Centrá el rostro en el óvalo" };
  }

  return { ok: true, message: "Rostro detectado" };
}
