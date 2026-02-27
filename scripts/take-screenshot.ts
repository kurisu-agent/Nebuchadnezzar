import { chromium, devices } from "playwright";

const UPLOAD_URL = "http://localhost:3000/api/uploads";

interface DeviceConfig {
  viewport: { width: number; height: number };
  deviceScaleFactor: number;
  isMobile: boolean;
  userAgent?: string;
}

// Custom Pixel 9: 1080x2424 @ 2.625 DPR
const PIXEL_9: DeviceConfig = {
  viewport: { width: 412, height: 923 },
  deviceScaleFactor: 2.625,
  isMobile: true,
  userAgent:
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
};

const DEVICE_MAP: Record<string, DeviceConfig> = {
  "pixel-9": PIXEL_9,
  "pixel-7": { ...devices["Pixel 7"], isMobile: true },
  "iphone-14": { ...devices["iPhone 14"], isMobile: true },
  "iphone-15": { ...devices["iPhone 15"], isMobile: true },
  "ipad-pro": { ...devices["iPad Pro 11"], isMobile: true },
  desktop: {
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
    isMobile: false,
  },
};

async function main() {
  const args = process.argv.slice(2);
  const url = args[0];
  if (!url) {
    console.error(
      JSON.stringify({
        error: `Usage: take-screenshot.ts <url> [--device <name>] [--full-page] [--wait <ms>]\nDevices: ${Object.keys(DEVICE_MAP).join(", ")}`,
      }),
    );
    process.exit(1);
  }

  const deviceName = args.includes("--device")
    ? args[args.indexOf("--device") + 1]
    : "pixel-9";
  const fullPage = args.includes("--full-page");
  const waitMs = args.includes("--wait")
    ? parseInt(args[args.indexOf("--wait") + 1])
    : 1000;

  const deviceConfig = DEVICE_MAP[deviceName];
  if (!deviceConfig) {
    console.error(
      JSON.stringify({
        error: `Unknown device: ${deviceName}. Available: ${Object.keys(DEVICE_MAP).join(", ")}`,
      }),
    );
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: deviceConfig.viewport,
    deviceScaleFactor: deviceConfig.deviceScaleFactor,
    isMobile: deviceConfig.isMobile,
    userAgent: deviceConfig.userAgent,
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    if (waitMs > 0) await page.waitForTimeout(waitMs);

    const screenshotBuffer = await page.screenshot({ fullPage, type: "png" });

    // Upload to Convex via the Next.js API route
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([new Uint8Array(screenshotBuffer)], { type: "image/png" }),
      `screenshot-${Date.now()}.png`,
    );
    formData.append("source", "screenshot");
    formData.append(
      "metadata",
      JSON.stringify({ url, device: deviceName, fullPage }),
    );

    const res = await fetch(UPLOAD_URL, { method: "POST", body: formData });
    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
    }

    const { uploadId } = await res.json();
    // Output the marker directly — Claude should include this verbatim in its
    // response so the UI can swap it for the inline image.
    console.log(`Screenshot uploaded (${deviceName}, ${url}).`);
    console.log("");
    console.log(`[screenshot:${uploadId}]`);
  } catch (err) {
    console.error(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
