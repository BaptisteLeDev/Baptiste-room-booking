import { $ } from "@builder.io/qwik";
import { useImageProvider, type ImageTransformerProps } from "qwik-image";

const DIMENSIONS = /\/(\d+)\/(\d+)$/;
const ROOM_IMAGE_WIDTHS = [320, 400, 640, 800];

export function resizeImage({ src, width, height }: ImageTransformerProps) {
  const match = DIMENSIONS.exec(src);
  if (!match) return src;
  const ratio = Number(match[2]) / Number(match[1]);
  return src.replace(
    DIMENSIONS,
    `/${width}/${height ?? Math.round(width * ratio)}`,
  );
}

// Backend-optimized photos: one WebP per width, see backend media module
const MEDIA_VARIANT = /\/(400|800|1200)\.webp$/;
const MEDIA_WIDTHS = [400, 800, 1200];

export function roomImageSrcSet(src: string) {
  if (MEDIA_VARIANT.test(src))
    return MEDIA_WIDTHS.map(
      (width) => `${src.replace(MEDIA_VARIANT, `/${width}.webp`)} ${width}w`,
    ).join(", ");
  if (!DIMENSIONS.test(src)) return undefined;
  return ROOM_IMAGE_WIDTHS.map(
    (width) => `${resizeImage({ src, width, height: undefined })} ${width}w`,
  ).join(", ");
}

export const useRoomImages = () =>
  useImageProvider({
    resolutions: [400, 800, 1200],
    imageTransformer$: $(resizeImage),
  });
