import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(
  process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL!,
);

export const dynamic = "force-dynamic";

/**
 * Serves an uploaded image inline with correct Content-Type and filename.
 * Usage: /api/uploads/serve?id=<uploadId>
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  const uploads = await convex.query(api.uploads.getMany, {
    uploadIds: [id as Id<"uploads">],
  });
  const upload = uploads[0];

  if (!upload?.url) {
    return new Response("Not found", { status: 404 });
  }

  // Fetch the blob from Convex storage and buffer it
  const res = await fetch(upload.url);
  if (!res.ok) {
    return new Response("Storage fetch failed", { status: 502 });
  }

  const buffer = await res.arrayBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": upload.mimeType,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
