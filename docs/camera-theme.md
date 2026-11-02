# Camera shell integration

Rule Studio appears in the camera sidebar at `/admin/rule-studio`, with an iframe
to the same device on port8444 and `?embed=1`. Standalone8444 remains available.
The route/menu patch lives in the application repo, authorized by the user02/11.
No auth token is passed through the iframe URL; Studio retains its existing login.

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
