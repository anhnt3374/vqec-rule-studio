# Native Rule Studio backend

02/11: Studio owns durable attendance configuration and block3 analysis in a
separate C17 daemon. Camera owns block1/2 and block4 event/OSD decisions. The
former forwarding-only rule gateway is replaced; video/auth still use camera API.

```text
Studio UI -> /studio-api/v1/rules/attendance -> HTTPS gateway -> control.sock
                                                         -> SQLite config
Camera ObjectFrame -> bounded metadata worker -> analysis.sock -> C engine
Camera block4      <- provenance/version + analytic hits     <-/
     -> event outbox / drawing decisions
```

The gateway validates the camera session via GET profile and requires the
administrator role before contacting Studio's private socket. No separate account
database. Both sockets require same-UID peers and a private0700 runtime directory.
Python serves static HTTPS/control routing only; no evaluation or frame handling.

`backend/engine` owns the attendance engine, ported from camera source
`c969f17ee526`; it has no camera/media dependency. Supported graph remains
Category person/pedestrian -> directed Gate -> Attendance. General graph operators,
identity/attribute filters and the full EvaluationBatch ABI remain unimplemented.

Publish validates a candidate, commits its intent to SQLite WAL/FULL, then
activates at the next metadata boundary. The response distinguishes pending/active
versions. Restart restores the committed intent and resets analytic history; it
never substitutes a default gate. Empty DB means unconfigured. Browser drafts stay
local; only a successful Publish changes the backend. A failed commit keeps the
active configuration. Disk I/O runs on a separate control thread without holding
the engine lock. A stalled syscall can still delay stop; no hard fsync deadline.

IPC v1 uses SOCK_SEQPACKET, fixed LE64 words/IEEE float bits, no struct memcpy or
pointer ABI. `ipc/wire.h` is mirrored in the camera adapter and checked byte for
byte during integration. Each input carries source/AI/gallery epochs, sequence,
frame/revision/PTS, canonical2560x1440, availability/gap and at most32 projected
attendance objects. It does not transport full property/lifecycle arrays. Replies
echo provenance and contain engine epoch/config version and at most32 track hits.
There is one ordered camera peer and one in-flight request, 100ms client timeout;
the camera's existing3-slot metadata queue never blocks capture/coordinator.

Projection copies at most32 object value records into the camera queue; packing
materializes104+48*N metadata bytes and reply152+16*hits bytes. Unix transport
adds user/kernel copies in each direction; this is not SHM/metadata zero-copy.
No raw pixel/FD enters Studio and no camera buffer is retained by this exchange.
Disconnect/timeout/sequence gaps, source/AI/gallery changes and reactivation reset
motion continuity. The camera validates reply provenance and subjects before
block4. It reports unavailable on failure and never falls back to inline analysis.
Analytic completion is not durable event ACK: an IPC/process failure can lose an
occurrence before camera outbox persistence. There is no result journal/replay or
exactly-once guarantee; SHM and the general block3 ABI are future adapters.

Build with the existing host/BSP dependency installation:

```sh
python3 tools/backend/build.py --camera-root ../vqec_ai_vision_application_qrb5165 --target host --sanitize
python3 tools/backend/build.py --camera-root ../vqec_ai_vision_application_qrb5165 --target arm
STUDIO_BACKEND="$PWD/build/backend-host-sanitize/vqec-rule-studio-backend" python3 backend/tests/runtime.py
python3 tools/board/deploy.py --backend-binary build/backend-arm/vqec-rule-studio-backend
```

Systemd owns `/run/vqec-rule-studio`, `/var/lib/vqec-rule-studio/attendance.sqlite3`
and the native backend unit. Gateway remains8444. The camera adapter must be
deployed separately; starting this daemon does not switch camera ownership.
Host tests cover durable config/restart, pending activation, directed crossing,
gap/empty/generation/revision resets, malformed IPC and idle-peer shutdown. With
`STUDIO_CAMERA_TEST` set, the same suite checks the actual C camera adapter,
32-event durable outbox and backend-absent behavior. Fixtures are synthetic;
they do not establish person tracking/counting accuracy or live video latency.

Deployed02/11 on QRB142 as `studio.e0fb793f8c6f` (code918ce17), with camera
adapter93f4c89897c3. Native ARM fixtures passed on board (six tests, source-hash
test host-only). Both native/gateway units and camera media/API are active with
zero automatic restarts. Restarting only the native owner restored migrated gate
version1 without changing the camera PID; DB quick_check passed. Gateway requires
auth401, blocks the old Studio proxy403, rejects invalid Publish422.

Real Chromium156: AI2560x1440,100frames/37dropped plus150frames/54dropped;
same-geometry Publish acknowledged activeVersion2 and DB stored version2. No
browser errors; test session logged out. Native snapshot2287batches/invalid0,
initial gap1/crossings0, evaluation10us/max538us. No live crossing/counting accuracy,
IPC end-to-end percentile, smoothness or soak claim. Source/engine sockets may
briefly be absent after systemd Type=simple reports active; clients must use
application readiness rather than treating that unit state as an activation ACK.
