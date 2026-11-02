import { test, expect } from '@playwright/test';
test('attendance graph shows backend counts and waits for activation ACK', async ({page}) => {
  let version=1;
  const status=()=>({activeVersion:version,pendingVersion:0,engineEpoch:'1',available:true,
    line:{x1:.1,y1:.6,x2:.9,y2:.6,direction:1},categoryCount:3,crossingCount:7,
    eventAccepted:7,eventPersisted:7,eventFailed:0,eventPending:0,processed:100,dropped:0,gaps:0,invalid:0,queueHigh:1,
    latencyUs:{evaluate:10,evaluateMax:20,total:30,totalMax:100,p99Upper:128},events:[]});
  await page.route('**/studio-config.json',route=>route.fulfill({json:{boardApi:true}}));
  await page.route('**/api/v1/auth/login',route=>route.fulfill({json:{details:{accessToken:'test-only',navigateTo:'LIVE_VIEW'}}}));
  await page.route('**/api/v1/auth/logout',route=>route.fulfill({json:{details:{}}}));
  await page.route('**/api/v1/cameras',route=>route.fulfill({json:{details:{items:[{id:'camera',name:'Test camera'}]}}}));
  await page.route('**/api/v1/cameras/camera/live-stream?*',route=>route.fulfill({json:{details:{
    whepUrl:'/api/v1/media/ai/whep',mediaToken:'test-only',streamType:'AI',aiEnabled:true}}}));
  await page.route('**/api/v1/media/ai/whep',route=>route.fulfill({status:503,body:'No video in UI contract test'}));
  await page.route('**/studio-api/v1/rules/attendance',route=>{
    if(route.request().method()==='PUT') {
      expect(route.request().postDataJSON()).toMatchObject({kind:'attendance',direction:1});
      ++version;
      return route.fulfill({status:202,json:{details:{...status(),activeVersion:version-1,pendingVersion:version}}});
    }
    return route.fulfill({json:{details:status()}});
  });
  await page.goto('/');
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  const category=page.locator('.react-flow__node').filter({hasText:'Object Category'});
  const gate=page.locator('.react-flow__node').filter({hasText:'Gate Crossing'});
  expect((await category.boundingBox())!.y).toBeLessThan((await gate.boundingBox())!.y);
  await page.getByRole('button',{name:'Camera source',exact:true}).click();
  await page.getByLabel('Camera password').fill('test-only');
  await page.getByRole('button',{name:'Connect board AI',exact:true}).click();
  await expect(page.locator('.runtime-panel')).toContainText('LIVE ANALYTICS');
  await expect(page.locator('.react-flow__edge-text')).toContainText(['3 now','7 crossings']);
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Edit rule',exact:true}).click();
  await page.getByRole('button',{name:'Publish',exact:true}).click();
  await expect(page.locator('.runtime-panel')).toContainText('Active v2');
  await expect(page.getByRole('status')).toContainText('Applied on device');
});
