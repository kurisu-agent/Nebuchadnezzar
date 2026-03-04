import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

const HOME_DIR = os.homedir();

async function validatePath(requestedPath: string): Promise<string | null> {
  try {
    const resolved = path.resolve(requestedPath);
    const real = await fs.realpath(resolved);
    if (!real.startsWith(HOME_DIR)) return null;
    return real;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { path: filePath, content } = body;

    if (!filePath || typeof content !== "string") {
      return NextResponse.json(
        { error: "path and content required" },
        { status: 400 },
      );
    }

    const safePath = await validatePath(filePath);
    if (!safePath) {
      return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
    }

    await fs.writeFile(safePath, content, "utf-8");
    return NextResponse.json({ ok: true, path: safePath });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
