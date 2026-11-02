import { test, expect, type Page } from "@playwright/test";
async function openCustom(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Back to rules" }).click();
  await page
    .getByRole("button", { name: /Restricted Area Alert/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Edit rule", exact: true }).click();
}
async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const req = indexedDB.open("vqec-rule-studio");
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    return new Promise<string>((res, rej) => {
      const tx = db.transaction("published"),
        req = tx.objectStore("published").get("rule-2");
      req.onsuccess = () => res(JSON.stringify(req.result));
      req.onerror = () => rej(req.error);
      tx.oncomplete = () => db.close();
    });
  });
}
test("draw gate first, reverse, drag into graph and restore draft", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Back to rules" }).click();
  await page.getByRole("button", { name: "Rule", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Rule name" })
    .fill("Entrance authoring");
  await page.getByRole("button", { name: "Create rule", exact: true }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(0);
  await page.getByRole("button", { name: "Draw Gate", exact: true }).click();
  const rect = (await page.getByLabel("Scene drawing canvas").boundingBox())!;
  await page.mouse.move(rect.x + rect.width * 0.2, rect.y + rect.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * 0.8, rect.y + rect.height * 0.6, {
    steps: 12,
  });
  await page.mouse.up();
  await expect(page.locator(".react-flow__node")).toHaveCount(0);
  await expect(
    page.locator(".spatial-label").filter({ hasText: "Gate 2" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reverse", exact: true }).click();
  const direction = await page
    .locator("svg.scene-overlay g line[marker-end]")
    .last()
    .getAttribute("y2");
  await page.getByRole("button", { name: "Reverse", exact: true }).click();
  expect(
    await page
      .locator("svg.scene-overlay g line[marker-end]")
      .last()
      .getAttribute("y2"),
  ).not.toBe(direction);
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Loading entrance");
  await page.getByRole("button", { name: "Apply name" }).click();
  await page.getByRole("button", { name: "Close scene objects" }).click();
  await page
    .locator(".spatial-label")
    .filter({ hasText: "Loading entrance" })
    .dragTo(page.locator(".react-flow__pane"), {
      targetPosition: { x: 180, y: 180 },
    });
  await expect(page.locator(".react-flow__node")).toHaveCount(1);
  await expect(page.locator(".operator-node")).toContainText(
    "Loading entrance",
  );
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft and scene saved");
  await page.reload();
  await page.getByRole("button", { name: "Back to rules" }).click();
  await page
    .getByRole("button", { name: /Entrance authoring/ })
    .first()
    .click();
  await expect(page.locator(".react-flow__node")).toHaveCount(1);
  await expect(
    page.locator(".spatial-label").filter({ hasText: "Loading entrance" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("zone vertices and resizable columns preserve normalized scene", async ({
  page,
}) => {
  await openCustom(page);
  await page.getByRole("button", { name: "Draw Zone", exact: true }).click();
  const canvas = page.getByLabel("Scene drawing canvas"),
    rect = (await canvas.boundingBox())!;
  for (const [x, y] of [
    [0.2, 0.3],
    [0.48, 0.3],
    [0.45, 0.55],
    [0.25, 0.55],
  ])
    await page.mouse.click(rect.x + rect.width * x, rect.y + rect.height * y);
  await page.keyboard.press("Enter");
  await expect(
    page.locator(".spatial-label").filter({ hasText: "Zone 2" }),
  ).toBeVisible();
  const polygon = page.locator("svg.scene-overlay polygon").last(),
    points = await polygon.getAttribute("points");
  const box = (await page
    .getByRole("separator", { name: "Resize graph and camera" })
    .boundingBox())!;
  await page.mouse.move(box.x + 4, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x - 150, box.y + 100, { steps: 8 });
  await page.mouse.up();
  await expect(polygon).toHaveAttribute("points", points!);
  expect((await canvas.boundingBox())!.width).toBeGreaterThan(rect.width);
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Back to rules" }).click();
  await page
    .getByRole("button", { name: /Restricted Area Alert/ })
    .first()
    .click();
  await expect(
    page.locator(".spatial-label").filter({ hasText: "Zone 2" }),
  ).toBeVisible();
});
test("unsupported custom publish preserves snapshot; draft and cancel retain edits", async ({ page }) => {
  await openCustom(page);
  const original = await snapshot(page);
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Attendance");
  expect(await snapshot(page)).toBe(original);
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await page.getByRole("button", { name: "Configure Zone Presence", exact: true }).click();
  await page.getByRole("textbox", { name: "Display name" }).fill("Edited zone");
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect(page.getByRole("status")).toBeVisible();
  expect(await snapshot(page)).toBe(original);
  await page.getByRole("textbox", { name: "Display name" }).fill("Discard me");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(page.locator(".operator-node").first()).toContainText("Edited zone");
  expect(await snapshot(page)).toBe(original);
});
test("Attendance locked and shared object deletion blocked", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Back to rules" }).click();
  await page.getByRole("button", { name: /Attendance/ }).click();
  await page.getByRole("button", { name: "Edit rule", exact: true }).click();
  await expect(
    page.locator(".operator-item").filter({ hasText: "Gate Crossing" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Draw Gate", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".react-flow__node")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Configure Gate Crossing", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Display name" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("combobox", { name: "Crossing direction" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Back to rules" }).click();
  await page
    .getByRole("button", { name: /Restricted Area Alert/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Edit rule", exact: true }).click();
  await page.getByRole("button", { name: /Objects/ }).click();
  await page
    .locator(".object-main")
    .filter({ hasText: "Entrance gate" })
    .click();
  await page
    .getByRole("button", { name: "Delete selected spatial object" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Attendance");
  await expect(
    page.getByRole("button", { name: "Delete object", exact: true }),
  ).toHaveCount(0);
});
test("configure, duplicate, delete and undo graph operators", async ({
  page,
}) => {
  await openCustom(page);
  for (const name of ["Generic Property", "Union", "Duration"])
    await page.locator(".operator-item").filter({ hasText: name }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(6);
  await page
    .getByRole("button", { name: "Configure Generic Property", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Property name" })
    .fill("identity.status");
  await page.getByRole("textbox", { name: "Value", exact: true }).fill("Known");
  await page.getByRole("button", { name: "Close configuration" }).click();
  await page.keyboard.press("Control+d");
  await expect(page.locator(".react-flow__node")).toHaveCount(7);
  await page.keyboard.press("Delete");
  await expect(page.locator(".react-flow__node")).toHaveCount(6);
  await page.keyboard.press("Control+z");
  await expect(page.locator(".react-flow__node")).toHaveCount(7);
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Back to rules" }).click();
  await page
    .getByRole("button", { name: /Restricted Area Alert/ })
    .first()
    .click();
  await expect(page.locator(".react-flow__node")).toHaveCount(7);
});

test("columns follow rule library, graph, video order and resize by keyboard", async ({ page }) => {
  await page.goto("/");
  const columns = page.locator(".workspace > .column");
  await expect(columns).toHaveCount(3);
  await expect(columns.nth(0)).toHaveClass(/navigation/);
  await expect(columns.nth(1)).toHaveClass(/graph-column/);
  await expect(columns.nth(2)).toHaveClass(/scene-column/);
  const boxes = await columns.evaluateAll(elements => elements.map(el => el.getBoundingClientRect().x));
  expect(boxes[0]).toBeLessThan(boxes[1]);
  expect(boxes[1]).toBeLessThan(boxes[2]);
  const separator = page.getByRole("separator", { name: "Resize navigation and graph" });
  const before = (await columns.nth(0).boundingBox())!.width;
  await separator.focus();
  await page.keyboard.press("ArrowRight");
  expect((await columns.nth(0).boundingBox())!.width).toBeGreaterThan(before);
  expect((await columns.nth(1).boundingBox())!.width).toBeGreaterThanOrEqual(360);
  expect((await columns.nth(2).boundingBox())!.width).toBeGreaterThanOrEqual(400);
});
