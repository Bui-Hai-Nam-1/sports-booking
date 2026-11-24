import { BadRequestException } from "@nestjs/common";
import { diskStorage } from "multer";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { extname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;
export const MAX_UPLOAD_SIZE_BYTES = MAX_VIDEO_SIZE_BYTES;

const mediaTypes: Readonly<Record<string, string>> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

export const uploadDirectory = resolve(__dirname, "..", "..", "uploads");

export const venueMediaStorage = diskStorage({
  destination: (_request, _file, callback) => {
    try {
      if (!existsSync(uploadDirectory)) {
        mkdirSync(uploadDirectory, { recursive: true });
      }
      callback(null, uploadDirectory);
    } catch (error) {
      callback(
        error instanceof Error
          ? error
          : new Error("Unable to prepare media upload"),
        uploadDirectory,
      );
    }
  },
  filename: (_request, file, callback) => {
    const extension = mediaTypes[file.mimetype];
    if (!extension) {
      callback(new BadRequestException("Unsupported image or video type"), "");
      return;
    }
    callback(null, `${randomUUID()}${extension}`);
  },
});

export function acceptVenueMedia(
  _request: Express.Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (!mediaTypes[file.mimetype]) {
    callback(
      new BadRequestException(
        "Upload a JPEG, PNG, WebP, GIF, MP4, WebM, or MOV file",
      ),
      false,
    );
    return;
  }
  callback(null, true);
}

export function mediaContentType(filename: string): string {
  const extension = extname(filename).toLowerCase();
  const contentTypes: Readonly<Record<string, string>> = {
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
  };
  return contentTypes[extension] ?? "application/octet-stream";
}

export function removeUploadedFile(path: string): void {
  if (existsSync(path)) {
    unlinkSync(path);
  }
}
