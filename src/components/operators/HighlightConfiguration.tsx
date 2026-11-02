import type { OperatorConfig } from '@/models/types';
export function HighlightConfiguration({config,locked,change}:{
  config:OperatorConfig;locked:boolean;change:(patch:Partial<OperatorConfig>)=>void;
}) {
  return <>
    <label className="field">Enable Highlight
      <input type="checkbox" disabled={locked} checked={config.highlightEnabled!==false}
        onChange={e=>change({highlightEnabled:e.target.checked})}/>
    </label>
    <label className="field">Highlight color
      <input type="color" aria-label="Highlight color" disabled={locked} value={config.highlightColor ?? '#ff0000'}
        onChange={e=>change({highlightColor:e.target.value})}/>
      <span>{config.highlightColor ?? '#ff0000'}</span>
    </label>
    <p>Keep the color until the track ends or loses continuity. No time limit.</p>
    <p>Attendance still triggers when Highlight is disabled.</p>
  </>;
}
