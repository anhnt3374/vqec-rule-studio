# VQEC Rule Studio

Ứng dụng web độc lập để vẽ Gate/Zone và soạn cấu hình rule bằng graph. React + TypeScript + Vite, Tailwind v4, component shadcn/ui theo cách cài thủ công (Button/Dialog + Radix), React Flow, Zustand, Dexie/IndexedDB, Lucide. Không có backend, đăng nhập, inference, evaluator hoặc phát sự kiện.

## Chạy

Node.js 22.12+ (đã kiểm với 22.23.3).

```sh
npm install
npm run dev
```

Mở `http://localhost:5175`. Vite lắng nghe trên mạng LAN để xem từ máy khác. `npm run build` tạo `dist/`; `npm run preview` xem bản build. Khi triển khai thật, phục vụ `dist/` bằng static web server. Không cần dịch vụ của repo camera để vẽ và lưu cấu hình.

## Chạy trên board QRB142

Studio: **https://192.168.138.142:8444/**. Camera/API hiện hữu: **https://192.168.138.142:8443/**. Chấp nhận chứng chỉ development của thiết bị khi browser hỏi.

Mở `Camera source` → nhập tài khoản camera hiện có → `Connect board AI`. Studio gọi API danh sách camera và metadata `streamType=AI` để nhận media grant, rồi phát video WebRTC. Không nhúng tài khoản/token trong asset hoặc lưu vào IndexedDB. Access token được làm mới trong bộ nhớ khi xem; đóng/ngắt kết nối/refresh sẽ đóng phiên Studio; refresh khôi phục rule đã lưu, và kết nối camera cần thực hiện lại.

Endpoint video AI được xác nhận từ API:

```text
https://192.168.138.142:8443/api/v1/media/ai/whep
```

Đây là **WHEP/WebRTC**, không phải RTSP. Bản native AI đang chạy không mở listener RTSP 554/8554. Không dùng URL RTSP của service demo cũ để đại diện cho luồng native này.

Build trên host và triển khai (SSH root đã cấu hình ngoài repo):

```sh
python3 tools/board/deploy.py
```

Script tạo release có manifest/hash dưới `/opt/vqec-rule-studio/releases/`, cập nhật symlink `current` và bật `vqec-rule-studio.service`. Board không cần Node/npm. Service Python chuẩn chỉ phục vụ static HTTPS và chuyển một danh sách endpoint hẹp sang API camera hiện có; không xử lý frame, không có DB, evaluator hoặc hệ thống tài khoản riêng. Chứng chỉ/key đọc tại đường dẫn thiết bị hiện có, không đóng gói trong repo. Cấu hình này dùng cho board dev/LAN.

```sh
systemctl status vqec-rule-studio.service
systemctl stop vqec-rule-studio.service
systemctl disable vqec-rule-studio.service
```

Studio autostart sau reboot; hai unit AI candidate hiện hữu là runtime unit, giữ cơ chế quản lý riêng của repo camera. Gateway không tự khởi động/chuyển phiên bản camera. Chạy `node tools/board/verify.mjs` trên host để kiểm AI live + vẽ/lưu/reload; credential đọc từ file private ngoài repo, không in ra. Có thể chạy `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests/board` để kiểm các route gateway được phép.

## Luồng vẽ và sửa scene (cập nhật theo Q5 / DataFromSky)

