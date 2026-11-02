import { Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function BoardSource({available,status,reconnect}:{available:boolean;status:string;reconnect:()=>void}) {
  if (!available) return null;
  return <section className="source-section">
    <span className="eyebrow">THIS BOARD · AI CAMERA</span>
    <p>The board connects automatically using your camera session. No separate login is needed.</p>
    <p role="status">{status}</p>
    <Button type="button" className="mt-3" onClick={reconnect}><Radio/>Reconnect board AI</Button>
  </section>;
}
