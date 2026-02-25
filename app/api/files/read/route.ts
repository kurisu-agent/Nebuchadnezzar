import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

const ALLOWED_ROOT = path.join(os.homedir(), ".claude");
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

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
  const requestedPath = req.nextUrl.searchParams.get("path");
  if (!requestedPath) {
    return NextResponse.json(
      { error: "path parameter required" },
      { status: 400 },
    );
  }

  const safePath = await validatePath(requestedPath);
  if (!safePath) {
    return NextResponse.json(
      { error: "Path not allowed" },
      { status: 403 },
    );
  }

  try {
    const stat = await fs.stat(safePath);
    if (stat.isDirectory()) {
      return NextResponse.json(
        { error: "Cannot read a directory" },
        { status: 400 },
      );
    }
    if (stat.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (>1MB)", size: stat.size },
        { status: 413 },
      );
    }

    const content = await fs.readFile(safePath, "utf-8");
    return NextResponse.json({ content, path: safePath, size: stat.size });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
