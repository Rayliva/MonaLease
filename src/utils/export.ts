import { Canvas } from "fabric";
import { jsPDF } from "jspdf";

export function downloadCanvasAsPng(
  canvas: Canvas,
  filename = "canvas.png",
): void {
  const dataUrl = canvas.toDataURL({ format: "png", multiplier: 2 });
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export async function downloadAllAsPdf(
  canvasDataUrls: string[],
  filename = "carousel-canvas.pdf",
): Promise<void> {
  if (canvasDataUrls.length === 0) return;

  const img = new Image();
  img.src = canvasDataUrls[0];
  await new Promise((r) => (img.onload = r));
  const aspectRatio = img.naturalWidth / img.naturalHeight;

  const pageWidth = 297;
  const pageHeight = pageWidth / aspectRatio;
  const doc = new jsPDF({
    orientation: aspectRatio > 1 ? "landscape" : "portrait",
    unit: "mm",
    format: [pageWidth, pageHeight],
  });

  for (let i = 0; i < canvasDataUrls.length; i++) {
    if (i > 0) doc.addPage([pageWidth, pageHeight]);
    doc.addImage(canvasDataUrls[i], "PNG", 0, 0, pageWidth, pageHeight);
  }

  doc.save(filename);
}
