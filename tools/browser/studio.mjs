import assert from 'node:assert/strict';
// Test-only login belongs to this verifier. Product iframe borrows that parent session.
export async function cameraWorkspace(camera, credentials, base) {
  const origin=new URL(base); origin.port='';
  const login=await camera.request.post(origin.origin+'/api/v1/auth/login',{data:credentials});
  assert.equal(login.status(),200,'Camera test login failed');
  const session=(await login.json()).details;
  try {
    await camera.context().addInitScript(({origin,session})=>{
      if(location.origin===origin){localStorage.setItem('token',session.accessToken);sessionStorage.setItem('refreshToken',session.refreshToken??'');}
    },{origin:origin.origin,session});
    const metadata=camera.waitForResponse(r=>r.request().method()==='GET'&&r.url().includes('live-stream?streamType=AI'));
    const offer=camera.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/v1/media/ai/whep');
    await camera.goto(origin.origin+'/admin/rule-studio');
    const workspace=camera.frameLocator('iframe[title="Rule Studio"]');
    await workspace.locator('.workspace').waitFor();
    const frame=async()=>await(await camera.locator('iframe[title="Rule Studio"]').elementHandle()).contentFrame();
    const page=new Proxy({}, {get(_object,key){
      if(key==='request'||key==='keyboard')return camera[key];
      if(['waitForResponse','on','screenshot'].includes(key))return camera[key].bind(camera);
      if(key==='reload')return async()=>{await camera.reload();await workspace.locator('.workspace').waitFor();};
      if(['waitForFunction','evaluate'].includes(key))return async(...args)=>(await frame())[key](...args);
      return workspace[key].bind(workspace);
    }});
    return {page,access:session.accessToken,metadata:await metadata,offer:await offer};
  } catch(error) {
    await camera.request.post(origin.origin+'/api/v1/auth/logout',{headers:{Authorization:'Bearer '+session.accessToken},data:{}}).catch(()=>{});
    throw error;
  }
}
