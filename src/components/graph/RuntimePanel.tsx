import { useEffect } from 'react';
import { useRuntime, refreshRuntime } from '@/features/runtime/store';
export function RuntimePanel() {
  const {access,status,error}=useRuntime();
  useEffect(()=>{
    if(!access) return;
    let stopped=false;
    let timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{await refreshRuntime();if(!stopped)timer=setTimeout(()=>void poll(),500);};
    void poll();return()=>{stopped=true;clearTimeout(timer);};
  },[access]);
  return <div className="runtime-panel" aria-live="polite">
    <div className="runtime-summary"><span className={`runtime-dot ${status?.available?'live':''}`}/>
      <strong>{status?.available?'LIVE ANALYTICS':'RUNTIME OFFLINE'}</strong>
      <span>{status?`Active v${status.activeVersion}${status.pendingVersion?' · applying…':''}`:error}</span>
      <span title="Object ready to evaluation complete, histogram upper bound">{status?`p99 ≤ ${status.latencyUs.p99Upper} µs`:''}</span>
    </div>
    {status && <><div className="runtime-metrics">
      <span><b>{status.categoryCount}</b> persons now</span>
      <span><b>{status.crossingCount}</b> crossings</span>
      <span><b>{status.eventDelivered ?? 0}</b> events delivered · {status.eventPersisted} spooled · {status.eventPending} pending</span>
      <span>queue max {status.queueHigh} · dropped {status.dropped} · errors {status.invalid+status.eventFailed+(status.deliveryBlocked ?? 0)}</span>
    </div><div className="runtime-events">{[...status.events].reverse().slice(0,3).map(e=><span key={e.sequence}>
      #{e.sequence} Attendance · track {e.trackId} · frame {e.frameId}
    </span>)}</div></>}
  </div>;
}
