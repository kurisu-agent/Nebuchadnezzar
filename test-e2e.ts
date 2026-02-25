import { chromium } from "playwright";

const BASE_URL = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") console.log(`[CONSOLE ERROR] ${msg.text()}`);
  });
  page.on("pageerror", (err) => console.log(`[PAGE ERROR] ${err.message}`));

  // Load home
  console.log("--- Loading home ---");
  const homeResp = await page.goto(BASE_URL, { timeout: 10000 });
  console.log(`Status: ${homeResp?.status()}`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/tmp/neb-home.png", fullPage: true });

  // Click New Session
  console.log("\n--- New Session ---");
  await page.click("text=New Session", { timeout: 5000 });
  await page.waitForURL("**/session/**", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
  console.log(`URL: ${page.url()}`);
  await page.screenshot({ path: "/tmp/neb-session.png", fullPage: true });

  // Send message
  console.log("\n--- Sending message ---");
  const textarea = page.locator("textarea");
  if ((await textarea.count()) > 0) {
    await textarea.first().fill("say hello");

    const chatPromise = page.waitForResponse(
      (r) => r.url().includes("/api/chat"),
      { timeout: 60000 },
    );

    await page.locator('button:has-text("Send")').first().click();
    console.log("Clicked Send");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "/tmp/neb-sent.png", fullPage: true });

    try {
      const resp = await chatPromise;
      console.log(
        `/api/chat: ${resp.status()} ${(await resp.text()).slice(0, 200)}`,
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message.split("\n")[0] : String(err);
      console.log(`/api/chat timeout: ${msg}`);
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: "/tmp/neb-response.png", fullPage: true });

    const msgs = await page.$$eval(".chat-bubble", (els) =>
      els.map((e) => (e.textContent ?? "").trim().slice(0, 200)),
    );
    console.log("Bubbles:", JSON.stringify(msgs));
  } else {
    console.log("No textarea!");
    console.log(await page.locator("body").innerText());
  }

  await browser.close();
  console.log("\nDone.");
}

run().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