- Toolbar camera luôn hiện chữ **Select**, **Draw Gate**, **Draw Zone**. Có thể vẽ trước khi tạo/chọn Rule.
- **Draw Gate**: nhấn và kéo một đường. **Draw Zone**: kéo đường bao để tự khép vùng, hoặc click các đỉnh rồi Enter / double-click / click đỉnh đầu.
- Chọn đường/vùng để bắt đầu sửa scene. Kéo cả đường/phần fill để di chuyển; kéo endpoint/vertex để đổi hình. Chọn nhãn chỉ mở thông tin; bấm **Edit geometry** để sửa. Panel object gọn ở đáy có Rename, Reverse, Delete. Nút **Objects** mở toàn bộ thư viện scene.
- Khi chưa sửa graph, scene có **Save scene / Cancel** riêng. Lưu vào IndexedDB không đổi Draft/Published của Rule. Khi đang sửa Custom Rule, scene được lưu cùng Rule qua **Save with rule** hoặc Save Draft trên graph.
- Lưu scene xong → chọn Custom Rule → kéo nhãn Gate/Zone vào graph. Thao tác drop bắt đầu phiên sửa graph nếu Rule đang ở View; việc tạo geometry không tự thêm node.
- Attendance vẫn khóa cấu trúc graph. Khi chỉ xem Attendance, có thể sửa scene toàn cục mà không đổi snapshot graph. Khi đang sửa tham số System Rule, hoàn tất/Cancel phiên đó trước khi sửa scene.
- Graph nối **dọc**, input trên/output dưới; node thêm mới xếp từ trên xuống. Graph cũ được chiếu sang bố cục dọc khi mở, không ghi đè snapshot Published hoặc mất ID/configuration.

