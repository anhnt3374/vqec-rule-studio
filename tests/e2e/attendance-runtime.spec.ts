import { test, expect } from '@playwright/test';
test('attendance graph shows backend counts and waits for activation ACK', async ({page}) => {
  let version=1;
  const status=()=>({activeVersion:version,pendingVersion:0,engineEpoch:'1',available:true,
    line:{x1:.1,y1:.6,x2:.9,y2:.6,direction:1},categoryCount:3,crossingCount:7,
    eventAccepted:7,eventPersisted:7,eventFailed:0,eventPending:0,processed:100,dropped:0,gaps:0,invalid:0,queueHigh:1,
    latencyUs:{evaluate:10,evaluateMax:20,total:30,totalMax:100,p99Upper:128},events:[]});
  await page.route('**/studio-config.json',route=>route.fulfill({json:{boardApi:true}}));
  let authCalls=0, discovery=0, releases=0;
  let lastAccess="";
  await page.route('**/api/v1/auth/**',route=>{++authCalls;return route.fulfill({status:500});});
  await page.route('**/api/v1/cameras',route=>{++discovery;return route.fulfill({json:{details:{items:[{id:'camera',name:'Test camera'}]}}});});
  await page.route('**/api/v1/media/sessions/*',route=>{++releases;expect(route.request().headers().authorization).toBe('Bearer test-only');return route.fulfill({status:200});});
  await page.route('**/api/v1/cameras/camera/live-stream?*',route=>route.fulfill({json:{details:{
    whepUrl:'/api/v1/media/ai/whep',mediaToken:'test-only',streamType:'AI',aiEnabled:true,sessionId:'resource'}}}));
  await page.route('**/api/v1/media/ai/whep',route=>route.fulfill({status:503,body:'No video in UI contract test'}));
  await page.route('**/studio-api/v1/rules/attendance',route=>{
    lastAccess=route.request().headers().authorization; expect(lastAccess).not.toBe('Bearer forged');
    if(route.request().method()==='PUT') {
      expect(route.request().postDataJSON()).toMatchObject({kind:'attendance',direction:1,highlight:{enabled:true,color:'#12abef',lifetime:'track'}});
      ++version;
      return route.fulfill({status:202,json:{details:{...status(),activeVersion:version-1,pendingVersion:version}}});
    }
    return route.fulfill({json:{details:status()}});
  });
  await page.route('**/studio-host',route=>route.fulfill({contentType:'text/html',body:`<style>body{margin:0}iframe{width:100vw;height:100vh;border:0}</style><iframe src="/?embed=1" title="Studio"></iframe><script>addEventListener('message',e=>{if(e.data?.type==='vqec-studio:ready')e.source.postMessage({type:'vqec-studio:session',access:'test-only'},location.origin)});</script>`}));
  await page.goto('/studio-host');
  const studio=page.frameLocator('iframe');
  await expect(studio.locator('.react-flow__node')).toHaveCount(4);
  const category=studio.locator('.react-flow__node').filter({hasText:'Object Category'});
  const gate=studio.locator('.react-flow__node').filter({hasText:'Gate Crossing'});
  expect((await category.boundingBox())!.y).toBeLessThan((await gate.boundingBox())!.y);
  await expect(studio.locator('.runtime-panel')).toContainText('LIVE ANALYTICS');
  await expect(studio.locator('.react-flow__edge-text')).toContainText(['3 now','7 crossings']);
  await studio.getByRole('button',{name:'Edit rule',exact:true}).click();
  await studio.getByRole('button',{name:'Configure Highlight',exact:true}).click();
  await studio.getByLabel('Highlight color',{exact:true}).fill('#12abef');
  await studio.getByRole('button',{name:'Publish',exact:true}).click();
  await expect(studio.locator('.runtime-panel')).toContainText('Active v2');
  await expect(studio.getByRole('status')).toContainText('Applied on device');
  await studio.locator('html').evaluate(()=>window.dispatchEvent(new MessageEvent('message',{
    source:window,origin:location.origin,data:{type:'vqec-studio:session',access:'forged'},
  })));
  await page.evaluate(()=>frames[0].postMessage({type:'vqec-studio:session',access:'rotated'},location.origin));
  await expect.poll(()=>lastAccess).toBe('Bearer rotated');
  expect(discovery).toBe(1); // Token rotation keeps the existing video source.
  await expect.poll(()=>releases).toBeGreaterThan(0);
  await page.goto('about:blank');
  expect(authCalls).toBe(0); // The child borrows the parent session without login/logout.
});

test('Highlight is selectable from the operator library and its config survives draft save', async ({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Back to rules'}).click();
  await page.getByRole('button',{name:/Restricted Area Alert/}).first().click();
  await page.getByRole('button',{name:'Edit rule',exact:true}).click();
  await page.locator('.operator-item').filter({hasText:'Draw selected tracks using a configured color'}).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(4);
  await page.getByRole('button',{name:'Configure Highlight',exact:true}).click();
  await page.getByLabel('Highlight color',{exact:true}).fill('#00aa99');
  await page.getByRole('checkbox',{name:'Enable Highlight',exact:true}).uncheck();
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Draft and scene saved'})).toBeVisible();
  await page.reload();
  await page.getByRole('button',{name:'Back to rules'}).click();
  await page.getByRole('button',{name:/Restricted Area Alert/}).first().click();
  await page.getByRole('button',{name:'Configure Highlight',exact:true}).click();
  await expect(page.getByLabel('Highlight color',{exact:true})).toHaveValue('#00aa99');
  await expect(page.getByRole('checkbox',{name:'Enable Highlight',exact:true})).not.toBeChecked();
});
