import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { chromium } from "@playwright/test";
const base = process.env.STUDIO_BASE ?? "https://192.168.138.142:8444";
const credentials = JSON.parse(
  readFileSync(
    homedir() + "/.config/vqec-vision/ai-candidate-192.168.138.142/access.json",
    "utf8",
  ),
);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
    : {}),
  args: ["--ignore-certificate-errors"],
});
const page = await browser.newPage({
  ignoreHTTPSErrors: true,
  viewport: { width: 1600, height: 1000 },
});
let access;
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto(base);
  await page.locator(".workspace > .column").nth(2).waitFor();
  const columns = await page
    .locator(".workspace > .column")
    .evaluateAll((elements) =>
      elements.map((el) => ({
        classes: el.className,
        x: el.getBoundingClientRect().x,
      })),
    );
  assert.match(columns[0].classes, /navigation/);
  assert.match(columns[1].classes, /graph-column/);
  assert.match(columns[2].classes, /scene-column/);
  assert.ok(columns[0].x < columns[1].x && columns[1].x < columns[2].x);
  assert.equal(await page.locator(".react-flow__node").count(), 4);
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
  const runtime = page.waitForResponse(
    (r) =>
      r.request().method() === "GET" &&
      new URL(r.url()).pathname === "/studio-api/v1/rules/attendance",
  );
  await page
    .getByRole("button", { name: "Connect board AI", exact: true })
    .click();
  const logged = await login;
  assert.equal(logged.status(), 200);
  access = (await logged.json()).details.accessToken;
  const initialResponse = await runtime;
  assert.equal(initialResponse.status(), 200);
  const initial = (await initialResponse.json()).details;
  assert.equal(initial.available, true);
  assert.equal(initial.owner, "rule-studio-backend");
  assert.equal(initial.configured, true);
  // Publish the same default geometry only; never overwrite an operator's custom gate.
  for (const [key, value] of Object.entries({x1:.1,y1:.6,x2:.9,y2:.6,direction:1})) {
    assert.ok(Math.abs(initial.line[key]-value)<1e-6, "Preserve custom gate; use read-only checks instead");
  }
  await page.keyboard.press("Escape");
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
    { timeout: 45000 },
  );
  const video = await page
    .locator("video.live-video")
    .evaluate((v) => ({
      width: v.videoWidth,
      height: v.videoHeight,
      frames: v.getVideoPlaybackQuality().totalVideoFrames,
      dropped: v.getVideoPlaybackQuality().droppedVideoFrames,
    }));
  await page.waitForFunction(
    (before) =>
      document.querySelector("video.live-video")?.getVideoPlaybackQuality()
        .totalVideoFrames >=
      before + 150,
    video.frames,
    { timeout: 15000 },
  );
  const steady = await page
    .locator("video.live-video")
    .evaluate((v, before) => {
      const quality = v.getVideoPlaybackQuality();
      return {
        frames: quality.totalVideoFrames - before.frames,
        dropped: quality.droppedVideoFrames - before.dropped,
      };
    }, video);
  await page.getByRole("button", { name: "Edit rule", exact: true }).click();
  const accepted = page.waitForResponse(
    (r) =>
      r.request().method() === "PUT" &&
      new URL(r.url()).pathname === "/studio-api/v1/rules/attendance",
  );
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const reply = await accepted;
  assert.equal(reply.status(), 202);
  const target = (await reply.json()).details;
  const version = target.pendingVersion || target.activeVersion;
  assert.equal(version, initial.activeVersion + 1);
  await page
    .getByRole("status")
    .filter({ hasText: "Applied on device" })
    .waitFor();
  assert.ok(
    (await page.locator(".runtime-panel").innerText()).includes(
      "Active v" + version,
    ),
  );
  const finalReply = await page.request.get(base + "/studio-api/v1/rules/attendance", {
    headers: { Authorization: "Bearer " + access },
  });
  assert.equal(finalReply.status(), 200);
  const final = (await finalReply.json()).details;
  assert.equal(final.activeVersion, version);
  assert.equal(final.pendingVersion, 0);
  assert.equal(final.available, true);
  assert.ok(final.processed > initial.processed);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      studio: base,
      browser: browser.version(),
      layout: "rules → graph → video",
      video,
      steady,
      activeVersion: version,
      processed: final.processed,
      crossings: final.crossingCount,
      dropped: final.dropped,
      invalid: final.invalid,
      browserErrors: errors,
    }),
  );
} catch (error) {
  throw new Error(String(error).replaceAll(credentials.password, "[redacted]"));
} finally {
  try {
    if (access) {
      const response = await page.request.post(base + "/api/v1/auth/logout", {
        headers: { Authorization: "Bearer " + access },
        data: {},
      });
      assert.equal(response.status(), 200);
    }
  } finally {
    await browser.close();
  }
}
