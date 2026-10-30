import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { chromium } from "@playwright/test";
const base = "https://192.168.138.142:8444";
const credentials = JSON.parse(
  readFileSync(
    homedir() + "/.config/vqec-vision/ai-candidate-192.168.138.142/access.json",
    "utf8",
  ),
);
const browser = await chromium.launch({
  headless: true,
  args: ["--ignore-certificate-errors"],
});
const page = await browser.newPage({
  ignoreHTTPSErrors: true,
  viewport: { width: 1600, height: 1000 },
});
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto(base);
  await page
    .getByRole("button", { name: "Camera source", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Camera username" })
    .fill(credentials.username);
  await page
    .getByLabel("Camera password", { exact: true })
    .fill(credentials.password);
  const login = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      new URL(r.url()).pathname === "/api/v1/auth/login",
  );
  const metadata = page
    .waitForResponse(
      (r) =>
        r.request().method() === "GET" &&
        r.url().includes("live-stream?streamType=AI"),
    )
    .catch(() => null);
  const offer = page
    .waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        new URL(r.url()).pathname === "/api/v1/media/ai/whep",
    )
    .catch(() => null);
  await page
    .getByRole("button", { name: "Connect board AI", exact: true })
    .click();
  assert.equal(
    (await login).status(),
    200,
    "Existing camera login failed; inspect session limit/account without retrying",
  );
  const metadataResponse = await metadata;
  assert.ok(metadataResponse, "AI metadata was not returned");
  const details = (await metadataResponse.json()).details;
  assert.equal(details.streamType, "AI");
  assert.equal(details.aiEnabled, true);
  assert.equal(details.overlayEnabled, true);
  const offerResponse = await offer;
  assert.ok(offerResponse, "WHEP offer did not return");
  assert.equal(offerResponse.status(), 201);
  await page.waitForFunction(
    () => {
      const v = document.querySelector("video.live-video");
      return (
        v?.videoWidth === 2560 &&
        v.videoHeight === 1440 &&
        v.getVideoPlaybackQuality().totalVideoFrames >= 100
      );
    },
    null,
    { timeout: 30000 },
  );
  const stats = await page.locator("video.live-video").evaluate((v) => ({
    width: v.videoWidth,
    height: v.videoHeight,
    frames: v.getVideoPlaybackQuality().totalVideoFrames,
    dropped: v.getVideoPlaybackQuality().droppedVideoFrames,
  }));
  await page.getByRole("button", { name: "Rule", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Rule name" })
    .fill("Board live authoring check");
  await page.getByRole("button", { name: "Create rule", exact: true }).click();
  await page.getByRole("button", { name: "Draw Gate", exact: true }).click();
  const rect = await page.getByLabel("Scene drawing canvas").boundingBox();
  await page.mouse.move(
    rect.x + rect.width * 0.15,
    rect.y + rect.height * 0.45,
  );
  await page.mouse.down();
  await page.mouse.move(
    rect.x + rect.width * 0.5,
    rect.y + rect.height * 0.45,
    { steps: 10 },
  );
  await page.mouse.up();
  await page.getByRole("button", { name: "Close scene objects" }).click();
  await page
    .locator(".spatial-label")
    .filter({ hasText: "Gate 2" })
    .dragTo(page.locator(".react-flow__pane"), {
      targetPosition: { x: 160, y: 180 },
    });
  assert.equal(await page.locator(".react-flow__node").count(), 1);
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await page.getByRole("status").waitFor();
  if (process.env.STUDIO_SCREENSHOT)
    await page.screenshot({ path: process.env.STUDIO_SCREENSHOT });
  await page.reload();
  await page
    .getByRole("button", { name: /^Board live authoring check/ })
    .click();
  assert.equal(await page.locator(".react-flow__node").count(), 1);
  assert.equal(
    await page.locator(".spatial-label").filter({ hasText: "Gate 2" }).count(),
    1,
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      studio: base,
      AIWhep: new URL(details.whepUrl, "https://192.168.138.142:8443").href,
      aiEnabled: details.aiEnabled,
      overlayEnabled: details.overlayEnabled,
      video: stats,
      drawDropSaveReload: "pass",
      browserErrors: errors,
    }),
  );
} catch (error) {
  throw new Error(String(error).replaceAll(credentials.password, "[redacted]"));
} finally {
  try {
    await page
      .getByRole("button", { name: "Camera source", exact: true })
      .click();
    const disconnect = page.getByRole("button", {
      name: "Disconnect",
      exact: true,
    });
    if (await disconnect.isVisible()) await disconnect.click();
  } catch {}
  await browser.close();
}
