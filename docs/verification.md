# Verification — 2026-10-30

Host: Node.js 22.23.3, Chromium headless via Playwright. Browser tests use independent contexts and local IndexedDB. No board or production camera service was modified.

- `npm run type-check`: pass.
- `npm run lint`: pass.
- `npm test`: 20 tests pass (persistence/lifecycle, shared geometry, system restrictions, structural validation, normalized coordinates and history status).
- `npm run test:e2e`: 8 tests pass. Real pointer drawing, Gate → graph drag, endpoint/whole-object movement, zone vertex edits, splitters, handle connection/edge deletion, configuration, duplicate/delete/undo, Draft reload, Published isolation, Cancel, shared-object dependency warning, image upload and Custom Rule deletion.
- `npm run build`: pass; static `dist/` generated. Production preview smoke test also saved/reloaded a modified draft with zero browser errors.
- `npm audit`: zero vulnerabilities at verification time; dependency versions locked in package-lock.json.
- Managed-directory/file limits: pass (at most 8 files per directory and 300 lines per source/style file).

Manually inspected browser rendering at 1600 × 1000: three columns only, full-height camera column, filter subheader, floating scene/object controls and node configuration. Preview and SVG share a letterboxed rectangle; resize browser tests confirm geometry coordinates stay unchanged.

## Board deployment and AI stream

Studio deployed at `https://192.168.138.142:8444/`, release `studio.6ff72eb15c6f`, under its own `/opt/vqec-rule-studio` prefix and systemd unit. Static HTTPS gateway forwards only explicit existing camera auth/discovery/AI signaling endpoints to native API port8443; it never handles pixel frames or evaluates rules. Existing FE source, AI source, model config and native release binaries were not modified.

Existing `vqec-vision-ai-dev-media` and `vqec-vision-ai-dev-api` were inactive when inspected and started using the already installed `ai-dev.e7acb574de43` units. Board listener inspection confirms8443/8444 and no RTSP554/8554. API returned AI URL `https://192.168.138.142:8443/api/v1/media/ai/whep`, protocolWEBRTC, aiEnabled=true, overlayEnabled=true. This is not an RTSP endpoint.

Real Chromium on the board-hosted application decoded100frames of2560×1440 AI video with0dropped frames and0browser errors. Then drew a Gate over live video, dragged it into the graph, saved Draft, refreshed and restored geometry/node from IndexedDB. This verifies display/configuration only; it does not certify recognition accuracy or implement an evaluator.

Camera login initially returned429 because16old admin sessions filled the existing limit, all with expired access tokens. The user explicitly approved revocation. A private SQLite backup was retained outside repositories; only those expired-access admin sessions were revoked. Password/account configuration and auth policy were not changed. The new test session logged out on refresh; subsequent read-only inspection found0sessions. Native API/media and Studio remained active withNRestarts0; Studio memory observed13.4MB at that check (one observation, not a soak result).

Additional verification:4board API integration tests and4session lifecycle tests (28unit tests total),3Python gateway allowlist tests, existing8Chromium interaction tests, type-check/lint/build. Camera session access is refreshed only in memory during viewing; teardown retries logout after refresh if access expired, with bounded requests and an idempotent cleanup. Board verification helper reads credentials from a private host file; no password/media/access token is committed or printed. No RTSP conversion, AI inference changes, business-rule evaluation or event generation was added.
