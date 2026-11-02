import { useCallback, useEffect, useRef, useState } from 'react';
import { connectBoardWithAccess } from '@/features/camera/board';
import { setRuntimeAccess } from '@/features/runtime/store';
import { cameraParentOrigin, requestCameraSession } from '@/features/camera/bridge';
import type { WhepSource } from './useWhep';

export function useBoardConnection() {
  const [source, setSource] = useState<WhepSource | null>(null);
  const [available, setAvailable] = useState(false);
  const [status, setStatus] = useState('Waiting for camera session…');
  const access = useRef<string | null>(null), generation = useRef(0), mounted = useRef(false);
  const currentSource = useRef(source);
  useEffect(() => { currentSource.current = source; }, [source]);
  const connect = useCallback(async () => {
    const token = access.current;
    if (!token) return;
    const current = ++generation.current;
    setStatus('Connecting to board AI…');
    try {
      const next = await connectBoardWithAccess(token);
      if (mounted.current && current === generation.current) {
        setSource(next);
        setStatus('Using camera session · connected automatically');
      } else if (next.resource) {
        void fetch(next.resource, {method:'DELETE', headers:{Authorization:`Bearer ${next.token}`}, keepalive:true}).catch(() => {});
      }
    } catch (error) {
      if (mounted.current && current === generation.current)
        setStatus(error instanceof Error ? error.message : 'Camera unavailable');
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    let ready = false;
    const camera = new URL(location.href); camera.port = ''; camera.pathname = '/admin/rule-studio'; camera.search = ''; camera.hash = '';
    const origin = cameraParentOrigin();
    const receive = (event: MessageEvent) => {
      if (!ready || !origin || event.source !== window.parent || event.origin !== origin || event.data?.type !== 'vqec-studio:session') return;
      const token = event.data.access;
      if (token !== null && (typeof token !== 'string' || !token || token.length > 4096)) return;
      if (token === access.current) return;
      const first = !access.current;
      access.current = token;
      setRuntimeAccess(token);
      if (!token) { ++generation.current; setSource(null); setStatus('Camera session ended. Sign in to the camera.'); }
      else if (first || !currentSource.current) void connect(); // Parent owns refresh/logout; token rotation keeps the existing media peer.
    };
    window.addEventListener('message', receive);
    void fetch('./studio-config.json', {signal:controller.signal})
      .then(response => response.json()).then(config => {
        if (controller.signal.aborted || config.boardApi !== true) return;
        setAvailable(true); ready = true;
        if (window.parent === window) { location.replace(camera.href); return; }
        requestCameraSession();
      }).catch(() => {});
    return () => {
      mounted.current = false; controller.abort();
      window.removeEventListener('message', receive);
      setRuntimeAccess(null, access.current ?? undefined); access.current = null;
    };
  }, [connect]);
  return {source, setSource, available, boardStatus:status, reconnect:connect};
}
