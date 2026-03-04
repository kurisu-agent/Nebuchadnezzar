import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

/** Derive the URL template from NEXT_PUBLIC_CONVEX_URL.
 *  e.g. "https://3210--dev--neb--hext-dev.coder.hext.dev"
 *       → "https://{port}--dev--neb--hext-dev.coder.hext.dev"
 */
export function deriveUrlTemplate(): string | null {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;
  try {
    const parsed = new URL(convexUrl);
    // Coder pattern: <port>--<rest>.coder.<domain>
    const match = parsed.hostname.match(/^\d+(--.*)/);
    if (!match) return null;
    return `${parsed.protocol}//{port}${match[1]}`;
  } catch {
    return null;
  }
}

export async function GET() {
  // Scan listening TCP ports via ss
  let ports: { port: number; process: string }[] = [];
  try {
    const { stdout } = await execAsync("ss -tlnp 2>/dev/null", {
      timeout: 5000,
    });
    const lines = stdout.split("\n").slice(1); // skip header
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) continue;
      // Local address is col 3, e.g. "0.0.0.0:3000" or "*:3000" or "[::]:3000"
      const local = parts[3];
      const portMatch = local.match(/:(\d+)$/);
      if (!portMatch) continue;
      const port = parseInt(portMatch[1], 10);
      if (port < 1024) continue; // skip privileged ports

      // Process info is in the last column, e.g. users:(("node",pid=1234,fd=5))
      const procCol = parts.find((p) => p.startsWith("users:")) ?? "";
      const procMatch = procCol.match(/\("([^"]+)"/);
      const process = procMatch?.[1] ?? "";

      // Deduplicate (IPv4 and IPv6 both show up)
      if (!ports.some((p) => p.port === port)) {
        ports.push({ port, process });
      }
    }
  } catch {
    // ss might not be available
  }

  ports = ports.sort((a, b) => a.port - b.port);

  const autoTemplate = deriveUrlTemplate();

  return NextResponse.json({ ports, autoTemplate });
}
