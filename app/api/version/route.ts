import { execSync } from "child_process";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sha = execSync("git rev-parse HEAD", {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();

    const message = execSync("git log -1 --format=%s", {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();

    const date = execSync("git log -1 --format=%aI", {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();

    return Response.json({ sha, message, date });
  } catch (err) {
    console.error("[version] git error:", err);
    return Response.json({ error: "Failed to read git info" }, { status: 500 });
  }
}
