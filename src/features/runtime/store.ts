import { create } from 'zustand';
import { compileAttendance } from './attendance';
import type { Rule, CameraScene } from '@/models/types';
export interface RuntimeStatus {
  activeVersion:number; pendingVersion:number; engineEpoch:string; available:boolean;
  line:{x1:number;y1:number;x2:number;y2:number;direction:number};
  categoryCount:number; crossingCount:number; eventAccepted:number; eventPersisted:number; eventFailed:number; eventPending:number; eventDelivered:number; deliveryBlocked:number;
  processed:number; dropped:number; gaps:number; invalid:number; queueHigh:number;
  latencyUs:{evaluate:number;evaluateMax:number;total:number;totalMax:number;p99Upper:number};
  events:{sequence:number;trackId:string;frameId:number;version:number}[];
}
export const useRuntime = create<{access:string|null;status:RuntimeStatus|null;error:string;publishing:boolean}>(()=>({
  access:null,status:null,error:'Connect board AI to inspect runtime',publishing:false,
}));
export function setRuntimeAccess(access:string|null, previous?:string) {
  if (previous && useRuntime.getState().access !== previous) return;
  useRuntime.setState({access,status:null,error:access?'':'Connect board AI to inspect runtime'});
}
async function request(method='GET',body?:unknown):Promise<RuntimeStatus> {
  const access=useRuntime.getState().access;
  if (!access) throw new Error('Connect board AI before publishing.');
  const response=await fetch('/studio-api/v1/rules/attendance',{
    method,headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},
    ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Rule runtime HTTP ${response.status}`);
  return (await response.json()).details as RuntimeStatus;
}
export async function refreshRuntime() {
  try { const status=await request(); useRuntime.setState({status,error:''}); }
  catch(error) { useRuntime.setState({status:null,error:error instanceof Error?error.message:'Runtime unavailable'}); }
}
export async function publishAttendance(rule:Rule,scene:CameraScene) {
  const config=compileAttendance(rule,scene);
  useRuntime.setState({publishing:true,error:''});
  try {
    const accepted=await request('PUT',config);
    const target=accepted.pendingVersion || accepted.activeVersion;
    for(let attempt=0;attempt<20;attempt++) {
      const status=await request(); useRuntime.setState({status});
      if(status.activeVersion===target && !status.pendingVersion) return status;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    throw new Error('Activation ACK timed out; inspect active version before retrying.');
  } finally {useRuntime.setState({publishing:false});}
}
