import { createHash } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 8 * 1024 * 1024;

const extFromMime = (mime: string): string => {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
};

// Three storage modes, decided at request time:
//
//   1. Vercel Blob   — if BLOB_READ_WRITE_TOKEN is present, use the official
//                      @vercel/blob SDK for persistent URLs.
//   2. Filesystem    — local dev (no VERCEL env var). Writes to /public/uploads.
//   3. Data URL      — fallback when on Vercel without Blob configured. No
//                      persistent storage; the base64 lives in the storyboard
//                      JSON itself. Fine for prototype, bloats localStorage
//                      for large libraries.
export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json(
      { error: `Unsupported file type: ${file.type}` },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024}MB)` },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  const ext = extFromMime(file.type);
  const filename = `${hash}.${ext}`;

  // ─── 1) Vercel Blob (preferred when configured) ───
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(`uploads/${filename}`, Buffer.from(bytes), {
        access: "public",
        contentType: file.type,
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      return Response.json({ url: blob.url, source: "blob" });
    } catch (e) {
      console.warn(
        "[upload] Vercel Blob failed, falling through:",
        e instanceof Error ? e.message : String(e),
      );
      // fall through to data-URL fallback
    }
  }

  // ─── 2) Filesystem (local dev only — Vercel serverless FS is read-only) ───
  // Detect Vercel by the auto-set VERCEL env var; only attempt FS writes when
  // we're definitely outside a serverless environment.
  if (!process.env.VERCEL) {
    try {
      const uploadDir = join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(join(uploadDir, filename), bytes);
      return Response.json({ url: `/uploads/${filename}`, source: "fs" });
    } catch (e) {
      console.warn(
        "[upload] FS write failed, falling through to data-URL:",
        e instanceof Error ? e.message : String(e),
      );
      // fall through
    }
  }

  // ─── 3) Data URL fallback (always works) ───
  const base64 = Buffer.from(bytes).toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;
  return Response.json({ url: dataUrl, source: "data-url" });
}
