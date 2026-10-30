# VQEC Rule Studio

Ứng dụng web độc lập để vẽ Gate/Zone và soạn cấu hình rule bằng graph. React + TypeScript + Vite, Tailwind v4, component shadcn/ui theo cách cài thủ công (Button/Dialog + Radix), React Flow, Zustand, Dexie/IndexedDB, Lucide. Không có backend, đăng nhập, inference, evaluator hoặc phát sự kiện.

## Chạy

Node.js 22.12+ (đã kiểm với 22.23.3).

```sh
npm install
npm run dev
```

Mở `http://localhost:5175`. Vite lắng nghe trên mạng LAN để xem từ máy khác. `npm run build` tạo `dist/`; `npm run preview` xem bản build. Khi triển khai thật, phục vụ `dist/` bằng static web server. Không cần dịch vụ của repo camera để vẽ và lưu cấu hình.

## Bố cục và thao tác

Chỉ ba cột: Rules/Operators, Graph, Camera. Không có menu hệ thống hoặc inspector thứ tư. Kéo hai vạch ngăn để resize; có thể dùng Tab rồi phím trái/phải. Giới hạn tối thiểu lần lượt 220/400/320 px; cửa sổ hẹp cuộn ngang. Khung camera chỉ có header tên, subheader filter và preview; công cụ, danh sách object mở nổi trong khung camera.

1. `+ Rule` → đặt tên → workspace ở Edit. Rule đã có mở ở View, bấm `Edit rule`.
2. Chọn **Draw Gate**, nhấn và kéo trên ảnh. Gate chưa tạo operator. Chọn **Draw Zone**, click các đỉnh rồi Enter, double-click, click gần đỉnh đầu hoặc `Finish zone` để đóng polygon.
3. Công cụ Select: kéo đường/vùng để di chuyển, kéo endpoint/vertex để sửa. Chọn nhãn để mở Objects. Tại đây Rename, Reverse (Gate), Show/Hide, Delete. Escape bỏ hình đang vẽ.
4. Kéo nhãn Gate/Zone hoặc dòng trong Objects sang graph để tạo Gate Crossing/Zone Presence có tham chiếu. `To graph` là lựa chọn thay thế. Một đối tượng có thể được nhiều node/rule dùng chung.
5. Kéo hoặc click operator từ thư viện. Kéo từ handle phải sang handle trái để nối; chọn cạnh rồi Delete để ngắt. Chọn node để mở panel cấu hình nổi. Spatial operator có dropdown và `Locate in camera`.
6. Save Draft, refresh, mở lại rule để khôi phục. Publish chỉ ghi snapshot cấu hình; không chạy logic.
7. Attendance là System Rule: graph không thể thêm/xóa/di chuyển/nối node. Chỉ được thay tham chiếu Gate/Zone và hướng qua Gate. Custom Rule đổi tên/mô tả qua `Details` khi View; xóa từ danh sách Rules.

Phím tắt: Ctrl/Cmd+S lưu Draft, Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z hoặc Ctrl/Cmd+Y redo, Ctrl/Cmd+D duplicate node, Delete/Backspace xóa node/cạnh đã chọn. Cuộn để zoom, kéo nền để pan; Controls có Fit View, minimap có pan/zoom.

## Scene và camera

Scene SVG minh họa được đóng gói cùng ứng dụng, không phải ảnh camera thật. `Camera source` cho phép nạp ảnh/video cục bộ tối đa 20 MB. Nội dung và aspect ratio được lưu vào IndexedDB cùng lần save tiếp theo. File phải được browser giải mã; SVG/PNG/JPEG và MP4 tùy codec của browser. Không phân tích video. Bật Mock chỉ hiển thị bounding box/track minh họa có nhãn MOCK, mặc định tắt.

Toàn bộ tọa độ là `[0,1]`. Ảnh/video và SVG overlay dùng chung hình chữ nhật có aspect ratio nguồn, letterbox trong camera. Resize không đổi tọa độ và không vẽ trực tiếp lên ảnh. Chọn node làm nổi Gate/Zone; chọn scene object làm nổi các node tham chiếu. Đối tượng không dùng được làm mờ; All bỏ làm mờ. Geometry chỉ sửa trong Edit của Custom Rule.

Có client **WHEP tùy chọn** để xem AI stream của service hiện hữu chạy song song. Nhập URL endpoint WHEP và media token nếu endpoint yêu cầu. Token/URL kết nối chỉ giữ trong bộ nhớ, không lưu vào draft/IndexedDB. Browser không phát RTSP; không có RTSP proxy trong repo này. Endpoint cần được service hiện hữu cấp quyền, CORS và chứng chỉ hợp lệ; HTTPS parent cần HTTPS media. Không có tự đăng nhập hoặc tự lấy media grant. Chưa nghiệm thu live AI stream trên board cho app mới; các test dùng scene cục bộ. Không thay FE/backend hoặc dịch vụ camera.

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

Tham chiếu giao diện đọc từ `vqec_camera_demo_q5/apps/edge-camera/ai-workflow-ui/src/WorkflowView.vue`, `workflow.css` (bố cục ba khung), token VQEC camera và bản FE `.deps/webui` của repo QRB5165. App mới dùng dark theme theo yêu cầu. Không import hoặc sửa source từ các repo đó. Quy tắc C17 của đường camera/AI không áp dụng cho prototype web độc lập này.

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

Desktop prototype, minimum workspace khoảng 1000 px; không tối ưu touch/mobile. Chưa hỗ trợ undo sau reload, đồng bộ nhiều tab/máy, export/import hoặc migration sang schema backend. IndexedDB bị mất khi người dùng xóa site data, dùng chế độ riêng tư hoặc browser thu hồi storage; không thay thế backup. Chưa có live board acceptance, WHEP token broker, automatic reconnect hoặc RTSP conversion. Không có rule execution, notification/event engine, inference, tracking hoặc nhận diện. Geometry dùng chung có thể ảnh hưởng preview của nhiều rule, kể cả snapshot đã Published, theo thiết kế tham chiếu ID.
