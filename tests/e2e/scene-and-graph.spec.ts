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

test("gate endpoints and whole geometry can move; zone vertices can edit", async ({
  page,
}) => {
  await openCustom(page);
  await page
    .locator(".spatial-label")
    .filter({ hasText: "Entrance gate" })
    .click();
  await page.getByRole("button", { name: "Close scene objects" }).click();
  const gate = page
    .locator("svg.scene-overlay>g")
    .filter({ has: page.locator("line[marker-end]") })
    .first();
  const endpoint = gate.locator("ellipse").first(),
    before = await endpoint.getAttribute("cx"),
    box = (await endpoint.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 35, box.y - 20, { steps: 6 });
  await page.mouse.up();
  expect(await endpoint.getAttribute("cx")).not.toBe(before);
  const line = gate.locator("line").first(),
    rect = (await page.getByLabel("Scene drawing canvas").boundingBox())!;
  const coords = await line.evaluate((el) => ({
    x: (Number(el.getAttribute("x1")) + Number(el.getAttribute("x2"))) / 2000,
    y: (Number(el.getAttribute("y1")) + Number(el.getAttribute("y2"))) / 2000,
  }));
  const old = await line.getAttribute("x1");
  await page.mouse.move(
    rect.x + rect.width * coords.x,
    rect.y + rect.height * coords.y,
  );
  await page.mouse.down();
  await page.mouse.move(
    rect.x + rect.width * coords.x + 22,
    rect.y + rect.height * coords.y + 25,
    { steps: 6 },
  );
  await page.mouse.up();
  expect(await line.getAttribute("x1")).not.toBe(old);
  await page
    .locator(".spatial-label")
    .filter({ hasText: "Restricted area" })
    .click();
  await page.getByRole("button", { name: "Close scene objects" }).click();
  const polygon = page.locator("svg.scene-overlay polygon"),
    prior = await polygon.getAttribute("points"),
    vertex = page
      .locator("svg.scene-overlay>g")
      .filter({ has: page.locator("polygon") })
      .locator("ellipse")
      .first(),
    v = (await vertex.boundingBox())!;
  await page.mouse.move(v.x + v.width / 2, v.y + v.height / 2);
  await page.mouse.down();
  await page.mouse.move(v.x + 20, v.y + 20, { steps: 6 });
  await page.mouse.up();
  expect(await polygon.getAttribute("points")).not.toBe(prior);
});
test("connect available handles and delete an edge in edit mode only", async ({
  page,
}) => {
  await openCustom(page);
  await page.locator(".operator-item").filter({ hasText: "Duration" }).click();
  await page.getByRole("button", { name: "Fit View", exact: true }).click();
  const source = page
      .locator(".react-flow__node")
      .filter({ has: page.getByText("Zone Presence", { exact: true }) })
      .locator(".react-flow__handle.source"),
    target = page
      .locator(".react-flow__node")
      .filter({ has: page.getByText("Duration", { exact: true }) })
      .locator(".react-flow__handle.target");
  await source.dragTo(target);
  await expect(page.locator(".react-flow__edge")).toHaveCount(3);
  const path = page.locator(".react-flow__edge-interaction").last();
  const pt = await path.evaluate((el) => {
    const p = el as SVGPathElement,
      q = p.getPointAtLength(p.getTotalLength() / 2),
      m = p.getScreenCTM()!;
    return { x: q.x * m.a + q.y * m.c + m.e, y: q.x * m.b + q.y * m.d + m.f };
  });
  await page.mouse.click(pt.x, pt.y);
  await page.keyboard.press("Delete");
  await expect(page.locator(".react-flow__edge")).toHaveCount(2);
});
test("custom rule deletion keeps scene; uploaded background survives refresh", async ({
  page,
}) => {
  await openCustom(page);
  await page
    .getByRole("button", { name: "Camera source", exact: true })
    .click();
  await page.locator("input[type=file]").setInputFiles({
    name: "scene.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#204050"/></svg>',
    ),
  });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Back to rules" }).click();
  await expect(page.getByAltText("Camera scene background")).toHaveAttribute(
    "src",
    /^data:image/,
  );
  const count = await page.locator(".spatial-label").count();
  await page
    .getByRole("button", { name: "Delete Restricted Area Alert", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete rule", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Delete Restricted Area Alert",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.locator(".spatial-label")).toHaveCount(count);
});
