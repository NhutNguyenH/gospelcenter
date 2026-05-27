# Hướng dẫn sử dụng — Widget dịch gospelcenter.net

## Workflow tổng quát

Mỗi khi anh thêm trang mới hoặc đổi nội dung trang cũ, làm 4 bước:

1. **Trích chuỗi** (DevTools snippet trong Edge InPrivate)
2. **Lưu vào file** `strings/<tên-trang>.json`
3. **Chạy** `/translate` trong Claude Code
4. **Push + purge** jsDelivr

Trang web đã publish vẫn chạy bằng `widget.js` từ jsDelivr. Anh KHÔNG cần đụng vào widget.html / widget-subpage.html nữa sau lần paste đầu.

---

## Trường hợp 1 — Chỉnh sửa nội dung trang HIỆN CÓ

Ví dụ: anh đổi câu "Welcome to our spiritual family" trên trang husgrupper.

### Bước 1: Sửa trên website builder

1. Vào builder admin, mở trang muốn sửa.
2. Đổi text tiếng Anh như bình thường. **Save + Publish.**
3. Đăng xuất builder (hoặc đóng tab admin) — KHÔNG cần thiết nhưng giúp tránh nhầm.

### Bước 2: Trích chuỗi mới từ trang public

1. Mở Edge → `Ctrl + Shift + N` (cửa sổ **InPrivate**, để builder admin không inject chrome).
2. Gõ URL trang public, ví dụ `https://gospelcenter.net/no/churches/oslo/husgrupper`.
3. Bấm nút **EN** (đảm bảo text về tiếng Anh gốc trước khi extract).
4. `F12` → tab **Console**.
5. Gõ lệnh reset:
   ```js
   localStorage.removeItem("__deepl_extract_strings__")
   ```
   Enter.
6. Mở `C:\Evidi\Privat\ClaudeCode\WebHoiThanh\deepl-translator\extract-strings.js` trong Notepad → `Ctrl+A` `Ctrl+C` (copy toàn bộ).
7. Quay lại Console → `Ctrl+V` → Enter.
   - Nếu Edge chặn dán: gõ `allow pasting` rồi Enter, dán lại.
8. Console in mảng JSON. Clipboard đã tự copy mảng đó.

### Bước 3: Ghi đè file strings

1. Mở `C:\Evidi\Privat\ClaudeCode\WebHoiThanh\deepl-translator\strings\<tên-trang>.json` trong Notepad.
   - Ví dụ husgrupper: mở `strings\cellgroup.json`.
2. `Ctrl+A` xóa hết nội dung cũ.
3. `Ctrl+V` dán clipboard.
4. `Ctrl+S` lưu.

### Bước 4: Chạy `/translate` trong Claude Code

Gõ `/translate` trong chat. Claude sẽ:
- Đọc tất cả `strings/*.json`
- Gửi Gemini API dịch sang VI + NO
- Ghi `translations.json` + `translations.js`
- Báo cáo số chuỗi + preview vài bản dịch

Nếu output có chỗ dịch sai, anh báo Claude — Claude sẽ sửa tay trong `translations.json`.

### Bước 5: Push + purge

```bash
git add strings/ translations.json translations.js
git commit -m "Update <tên-trang> translations"
git push
```

Mở 2 URL trong Edge để purge jsDelivr (chạy 1-2 giây rồi đóng tab):
```
https://purge.jsdelivr.net/gh/NhutNguyenH/gospelcenter@latest/translations.json
https://purge.jsdelivr.net/gh/NhutNguyenH/gospelcenter@latest/translations.js
```

Nếu response báo `"throttled": true` → đợi đủ số giây ghi trong `throttlingReset` rồi purge lại.

### Bước 6: Verify

Đóng + mở lại cửa sổ InPrivate (để bypass browser cache cũ) → vào trang đã sửa → bấm NO/VI → text phải dịch đúng nội dung mới.

---

## Trường hợp 2 — Thêm trang MỚI

Ví dụ: anh tạo trang `/no/churches/oslo/lederteam`.

### Bước 1: Tạo trang trong builder

1. Tạo trang mới trong builder admin với content tiếng Anh.
2. Trong layout, thêm **HTML widget** ở vị trí nào đó (thường cuối page).
3. Mở `C:\Evidi\Privat\ClaudeCode\WebHoiThanh\deepl-translator\widget-subpage.html` trong Notepad.
4. Copy toàn bộ → paste vào HTML widget → save.
5. Publish trang.

### Bước 2-6: Y hệt Trường hợp 1

Nhưng:
- Ở **Bước 3**, thay vì ghi đè file cũ, tạo file MỚI `strings\<tên-trang>.json`.
  Ví dụ: `strings\lederteam.json`.
- Ở **Bước 5**, lệnh git nhớ add file mới: `git add strings/lederteam.json`.

---

## Trường hợp 3 — Chỉ sửa 1 chuỗi nhỏ (không re-extract toàn trang)

Ví dụ: anh muốn đổi bản dịch tiếng Việt của "Cell Groups" từ "Nhóm Tế Bào" sang "Nhóm Nhỏ" mà không đổi text trên website.

