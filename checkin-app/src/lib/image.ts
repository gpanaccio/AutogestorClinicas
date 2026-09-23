export function measureBrightness(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;
  const { width, height } = canvas;
  const sample = ctx.getImageData(
    Math.floor(width * 0.25),
    Math.floor(height * 0.2),
    Math.max(1, Math.floor(width * 0.5)),
    Math.max(1, Math.floor(height * 0.55)),
  );
  let sum = 0;
  const { data } = sample;
  for (let i = 0; i < data.length; i += 16) {
    sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  const pixels = Math.ceil(data.length / 16);
  return sum / pixels;
}

export function captureAndCompress(video: HTMLVideoElement, maxSize = 800) {
  const sourceW = video.videoWidth || 720;
  const sourceH = video.videoHeight || 960;
  const scale = Math.min(1, maxSize / Math.max(sourceW, sourceH));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sourceW * scale);
  canvas.height = Math.round(sourceH * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/webp", 0.72);
}
