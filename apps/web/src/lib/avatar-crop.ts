import type { Area } from "react-easy-crop";

/** Export the selected source pixels; the API still validates and normalizes the upload. */
export async function cropAvatar(source: string, area: Area): Promise<File> {
  const image = new Image();
  image.src = source;
  await image.decode();
  if (
    !image.naturalWidth ||
    !image.naturalHeight ||
    image.naturalWidth * image.naturalHeight > 20_000_000 ||
    ![area.x, area.y, area.width, area.height].every(Number.isFinite) ||
    area.x < 0 ||
    area.y < 0 ||
    area.width <= 0 ||
    area.height <= 0 ||
    area.x + area.width > image.naturalWidth + 1 ||
    area.y + area.height > image.naturalHeight + 1
  )
    throw new Error("Invalid image crop");

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    512,
    512,
  );
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error("Image export failed")),
      "image/webp",
      0.92,
    ),
  );
  return new File([blob], "avatar.webp", { type: blob.type });
}
