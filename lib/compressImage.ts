// Компресира снимка В БРАУЗЪРА преди качване през server action:
// - смалява до maxDim по дългата страна (менюто не показва повече от ~2048px)
// - преенкодва като WebP (в пъти по-леко от телефонен JPEG / AI PNG)
// Защо: Vercel има платформен лимит ~4.5 MB на заявка — снимки от телефон (2–12 MB)
// гърмят с "An unexpected response was received from the server", независимо от
// serverActions.bodySizeLimit. Компресията решава и това, и теглото в storage.
export async function compressImage(file: File, maxDim = 2048, quality = 0.9): Promise<File> {
  // Ресайзваме само растерни формати, които браузърът декодира надеждно
  if (!/^image\/(jpeg|png|webp|avif)$/i.test(file.type)) return file;
  try {
    // from-image = уважава EXIF ориентацията (телефонни снимки)
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", quality));
    if (!blob) return file;
    // Ако „компресията" излезе по-тежка (рядко, при малки файлове) — оставяме оригинала
    if (blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp" });
  } catch {
    return file; // при провал качваме оригинала — сървърът пак ще валидира
  }
}
