# Verification — Q5 light UI update, 2026-10-30

Deployment: `https://192.168.138.142:8444/`, release `studio.9916798c6c0e`, separate `/opt/vqec-rule-studio` prefix. Six production files fetched from board matched host build hashes. A final board-hosted browser check verified the visible Finish zone control, blocked saving an unfinished outline, and saved/restored the completed Zone before creating a Rule. Native media/API processes were kept running; frontend/model/native binary source was not modified.

## Current checks

- TypeScript, ESLint, production build: pass.
- Vitest:35unit tests pass, including independent scene save/cancel, unchanged published snapshots, system restrictions, spatial drop starting a graph edit and legacy graph presentation.
- Playwright:12browser tests pass. New coverage verifies visible drawing tools before selecting a Rule, independent Save scene, existing geometry editing, freehand Zone closure, a visible Finish zone action with incomplete-outline save protection, Scene Cancel, light mode and top/bottom handles. Existing node/edge editing, shared references, Draft/Published, refresh, resize and upload checks still pass.
- Python gateway:3allowlist tests pass. `npm audit`:0vulnerabilities.
- Managed file limits pass: at most8direct files per directory, source/style files at most300lines.

## Interaction decisions

Reference source: Q5 `WorkflowView.vue`, `FlowCanvas.vue` port-top/port-bottom, `GeometryCanvas.vue`, `workflow.css`. The light glass palette uses #0067B3/#CEE9FF; the existing three-column layout stays intact.

[DataFromSky spatial-filter documentation](https://intercom.help/datafromsky/en/articles/3656473-spatial-filters) informed the geometry-first workflow: draw on video, edit geometry independently, then drag a saved definition into the graph. Gate uses drag-to-draw. Zone supports a freehand outline or explicit vertices; redundant closing vertices are removed. Selecting the line/fill starts scene editing; selecting the label shows an explicit Edit geometry action. Endpoint/vertex hit targets were enlarged.

Scene-only editing has a separate baseline and Save scene/Cancel, and does not change Rule draft/published records. Custom graph editing keeps its combined rule/scene transaction. A pending independent scene must be saved or cancelled before switching to graph editing. System graph structure remains locked; shared geometry can be edited while viewing the template. Published snapshots remain untouched by the legacy horizontal-to-vertical presentation adapter.

## Board smoke

Real board-hosted Chromium verified light mode and AI metadata (`aiEnabled=true`, `overlayEnabled=true`), then drew a Gate before creating a Rule, saved the scene, created a Custom Rule, dragged that Gate into the graph, verified the bottom output handle, saved Draft, refreshed and restored configuration. No browser errors occurred. AI video was2560×1440; the initial connection's browser counters reported100total frames and40dropped frames. This is a functional smoke, not a steady-state FPS or recognition-accuracy acceptance. The earlier deployment check reported100frames/0drops; it does not replace this observation.

The actual native AI endpoint remains `https://192.168.138.142:8443/api/v1/media/ai/whep` (WebRTC/WHEP, no RTSP conversion). Camera credentials and tokens stay outside configuration records/repositories. The verifier closes only its own session; user sessions are preserved. No further session revocation or auth-policy changes were made for this UI update.
