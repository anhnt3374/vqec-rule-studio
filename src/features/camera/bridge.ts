// Session messages stay between the camera page and its same-device Studio iframe.
export function cameraParentOrigin(): string | null {
  if (window.parent === window || !document.referrer) return null;
  const parent = new URL(document.referrer);
  if (parent.hostname !== location.hostname || parent.protocol !== location.protocol ||
      (parent.origin !== location.origin && !['', '443', '8443'].includes(parent.port))) return null;
  return parent.origin;
}
export function requestCameraSession(type: 'ready' | 'refresh' = 'ready') {
  const origin = cameraParentOrigin();
  if (origin) window.parent.postMessage({type:`vqec-studio:${type}`}, origin);
}