1. Mở `translations.json` trong Notepad.
2. Tìm `"Cell Groups"` → sửa giá trị `"vi"`.
3. Save.
4. Tạo `translations.js` mới (cùng nội dung). **Hoặc** chạy `/translate` để Claude tự regen `translations.js` từ `translations.json` (nhưng /translate sẽ re-dịch toàn bộ → mất công).
   - Cách nhanh: hỏi Claude "regenerate translations.js from translations.json" — Claude sẽ làm 5 giây xong.
5. Push + purge như trường hợp 1.

---

## Lưu ý quan trọng (đọc kỹ!)

### A. KHÔNG đổi `@latest` về `@main`

`widget.html` + `widget-subpage.html` đang dùng `@latest`:
```html
<script src="https://cdn.jsdelivr.net/gh/NhutNguyenH/gospelcenter@latest/widget.js"></script>
```

jsDelivr `@main` resolution lag rất tệ (đôi khi >1 giờ). `@latest` reliable hơn. Đừng đổi lại.

### B. 16 key nav cũ trong `translations.json`

Có 16 key nav (About Us, CHURCHES, Cell Groups, Mission, ...) hiện chỉ tồn tại trong `translations.json` mà KHÔNG có trong `strings/home.json`. Lý do: lúc dịch lần đầu chúng được merge thủ công từ phiên bản cũ.

**Rủi ro**: nếu anh re-extract home.json và 16 key đó không xuất hiện trong DOM (ví dụ extract trong InPrivate nhưng builder ẩn nav), `/translate` sẽ ghi đè `translations.json` và **mất** 16 key đó → CHURCHES không dịch nữa.

**Phòng tránh**: trước khi `/translate` sau khi re-extract home.json, mở `strings/home.json` xem có đủ các key sau không:
- `About Us`, `CHURCHES`, `Camps`, `Cell Groups`, `Churches`, `Courses`, `English`,
- `Jobs`, `Languages`, `Lectures`, `Mission`, `News`, `SMS`, `Study Abroad`,
- `Training`, `Vision`

Nếu thiếu → thêm thủ công vào `strings/home.json` (mỗi key 1 dòng trong mảng JSON) trước khi `/translate`. Hoặc báo Claude "merge nav keys" → Claude tự xử.

### C. Chỉ extract trong InPrivate

KHÔNG extract khi đang login website builder — sẽ bắt cả admin chrome (cs-menu-link, _module/...) làm rác data → tốn quota Gemini + sai key.

### D. Quota Gemini

- Free tier `gemini-2.5-flash-lite`: **1000 request/ngày** (đủ thoải mái).
- Mỗi `/translate` dùng số request = `ceil(số chuỗi unique / 20)`. Project hiện ~65 key → 4 request.
- Nếu hết quota: đợi tới **15:00 giờ VN** (PT midnight) quota reset.

### E. Cache jsDelivr

Sau push, browser người dùng có thể vẫn xem bản cũ vì cache 12h CDN + 7 ngày browser. Cần purge URL như Bước 5.

---

## Khi gặp sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách xử |
|---|---|---|
| Bấm NO/VI không đổi text | Browser cache widget.js cũ | Đóng + mở lại cửa sổ InPrivate; nếu vẫn không được, `Ctrl+Shift+Delete` clear cache |
| Console báo "Thiếu bản dịch" cho text public | Chuỗi chưa có trong `strings/*.json` | Thêm thủ công vào strings file + /translate |
| Console báo "Thiếu bản dịch" cho admin chrome | Trang test đang login admin builder | Mở lại trong InPrivate (logout) |
| Purge báo `"throttled": true` | jsDelivr rate-limit | Đợi `throttlingReset` giây rồi purge lại |
| `/translate` báo HTTP 429 quota | Hết quota ngày | Đợi tới ~15:00 giờ VN |
| Sau push vẫn thấy bản cũ trên web | jsDelivr edge cache chưa refresh | Purge URL như Bước 5, đợi 30 giây |

---

## File quan trọng

| File | Vai trò |
|---|---|
| `extract-strings.js` | Snippet paste vào DevTools để quét chuỗi. KHÔNG sửa. |
| `strings/<page>.json` | Mảng chuỗi tiếng Anh từng trang. Anh sửa file này khi cần. |
| `translations.json` | Bản dịch dạng JSON. Có thể sửa tay. |
| `translations.js` | Auto-gen từ translations.json. KHÔNG sửa tay. |
| `widget.js` | Logic dịch chạy trong browser. KHÔNG sửa trừ khi có bug. |
| `widget.html` | Đoạn HTML paste vào trang HOME (có nút EN/VI/NO). |
| `widget-subpage.html` | Đoạn HTML paste vào trang SUB (chỉ 1 thẻ script). |
| `.env` | Chứa `GEMINI_API_KEY`. KHÔNG commit (đã gitignore). |

---

## Quick reference — commands

```bash
# Test pipeline local (Claude Code)
/translate

# Commit + push sau khi update strings hoặc translations
git add strings/ translations.json translations.js
git commit -m "Update translations"
git push

# Purge jsDelivr (mở trong Edge)
https://purge.jsdelivr.net/gh/NhutNguyenH/gospelcenter@latest/widget.js
https://purge.jsdelivr.net/gh/NhutNguyenH/gospelcenter@latest/translations.json
https://purge.jsdelivr.net/gh/NhutNguyenH/gospelcenter@latest/translations.js

# Test local trước khi push (PowerShell)
python -m http.server 8000
# rồi mở http://localhost:8000/test-local.html trong Edge
```
