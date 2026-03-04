import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);
const CODE_DIR = path.join(os.homedir(), "Code");

/** Validate a project name contains no path traversal */
function safeName(name: string): boolean {
  return /^[a-zA-Z0-9_\-. ]+$/.test(name) && !name.includes("..");
}

/** Validate a path is under ~/Code/ */
function isUnderCodeDir(p: string): boolean {
  const resolved = path.resolve(p);
  return resolved.startsWith(CODE_DIR + path.sep) || resolved === CODE_DIR;
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === "create") {
    const { name } = body as { name: string };
    if (!name || !safeName(name)) {
      return NextResponse.json({ error: "Invalid project name" }, { status: 400 });
    }
    const projectPath = path.join(CODE_DIR, name);
    await fs.mkdir(projectPath, { recursive: true });
    await execFileAsync("git", ["init"], { cwd: projectPath });
    return NextResponse.json({ ok: true, path: projectPath });
  }

  if (action === "clone") {
    const { repo } = body as { repo: string };
    // Validate repo looks like "owner/repo" or a URL — reject anything with shell metacharacters
    if (!repo || !/^[a-zA-Z0-9_\-./:\@]+$/.test(repo)) {
      return NextResponse.json({ error: "Invalid repo" }, { status: 400 });
    }
    try {
      await execFileAsync("gh", ["repo", "clone", repo], {
        cwd: CODE_DIR,
        timeout: 120_000,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Clone failed";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    const repoName =
      repo
        .split("/")
        .pop()
        ?.replace(/\.git$/, "") ?? repo;
    const projectPath = path.join(CODE_DIR, repoName);
    return NextResponse.json({ ok: true, path: projectPath, name: repoName });
  }

  if (action === "init-git") {
    const { path: dirPath } = body as { path: string };
    if (!dirPath || !isUnderCodeDir(dirPath)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }
    try {
      await fs.access(path.join(dirPath, ".git"));
    } catch {
      await execFileAsync("git", ["init"], { cwd: dirPath });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "list-dirs") {
    await fs.mkdir(CODE_DIR, { recursive: true });
    const entries = await fs.readdir(CODE_DIR, { withFileTypes: true });
    const dirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => ({ name: e.name, path: path.join(CODE_DIR, e.name) }));
    return NextResponse.json({ dirs });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
