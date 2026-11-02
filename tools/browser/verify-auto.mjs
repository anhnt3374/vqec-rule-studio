// Read-only runtime acceptance: auto video, borrowed session refresh and bounded viewer capacity.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
import {cameraWorkspace} from './studio.mjs';
const base='https://192.168.138.142';
const credentials=JSON.parse(readFileSync(homedir()+'/.config/vqec-vision/ai-candidate-192.168.138.142/access.json','utf8'));
function status() {
  const script=`import json,socket,struct
with socket.socket(socket.AF_UNIX,socket.SOCK_SEQPACKET) as s:
 s.connect('/run/vqec-vision-ai-dev/media.sock');s.sendall(struct.pack('=IIIIQII65s65s',1,163,1,0,1,0,180,b'',b'')+b'\\0');r=s.recv(17000)
 d=json.loads(r[162:].rstrip(b'\\0'));print(json.dumps(dict(peers=d['peers'],peerLimit=d['peerLimit'],resources=sum(bool(x) for x in d['resources']))))
`;
  const run=spawnSync('ssh',['-o','BatchMode=yes','root@192.168.138.142','python3 -'],{input:script,encoding:'utf8',timeout:10000});
  assert.equal(run.status,0,run.stderr);return JSON.parse(run.stdout);
}
const browser=await chromium.launch({headless:true,args:['--ignore-certificate-errors']});
const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1600,height:1000}});
const camera=await context.newPage();
camera.setDefaultTimeout(20000);
let access, childAuth=0, offers=0;
const probes=[];
camera.on('request',request=>{
  if(new URL(request.url()).port==='8444'&&new URL(request.url()).pathname.includes('/auth/'))++childAuth;
  if(request.method()==='POST'&&new URL(request.url()).pathname==='/api/v1/media/ai/whep')++offers;
});
async function probe(expectStatus) {
  const cameras=await camera.request.get(base+'/api/v1/cameras',{headers:{Authorization:'Bearer '+access}});
  assert.equal(cameras.status(),200);const id=(await cameras.json()).details.items[0].id;
  const result=await camera.request.get(base+`/api/v1/cameras/${id}/live-stream?streamType=AI`,{headers:{Authorization:'Bearer '+access}});
  assert.equal(result.status(),200);const media=(await result.json()).details;
  const page=await camera.context().newPage();
  const owned={page,token:media.mediaToken,resource:base+'/api/v1/media/sessions/'+media.sessionId};probes.push(owned);
  const offer=await page.evaluate(async()=>{
    const video=document.createElement('video');video.autoplay=true;video.muted=true;video.playsInline=true;document.body.append(video);
    const peer=new RTCPeerConnection();window.probePeer=peer;peer.addTransceiver('video',{direction:'recvonly'});
    peer.ontrack=e=>{video.srcObject=e.streams[0]??new MediaStream([e.track]);};
    await peer.setLocalDescription(await peer.createOffer());
    if(peer.iceGatheringState!=='complete')await new Promise(resolve=>{const timeout=setTimeout(resolve,2000);peer.onicegatheringstatechange=()=>{if(peer.iceGatheringState==='complete'){clearTimeout(timeout);resolve();}};});
    return peer.localDescription.sdp;
  });
  const answer=await camera.request.post(base+media.whepUrl,{headers:{Authorization:'Bearer '+media.mediaToken,'Content-Type':'application/sdp'},data:offer});
  assert.equal(answer.status(),expectStatus);
  if(expectStatus===201){
    await page.evaluate(sdp=>window.probePeer.setRemoteDescription({type:'answer',sdp}),await answer.text());
    await page.waitForFunction(()=>{const v=document.querySelector('video');return v.videoWidth===2560&&v.videoHeight===1440&&v.getVideoPlaybackQuality().totalVideoFrames>=25;},null,{timeout:20000});
  }
  return owned;
}
async function close(owned) {
  if(owned.closed)return;owned.closed=true;
  await owned.page.close();
  await camera.request.delete(owned.resource,{headers:{Authorization:'Bearer '+owned.token}});
}
try {
  const connection=await cameraWorkspace(camera,credentials,base);access=connection.access;
  assert.equal(connection.metadata.status(),200);assert.equal(connection.offer.status(),201);
  const studio=connection.page;
  await studio.waitForFunction(()=>{const v=document.querySelector('video.live-video');return v?.videoWidth===2560&&v.videoHeight===1440&&v.getVideoPlaybackQuality().totalVideoFrames>=100;},null,{timeout:45000});
  assert.equal(await studio.getByLabel('Camera password',{exact:true}).count(),0);
  const before=await studio.locator('video.live-video').evaluate(v=>v.getVideoPlaybackQuality().totalVideoFrames);
  await studio.evaluate(()=>window.parent.postMessage({type:'vqec-studio:refresh'},new URL(document.referrer).origin));
  await expect.poll(()=>camera.evaluate(()=>localStorage.getItem('token'))).not.toBe(access);
  access=await camera.evaluate(()=>localStorage.getItem('token'));
  await studio.waitForFunction(n=>document.querySelector('video.live-video').getVideoPlaybackQuality().totalVideoFrames>=n+100,before,{timeout:20000});
  assert.equal(offers,1,'Token refresh must retain the video peer');assert.equal(childAuth,0);
  const started=status();assert.equal(started.peerLimit,4);
  for(let i=started.peers;i<4;++i)await probe(201);
  const fullFrames=await studio.locator('video.live-video').evaluate(v=>v.getVideoPlaybackQuality().totalVideoFrames);
  await studio.waitForFunction(n=>document.querySelector('video.live-video').getVideoPlaybackQuality().totalVideoFrames>=n+450,fullFrames,{timeout:30000});
  const full=status();assert.deepEqual(full,{peers:4,peerLimit:4,resources:4});
  await close(await probe(429)); // A fifth viewer is rejected without changing existing sessions.
  if(probes.some(p=>!p.closed)){
    const released=probes.findLast(p=>!p.closed);await close(released);await probe(201);
  }
  for(const owned of probes)await close(owned);
  await camera.locator('.menu-item').nth(3).click();
  await camera.waitForURL('**/admin/ung-dung');
  const profile=await camera.request.get(base+'/api/v1/profile',{headers:{Authorization:'Bearer '+access}});
  assert.equal(profile.status(),200,'Closing the Studio iframe must not log out its camera parent');
  const runtime=await camera.request.get(base+':8444/studio-api/v1/rules/attendance',{headers:{Authorization:'Bearer '+access}});
  assert.equal(runtime.status(),200);const active=(await runtime.json()).details;
  console.log(JSON.stringify({automaticAI:'2560x1440;100+100 video frames',childLoginLogoutRequests:childAuth,parentRefresh:'video peer preserved',capacity:full,fullCapacityLease:'450 additional frames; >15s',fifthViewer:429,reuseReleasedSlot:'video displayed',parentSessionAfterClosingIframe:200,activeVersion:active.activeVersion,highlight:active.highlight,published:false}));
}catch(error){throw new Error(String(error).replaceAll(credentials.password,'[redacted]'));}
finally {
  for(const owned of probes)await close(owned).catch(()=>{});
  if(access)await camera.request.post(base+'/api/v1/auth/logout',{headers:{Authorization:'Bearer '+access},data:{}}).catch(()=>{});
  await browser.close();
}
