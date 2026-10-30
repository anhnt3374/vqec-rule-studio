import { test, expect, type Page } from "@playwright/test";
async function drawGate(page: Page) {
  await page.getByRole("button", { name: "Draw Gate", exact: true }).click();
  const rect = (await page.getByLabel("Scene drawing canvas").boundingBox())!;
  await page.mouse.move(rect.x + rect.width * 0.15, rect.y + rect.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * 0.6, rect.y + rect.height * 0.4, {
    steps: 12,
  });
  await page.mouse.up();
}
test("visible Gate tools work before selecting a rule; save scene, edit and reuse", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Draw Gate", exact: true }),
  ).toHaveText("Draw Gate");
  await expect(
    page.getByRole("button", { name: "Draw Zone", exact: true }),
  ).toBeEnabled();
  await drawGate(page);
  await expect(page.locator(".react-flow__node")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Save scene", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Front door");
  await page.getByRole("button", { name: "Apply name" }).click();
  await page.getByRole("button", { name: "Reverse", exact: true }).click();
  await page.getByRole("button", { name: "Save scene", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Scene saved");
  await page.reload();
  await expect(
    page.locator(".spatial-label").filter({ hasText: "Front door" }),
  ).toBeVisible();
  await expect(page.locator(".react-flow__node")).toHaveCount(0);
  await page
    .locator(".spatial-label")
    .filter({ hasText: "Front door" })
    .click();
  await page
    .getByRole("button", { name: "Edit geometry", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Reverse", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Save scene", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save scene", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: /Restricted Area Alert/ })
    .first()
    .click();
  await page
    .locator(".spatial-label")
    .filter({ hasText: "Front door" })
    .dragTo(page.locator(".react-flow__pane"), {
      targetPosition: { x: 180, y: 650 },
    });
  await expect(page.locator(".react-flow__node")).toHaveCount(4);
  await expect(
    page.getByRole("button", { name: "Save Draft", exact: true }),
  ).toBeVisible();
});
test("draw a freehand zone in view mode, then cancel only scene changes", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Restricted Area Alert/ })
    .first()
    .click();
  const count = await page.locator(".react-flow__node").count();
  await page.getByRole("button", { name: "Draw Zone", exact: true }).click();
  const rect = (await page.getByLabel("Scene drawing canvas").boundingBox())!;
  await page.mouse.move(rect.x + rect.width * 0.1, rect.y + rect.height * 0.25);
  await page.mouse.down();
  for (const [x, y] of [
    [0.45, 0.25],
    [0.45, 0.5],
    [0.1, 0.5],
    [0.1, 0.25],
  ])
    await page.mouse.move(rect.x + rect.width * x, rect.y + rect.height * y, {
      steps: 8,
    });
  await page.mouse.up();
  await expect(
    page.locator(".spatial-label").filter({ hasText: "Zone 2" }),
  ).toBeVisible();
  const vertices = (await page
    .locator("svg.scene-overlay polygon")
    .last()
    .getAttribute("points"))!.split(" ");
  expect(vertices[0]).not.toBe(vertices[vertices.length - 1]);
  await expect(page.locator(".react-flow__node")).toHaveCount(count);
  await expect(
    page.getByRole("button", { name: "Edit rule", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Discard scene", exact: true })
    .click();
  await expect(
    page.locator(".spatial-label").filter({ hasText: "Zone 2" }),
  ).toHaveCount(0);
  await expect(page.locator(".react-flow__node")).toHaveCount(count);
});
test("light theme and vertical top/bottom connections on the saved rule", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Restricted Area Alert/ })
    .first()
    .click();
  await expect(page.locator("html")).toHaveClass("light");
  const nodes = page.locator(".react-flow__node");
  await expect(nodes).toHaveCount(3);
  // Read one layout frame; Fit View can update the shared transform between awaits.
  const [first, second, third] = await nodes.evaluateAll((elements) =>
    elements.map((element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    }),
  );
  expect(first.y + first.height).toBeLessThan(second.y);
  expect(second.y + second.height).toBeLessThan(third.y);
  expect(Math.abs(first.x - second.x)).toBeLessThan(2);
  await expect(
    nodes.first().locator(".react-flow__handle.source"),
  ).toHaveAttribute("data-handlepos", "bottom");
  await expect(
    nodes.nth(1).locator(".react-flow__handle.target"),
  ).toHaveAttribute("data-handlepos", "top");
  const color = await page
    .locator(".panel-header")
    .first()
    .evaluate((el) => getComputedStyle(el).color);
  expect(color).not.toBe("rgb(233, 240, 249)");
});
test("explicit Finish zone stays visible and incomplete outlines cannot be saved", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Draw Zone", exact: true }).click();
  const r = (await page.getByLabel("Scene drawing canvas").boundingBox())!;
  await page.mouse.click(r.x + r.width * 0.15, r.y + r.height * 0.25);
  await page.mouse.click(r.x + r.width * 0.5, r.y + r.height * 0.25);
  await expect(
    page.getByRole("button", { name: "Finish zone", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Save scene", exact: true }),
  ).toBeDisabled();
  await page.mouse.click(r.x + r.width * 0.3, r.y + r.height * 0.55);
  await expect(
    page.getByRole("button", { name: "Finish zone", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish zone", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save scene", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Save scene", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Scene saved");
  await page.reload();
  await expect(
    page.locator(".spatial-label").filter({ hasText: "Zone 2" }),
  ).toBeVisible();
});
