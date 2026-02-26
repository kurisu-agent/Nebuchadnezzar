import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const svgBuffer = readFileSync(join(ROOT, "public", "icon.svg"));

async function main() {
  const sizes = [
    { name: "icon-192.png", size: 192 },
    { name: "icon-512.png", size: 512 },
    { name: "apple-touch-icon.png", size: 180 },
    { name: "favicon.png", size: 32 },
  ];

  for (const { name, size } of sizes) {
    const output = join(ROOT, "public", name);
    await sharp(svgBuffer).resize(size, size).png().toFile(output);
    console.log(`Generated ${name} (${size}x${size})`);
  }

  // Generate maskable icon (with extra padding for safe zone)
  const maskableSize = 512;
  const padding = Math.round(maskableSize * 0.1);
  const innerSize = maskableSize - padding * 2;

  await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 29, g: 35, b: 42, alpha: 1 },
    })
    .png()
    .toFile(join(ROOT, "public", "icon-maskable-512.png"));
  console.log("Generated icon-maskable-512.png (512x512 maskable)");

  console.log("Done!");
}

main();
