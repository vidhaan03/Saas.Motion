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
  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, filename), bytes);

  return Response.json({
    url: `/uploads/${filename}`,
    width: undefined,
    height: undefined,
  });
}
