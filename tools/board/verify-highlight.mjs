// Read-only runtime verification: all graph edits use this fresh browser's draft.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {chromium} from '@playwright/test';
const base=process.env.STUDIO_BASE ?? 'https://192.168.138.142:8444';
const credentials=JSON.parse(readFileSync(homedir()+'/.config/vqec-vision/ai-candidate-192.168.138.142/access.json','utf8'));
const browser=await chromium.launch({headless:true,
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{}),
  args:['--ignore-certificate-errors']});
const page=await browser.newPage({ignoreHTTPSErrors:true,viewport:{width:1600,height:1000}});
let access;
try {
  await page.goto(base);
  await page.locator('.react-flow__node').nth(3).waitFor();
  await page.getByRole('button',{name:'Edit rule',exact:true}).click();
  await page.getByRole('button',{name:'Configure Highlight',exact:true}).click();
  const color=page.getByLabel('Highlight color',{exact:true});
  await color.fill('#12abef');
  await page.getByRole('checkbox',{name:'Enable Highlight',exact:true}).uncheck();
  console.log(JSON.stringify({draftBeforeSave:{color:await color.inputValue(),enabled:await page.getByRole('checkbox',{name:'Enable Highlight',exact:true}).isChecked()}}));
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Draft and scene saved'}).waitFor();
  await page.reload();
  await page.getByRole('button',{name:'Configure Highlight',exact:true}).click();
  assert.equal(await color.inputValue(),'#12abef');
  assert.equal(await page.getByRole('checkbox',{name:'Enable Highlight',exact:true}).isChecked(),false);
  await page.getByRole('button',{name:'Back to rules'}).click();
  await page.getByRole('button',{name:/Restricted Area Alert/}).first().click();
  await page.getByRole('button',{name:'Edit rule',exact:true}).click();
  await page.locator('.operator-item').filter({hasText:'Draw selected tracks using a configured color'}).click();
  await page.getByRole('button',{name:'Configure Highlight',exact:true}).click();
  await color.fill('#00aa99');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Draft and scene saved'}).waitFor();
  await page.getByRole('button',{name:'Camera source',exact:true}).click();
  await page.getByRole('textbox',{name:'Camera username'}).fill(credentials.username);
  await page.getByLabel('Camera password',{exact:true}).fill(credentials.password);
  const login=page.waitForResponse(r=>r.request().method()==='POST' && new URL(r.url()).pathname==='/api/v1/auth/login');
  await page.getByRole('button',{name:'Connect board AI',exact:true}).click();
  const response=await login;assert.equal(response.status(),200);access=(await response.json()).details.accessToken;
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>{
    const v=document.querySelector('video.live-video');
    return v?.videoWidth===2560 && v.videoHeight===1440 && v.getVideoPlaybackQuality().totalVideoFrames>=100;
  },null,{timeout:45000});
  const state=await page.request.get(base+'/studio-api/v1/rules/attendance',{headers:{Authorization:'Bearer '+access}});
  assert.equal(state.status(),200);
  const details=(await state.json()).details;
  assert.equal(details.owner,'rule-studio-backend');assert.equal(details.highlight.lifetime,'track');assert.equal(details.available,true);
  const video=await page.locator('video.live-video').evaluate(v=>({width:v.videoWidth,height:v.videoHeight,
    frames:v.getVideoPlaybackQuality().totalVideoFrames,dropped:v.getVideoPlaybackQuality().droppedVideoFrames}));
  console.log(JSON.stringify({operatorLibrary:'Highlight selectable/configurable',draftReload:'color and disabled flag preserved',
    runtimePublishPerformed:false,activeVersion:details.activeVersion,line:details.line,activeHighlight:details.highlight,video}));
} catch(error) {
  throw new Error(String(error).replaceAll(credentials.password,'[redacted]'));
} finally {
  try {if(access)await page.request.post(base+'/api/v1/auth/logout',{headers:{Authorization:'Bearer '+access},data:{}});}
  finally {await browser.close();}
}
