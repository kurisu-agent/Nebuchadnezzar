import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);
const CODE_DIR = path.join(os.homedir(), "Code");

export const dynamic = "force-dynamic";

async function isGitRepo(dir: string): Promise<boolean> {
  try {
    await fs.access(path.join(dir, ".git"));
    return true;
  } catch {
    return false;
  }
}

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    timeout: 10_000,
  });
  return stdout.trim();
}

export async function GET(req: NextRequest) {
  const projectPath = req.nextUrl.searchParams.get("path");
  if (!projectPath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const resolved = path.resolve(projectPath);
  if (!resolved.startsWith(CODE_DIR + path.sep) && resolved !== CODE_DIR) {
    return NextResponse.json({ error: "Invalid path" }, { status: 403 });
  }

  if (!(await isGitRepo(resolved))) {
    return NextResponse.json({ isGitRepo: false });
  }

  try {
    const [branch, status, log, branches] = await Promise.all([
      git(resolved, ["rev-parse", "--abbrev-ref", "HEAD"]),
      git(resolved, ["status", "--porcelain"]),
      git(resolved, ["log", "--oneline", "-20"]),
      git(resolved, ["branch", "-a", "--format=%(refname:short)"]),
    ]);

    return NextResponse.json({
      isGitRepo: true,
      branch,
      isDirty: status.length > 0,
      status: status
        .split("\n")
        .filter(Boolean)
        .map((line) => ({
          status: line.substring(0, 2).trim(),
          file: line.substring(3),
        })),
      log: log
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const spaceIdx = line.indexOf(" ");
          return {
            hash: line.substring(0, spaceIdx),
            message: line.substring(spaceIdx + 1),
          };
        }),
      branches: branches
        .split("\n")
        .filter(Boolean)
        .map((b) => b.trim()),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Git error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
