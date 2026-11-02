# Camera shell integration

Rule Studio appears in the camera sidebar at `/admin/rule-studio`, with an iframe
to the same device on port8444 and `?embed=1`. Standalone8444 remains available.
The route/menu patch lives in the application repo, authorized by the user02/11.
No auth token is passed through the iframe URL. Studio automatically borrows the
camera session over a window/origin-checked message bridge; the parent owns
refresh/logout. The child keeps access in memory and has no credential form.
Standalone8444 redirects into the authenticated camera menu. A transient video
error has bounded retries; source cleanup releases only its media resource.

First style pass: local Inter variable font, camera blue/cyan action gradient,
24px translucent panels, shared background, rounded controls, focus outlines and
scrollbars. Embedded mode uses the outer camera background. Graph/scene behavior,
backend ownership, active rules and Publish semantics are unchanged.

Tokens match camera FE pin84964cd, `src/css/tailwind.css` and DashboardLayout.vue.
`src/app/styles/theme/camera.css` owns the adaptation for gradual alignment.
Inter: https://github.com/rsms/inter, SIL OFL1.1 in `public/fonts/inter/OFL.txt`.

Validation: production build/lint,42unit tests and graph/scene/Highlight browser
checks. Save/reload verification waits for Save completion before navigating.
Deployment uses the application's UI-only installer, preserving media/engine PIDs.

Auto-connect checks:43unit, build/lint; iframe ready/rotation, rejected non-parent
message, source cleanup, no child login/logout, and runtime Publish browser checks.
Board video acceptance for this change is recorded in the application docs.

02/11 deployed auto-connect on QRB142: `tools/browser/verify-auto.mjs` passed
1440p video, zero child auth requests, parent refresh without a new WHEP peer,
valid parent session after iframe close, four peers/resources past15s, fifth
viewer429 and slot reuse. `tools/board/verify-highlight.mjs` passed draft reload
and video; runtime remained version4 with configured red Highlight, no Publish.
Playback counters do not establish smoothness/FPS or AI accuracy.
