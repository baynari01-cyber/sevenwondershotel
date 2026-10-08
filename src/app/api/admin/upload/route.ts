import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { AuthError, requireUser } from "@/lib/auth/current-user";

/**
 * Admin image upload.
 *
 * Accepts a multipart form with a single `file` (JPEG, PNG or WebP, ≤ 5 MB), verifies the real file
 * signature (magic bytes, not just the declared MIME type), re-encodes it with sharp to WebP at most 1600px
 * on the long edge, and writes it to `public/uploads/<id>.webp`. Returns `{ url, width, height }`.
 *
 * STORAGE NOTE: writing into `public/` is suitable for this demo running on a persistent local disk
 * (`next dev` / `next start` serve new files from the public folder at request time). On Vercel and other
 * serverless hosts the filesystem is ephemeral and read-only at runtime, so this handler must be swapped
 * for object storage (Vercel Blob, S3, R2, …) and the returned URL must point at that bucket/CDN.
 */

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_EDGE = 1600;

type Kind = "jpeg" | "png" | "webp";

function sniff(buf: Buffer): Kind | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return "png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    await requireUser("rooms.manage");
  } catch (e) {
    if (e instanceof AuthError) return json(e.code === "UNAUTHENTICATED" ? 401 : 403, { error: e.code });
    throw e;
  }

  // Reject oversized bodies early when the browser tells us the size.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES + 16 * 1024) return json(413, { error: "TOO_LARGE" });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, { error: "INVALID_FORM" });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return json(400, { error: "NO_FILE" });
  if (file.size === 0) return json(400, { error: "NO_FILE" });
  if (file.size > MAX_BYTES) return json(413, { error: "TOO_LARGE" });
  if (file.type && !ALLOWED_MIME.has(file.type)) return json(415, { error: "UNSUPPORTED_TYPE" });

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buffer);
  if (!kind) return json(415, { error: "UNSUPPORTED_TYPE" });

  let output: Buffer;
  let width = 0;
  let height = 0;
  try {
    const image = sharp(buffer, { failOn: "error", limitInputPixels: 50_000_000 }).rotate();
    const meta = await image.metadata();
    if (!meta.width || !meta.height) return json(422, { error: "INVALID_IMAGE" });
    const { data, info } = await image.resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer({ resolveWithObject: true });
    output = data;
    width = info.width;
    height = info.height;
  } catch {
    return json(422, { error: "INVALID_IMAGE" });
  }

  const id = `${Date.now().toString(36)}${randomBytes(8).toString("hex")}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${id}.webp`), output, { flag: "wx" });

  return json(200, { url: `/uploads/${id}.webp`, width, height, bytes: output.length });
}