Tham chiếu: source Q5 `WorkflowView.vue`, `FlowCanvas.vue` (port-top/port-bottom), `GeometryCanvas.vue`, `workflow.css`; [DataFromSky Spatial Filters](https://intercom.help/datafromsky/en/articles/3656473-spatial-filters) cho luồng vẽ → chỉnh geometry → kéo thành operator. Không triển khai evaluator của DataFromSky.

## Bố cục và thao tác

Chỉ ba cột: Rules/Operators, Graph, Camera. Không có menu hệ thống hoặc inspector thứ tư. Kéo hai vạch ngăn để resize; có thể dùng Tab rồi phím trái/phải. Giới hạn tối thiểu lần lượt 220/400/320 px; cửa sổ hẹp cuộn ngang. Khung camera chỉ có header tên, subheader filter và preview; công cụ, danh sách object mở nổi trong khung camera.

1. Có thể vẽ scene trước theo hướng dẫn trên. `+ Rule` → đặt tên → workspace ở Edit. Rule đã có mở ở View, bấm `Edit rule`.
2. Chọn **Draw Gate**, nhấn và kéo trên ảnh. Gate chưa tạo operator. Chọn **Draw Zone**, click các đỉnh rồi Enter, double-click, click gần đỉnh đầu hoặc `Finish zone` để đóng polygon.
3. Công cụ Select: kéo đường/vùng để di chuyển, kéo endpoint/vertex để sửa. Chọn nhãn để mở Objects. Tại đây Rename, Reverse (Gate), Show/Hide, Delete. Escape bỏ hình đang vẽ.
4. Kéo nhãn Gate/Zone hoặc dòng trong Objects sang graph để tạo Gate Crossing/Zone Presence có tham chiếu. `To graph` là lựa chọn thay thế. Một đối tượng có thể được nhiều node/rule dùng chung.
5. Kéo hoặc click operator từ thư viện. Kéo từ handle dưới sang handle trên để nối; chọn cạnh rồi Delete để ngắt. Chọn node để mở panel cấu hình nổi. Spatial operator có dropdown và `Locate in camera`.
6. Save Draft, refresh, mở lại rule để khôi phục. Publish chỉ ghi snapshot cấu hình; không chạy logic.
7. Attendance là System Rule: graph không thể thêm/xóa/di chuyển/nối node. Chỉ được thay tham chiếu Gate/Zone và hướng qua Gate. Custom Rule đổi tên/mô tả qua `Details` khi View; xóa từ danh sách Rules.

Phím tắt: Ctrl/Cmd+S lưu Draft, Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z hoặc Ctrl/Cmd+Y redo, Ctrl/Cmd+D duplicate node, Delete/Backspace xóa node/cạnh đã chọn. Cuộn để zoom, kéo nền để pan; Controls có Fit View, minimap có pan/zoom.

## Scene và camera

Scene SVG minh họa được đóng gói cùng ứng dụng, không phải ảnh camera thật. `Camera source` cho phép nạp ảnh/video cục bộ tối đa 20 MB. Nội dung và aspect ratio được lưu vào IndexedDB cùng lần save tiếp theo. File phải được browser giải mã; SVG/PNG/JPEG và MP4 tùy codec của browser. Không phân tích video. Bật Mock chỉ hiển thị bounding box/track minh họa có nhãn MOCK, mặc định tắt.

Toàn bộ tọa độ là `[0,1]`. Ảnh/video và SVG overlay dùng chung hình chữ nhật có aspect ratio nguồn, letterbox trong camera. Resize không đổi tọa độ và không vẽ trực tiếp lên ảnh. Chọn node làm nổi Gate/Zone; chọn scene object làm nổi các node tham chiếu. Đối tượng không dùng được làm mờ; All bỏ làm mờ. Click đường/vùng bắt đầu phiên sửa scene; graph vẫn giữ chế độ View cho đến khi người dùng sửa graph.

Có client **WHEP tùy chọn** để xem AI stream của service hiện hữu chạy song song. Nhập URL endpoint WHEP và media token nếu endpoint yêu cầu. Token/URL kết nối chỉ giữ trong bộ nhớ, không lưu vào draft/IndexedDB. Browser không phát RTSP; không có RTSP proxy trong repo này. Endpoint cần được service hiện hữu cấp quyền, CORS và chứng chỉ hợp lệ; HTTPS parent cần HTTPS media. Không có tự đăng nhập hoặc tự lấy media grant. Đã kiểm live AI trên QRB142 qua gateway của Studio; xem `docs/verification.md`. Không thay FE/backend hoặc dịch vụ camera.

Sau này có thể nhúng bằng iframe:

```html
<iframe
  src="https://studio.example/"
  title="VQEC Rule Studio"
  style="width:100%;height:100%;border:0"
></iframe>
```

Static host cần cho phép iframe từ parent qua CSP/frame policy. IndexedDB thuộc origin của studio; browser có thể partition/chặn storage trong iframe khác origin. Nên phục vụ cùng origin hoặc kiểm chính sách browser. Không có postMessage bridge trong phiên bản này.

## Dữ liệu và persistence

`src/models/types.ts` định nghĩa Rule, RuleGraph, OperatorNode/Edge/Definition/Config, CameraScene, SpatialObject, GateGeometry, ZoneGeometry, DraftSnapshot, PublishedSnapshot.

- CameraScene → SpatialObjects. Đây là dữ liệu geometry dùng chung, không nhúng bản sao vào node.
- Rule → Graph → OperatorNodes → `config.spatialId`; Edges dùng ID/handle ổn định.
- Working copy: state Zustand trong RAM, thay đổi báo Unsaved.
- Saved draft: bảng `drafts`, đồng thời bảng `rules` giữ phiên bản cấu hình đã lưu gần nhất để mở workspace.
- Published snapshot: bảng `published` riêng, chỉ Publish thay. Sửa/lưu Draft của rule Published không đụng snapshot cũ. Snapshot giữ cấu hình và ID geometry, không đóng băng geometry dùng chung.
- CameraScene: bảng `scenes`, save cùng rule/draft/published trong một transaction Dexie. Không có autosave geometry khi đang kéo. Cancel phục hồi rule + scene về mốc bắt đầu edit/lần save gần nhất.

**Save** lưu Draft và về View; **Save Draft** lưu Draft và tiếp tục Edit; **Publish** kiểm cấu trúc, lưu Draft + snapshot Published rồi về View. **Cancel** yêu cầu xác nhận khi có thay đổi và bỏ phần chưa lưu. Quay lại Rules cũng yêu cầu bỏ thay đổi. Refresh chưa save có cảnh báo browser; chỉ cấu hình đã save được bảo đảm khôi phục. Undo/redo có tối đa 60 bước trong phiên edit và bắt đầu lại sau save.

Xóa Custom Rule giữ nguyên geometry. Xóa geometry đang được working copy, saved rule hoặc Published snapshot tham chiếu bị chặn và hiện tên các rule phụ thuộc; không xóa node âm thầm. Muốn xóa phải bỏ tham chiếu và lưu/Publish lại rule liên quan. Geometry mới tạo hoặc chưa tham chiếu có thể xóa rồi save.

Validation chỉ kiểm metadata bắt buộc, ID duy nhất, tham chiếu đúng loại Gate/Zone, node/handle tồn tại, kết nối đầu vào/ra và khóa System Rule. Không đánh giá ý nghĩa nghiệp vụ, cú pháp schedule, quan hệ tập hợp, runtime sequence hoặc logic Attendance. Chưa có evaluator.

## Kiến trúc

- `src/app`: bootstrap, lỗi render, theme.
- `src/components/{layout,rules,operators,graph,scene,ui}`: UI tái sử dụng, không truy cập Dexie trực tiếp.
- `src/stores`: Zustand store ghép các slice lifecycle, graph/history và scene; kiểm quyền chỉnh sửa tập trung.
- `src/features/persistence`: schema và transaction IndexedDB.
- `src/features/{graph-editor,scene-editor}`: structural validation và toán tọa độ.
- `src/hooks`: scene pointer interaction, keyboard, client WHEP.
- `src/data`: operator catalog, ba rule mẫu và scene mẫu.
- `tests/unit`, `tests/e2e`: persistence/state/geometry và thao tác browser thật.

Tham chiếu giao diện đọc từ `vqec_camera_demo_q5/apps/edge-camera/ai-workflow-ui/src/WorkflowView.vue`, `workflow.css` (bố cục ba khung), token VQEC camera và bản FE `.deps/webui` của repo QRB5165. App dùng light/glass theme theo Q5, màu thương hiệu #0067B3 và surface #CEE9FF. Không import hoặc sửa source từ các repo đó. Quy tắc C17 của đường camera/AI không áp dụng cho prototype web độc lập này.

## Kiểm tra

```sh
npm run type-check
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Unit test kiểm save/restore, Draft/Published, Cancel, geometry dùng chung, spatial drop, undo/redo, System Rule và validation. Browser test kiểm vẽ, kéo vào graph, khôi phục sau reload, publish, resize, nối/xóa edge, sửa điểm và upload scene. `npm audit` dùng để kiểm dependency hiện tại. Chi tiết lượt kiểm cuối trong `docs/verification.md`.

## Giới hạn

Desktop prototype, minimum workspace khoảng 1000 px; không tối ưu touch/mobile. Chưa hỗ trợ undo sau reload, đồng bộ nhiều tab/máy, export/import hoặc migration sang schema backend. IndexedDB bị mất khi người dùng xóa site data, dùng chế độ riêng tư hoặc browser thu hồi storage; không thay thế backup. Live WHEP trên board đã kiểm; chưa có automatic reconnect hoặc RTSP conversion. Không có rule execution, notification/event engine, inference, tracking hoặc nhận diện. Geometry dùng chung có thể ảnh hưởng preview của nhiều rule, kể cả snapshot đã Published, theo thiết kế tham chiếu ID.

## Attendance device runtime (01/11/2026)

The fixed system graph is Category person/pedestrian → directed Gate → Attendance.
Camera is on the left, the operator library in the middle, and the graph on the
right. Edge badges show current category membership and cumulative crossings.
Old fixed Gate→Category documents are normalized without rewriting published history.

Drafts remain browser-local. Publish validates this supported subset, sends
`PUT /api/v1/rules/attendance`, and waits for the active runtime version ACK.
Other graphs remain authoring-only and are rejected by runtime compilation.
Telemetry shows logic latency, spool and delivery separately; the browser does
not execute attendance logic. Device runtime configuration is currently volatile
and resets to default on media restart; local Published is not durable board config.

Deploy the built dist with the application attendance package, which supplies
`studio-config.json` with `boardApi:true`. Open `/rules.html` for the iframe or
`/rule-studio/index.html` directly. Source → Connect board AI uses an existing
onboarded camera account; session tokens stay in memory. WebRTC needs a reachable
QDC route independently of HTTPS. No camera FE source changes are required.

Checks: `npm test`, `npm run build`, and
`npx playwright test -c config/playwright.config.ts tests/e2e/attendance-runtime.spec.ts`.
Set `PLAYWRIGHT_EXECUTABLE_PATH` to an existing Chromium when needed. The browser
contract test mocks API replies; it does not certify QDC video or inference.
