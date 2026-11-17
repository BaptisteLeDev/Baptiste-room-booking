import { describe, expect, it } from "vitest";
import { resizeImage, roomImageSrcSet } from "./image";

describe("resizeImage", () => {
  it("rewrites trailing dimensions keeping the source ratio", () => {
    expect(
      resizeImage({
        src: "https://picsum.photos/seed/room-01/800/600",
        width: 400,
        height: undefined,
      }),
    ).toBe("https://picsum.photos/seed/room-01/400/300");
  });

  it("uses an explicit height when given", () => {
    expect(
      resizeImage({
        src: "https://picsum.photos/seed/room-01/800/600",
        width: 400,
        height: 100,
      }),
    ).toBe("https://picsum.photos/seed/room-01/400/100");
  });

  it.each(["https://cdn.example/room.jpg", "/images/room.png", ""])(
    "leaves %s untouched when it has no dimensions",
    (src) => {
      expect(resizeImage({ src, width: 400, height: undefined })).toBe(src);
    },
  );
});

describe("roomImageSrcSet", () => {
  it("lists one WebP per backend-optimized width", () => {
    expect(
      roomImageSrcSet("http://localhost:8080/api/media/abc/1200.webp"),
    ).toBe(
      "http://localhost:8080/api/media/abc/400.webp 400w, http://localhost:8080/api/media/abc/800.webp 800w, http://localhost:8080/api/media/abc/1200.webp 1200w",
    );
  });
});
