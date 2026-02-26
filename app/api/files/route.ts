import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

const ALLOWED_ROOT = path.join(os.homedir(), ".claude");

async function validatePath(requestedPath: string): Promise<string | null> {
  try {
    const resolved = path.resolve(requestedPath);
    const real = await fs.realpath(resolved);
    if (!real.startsWith(ALLOWED_ROOT)) return null;
    return real;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const requestedPath = req.nextUrl.searchParams.get("path") || ALLOWED_ROOT;

  const safePath = await validatePath(requestedPath);
  if (!safePath) {
    return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
  }

  try {
    const stat = await fs.stat(safePath);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: "Not a directory" }, { status: 400 });
    }

    const dirents = await fs.readdir(safePath, { withFileTypes: true });
    const entries = await Promise.all(
      dirents.map(async (d) => {
        const fullPath = path.join(safePath, d.name);
        let size = 0;
        let modified = 0;
        try {
          const s = await fs.stat(fullPath);
          size = s.size;
          modified = s.mtimeMs;
        } catch {
          // skip stat errors
        }
        return {
          name: d.name,
          type: d.isDirectory() ? ("directory" as const) : ("file" as const),
          path: fullPath,
          size,
          modified,
        };
      }),
    );

    // folders first, then alphabetical
    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ entries, path: safePath });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
