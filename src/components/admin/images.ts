const KEEP_AS_IS = ["image/jpeg", "image/png", "image/webp"];

/**
 * Shrinks a photo before upload: longest side at most `max` px, saved as JPEG.
 * Phone photos are often 5–10 MB; this keeps them well under the bucket limit.
 */
export async function shrinkImage(file: File, max = 2400): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`No se pudo leer ${file.name}. Usa JPG, PNG o WebP.`);
  }
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 2_000_000 && KEEP_AS_IS.includes(file.type)) return file;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error(`No se pudo procesar ${file.name}.`);
  return blob;
}
