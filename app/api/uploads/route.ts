import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import sharp from "sharp";

const convex = new ConvexHttpClient(
  process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL!,
);

export const dynamic = "force-dynamic";

const THUMB_MAX = 400;

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const sessionId = formData.get("sessionId") as string | null;
  const source = formData.get("source") as string | null;
  const metadataRaw = formData.get("metadata") as string | null;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  // Upload original
  const uploadUrl = await convex.mutation(api.uploads.generateUploadUrl);
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: new Uint8Array(fileBuffer),
  });
  if (!uploadRes.ok) {
    return Response.json(
      { error: "Failed to upload to storage" },
      { status: 500 },
    );
  }
  const { storageId } = await uploadRes.json();

  // Generate and upload thumbnail
  let thumbnailStorageId: string | undefined;
  try {
    const metadata = await sharp(fileBuffer).metadata();
    const needsResize =
      (metadata.width && metadata.width > THUMB_MAX) ||
      (metadata.height && metadata.height > THUMB_MAX);

    if (needsResize) {
      const thumbBuffer = await sharp(fileBuffer)
        .resize(THUMB_MAX, THUMB_MAX, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 75 })
        .toBuffer();

      const thumbUrl = await convex.mutation(api.uploads.generateUploadUrl);
      const thumbRes = await fetch(thumbUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: new Uint8Array(thumbBuffer),
      });
      if (thumbRes.ok) {
        const thumbJson = await thumbRes.json();
        thumbnailStorageId = thumbJson.storageId;
      }
    }
  } catch (err) {
    console.warn("[thumb] failed to generate thumbnail:", err);
  }

  // Save metadata
  const metadata = metadataRaw ? JSON.parse(metadataRaw) : undefined;
  const uploadId = await convex.mutation(api.uploads.saveUpload, {
    storageId,
    thumbnailStorageId: thumbnailStorageId
      ? (thumbnailStorageId as Id<"_storage">)
      : undefined,
    filename: file.name || "screenshot.png",
    mimeType: file.type,
    size: file.size,
    sessionId: sessionId ? (sessionId as Id<"sessions">) : undefined,
    source: source === "screenshot" ? "screenshot" : "user",
    metadata,
  });

  return Response.json({ uploadId });
}
