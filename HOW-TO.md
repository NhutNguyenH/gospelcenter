# Hướng dẫn sử dụng — Widget dịch gospelcenter.net

## Workflow tổng quát

Mỗi khi anh thêm trang mới hoặc đổi nội dung trang cũ, làm 4 bước:

1. **Trích chuỗi** (DevTools snippet trong Edge InPrivate)
2. **Lưu vào file** `strings/<tên-trang>.json`
3. **Chạy** `/translate` trong Claude Code
4. **Push + purge** jsDelivr

Trang web đã publish vẫn chạy bằng `widget.js` từ jsDelivr. Anh KHÔNG cần đụng vào widget.html / widget-subpage.html nữa sau lần paste đầu.

## Mô hình ngôn ngữ — en/vi/no

Mỗi entry trong `translations.json` có 3 field:
- **`en`**: tiếng Anh. Nếu source text gốc đã là tiếng Anh thì field này = source. Nếu source là Norwegian (như "Adresse" trong footer) → en = "Address".
- **`vi`**: tiếng Việt.
- **`no`**: tiếng Na Uy Bokmål. Nếu source đã là Norwegian → no = source verbatim.

Click EN: widget dùng `entry.en` để dịch active sang tiếng Anh. Nếu entry không có `en` field → widget khôi phục source gốc (backward compat — phù hợp khi source đã là tiếng Anh).

**Reverse-index (widget.js)**: widget không chỉ match text theo source key, mà còn dò ngược qua MỌI giá trị en/vi/no. Nghĩa là dù text trên trang đang ở tiếng Anh, Việt hay Na Uy, widget vẫn nhận ra nhóm dịch và áp đúng ngôn ngữ. Ưu tiên match key trực tiếp trước (để phân biệt các entry cùng nghĩa nhưng khác bản dịch), reverse-index chỉ là lưới an toàn. Nhờ vậy, lỡ extract source ở ngôn ngữ nào thì widget vẫn dịch được.

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
   > ⚠️ **Quy tắc ngôn ngữ — đọc kỹ**: LUÔN bấm **EN** trước khi extract, và
   > mỗi trang chỉ extract **MỘT lần** (đừng extract lại cùng trang đó ở VI/NO).
   > Nếu extract cùng một mục ở nhiều ngôn ngữ khác nhau, sẽ sinh ra nhiều key
   > cho cùng một khái niệm (vd "Camps" / "Các Kì Trại" / "Leirer" đều là
   > "camps") làm `translations.json` phình và rối. Widget có reverse-index nên
   > vẫn dịch được, nhưng giữ extract nhất quán cho dữ liệu sạch.
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
https://purge.jsdelivr.net/gh/NhutNguyenH/gospelcenter@HEAD/translations.json
https://purge.jsdelivr.net/gh/NhutNguyenH/gospelcenter@HEAD/translations.js
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

## Test workflow — local và feature branch

Có 2 cách test trước khi đổi production.

### Cách A — Test LOCAL (nhanh, không cần push)

Phù hợp khi: sửa text trong `strings/*.json`, sửa bản dịch tay trong `translations.json`, hoặc sửa logic trong `widget.js`.

1. Mở PowerShell tại thư mục dự án (Shift + chuột phải vào thư mục → "Open PowerShell window here").
2. Chạy:
   ```powershell
   python -m http.server 8000
   ```
3. Mở Edge → `http://localhost:8000/test-local.html`
4. Bấm EN/VI/NO → kiểm tra.
5. Sửa file local → refresh trang → thấy ngay.
6. `Ctrl+C` trong PowerShell khi xong.

`test-local.html` load `./widget.js` + `./translations.json` từ filesystem, KHÔNG qua jsDelivr → thay đổi instant, không cần push/purge.

### Cách B — Test trên CDN với FEATURE BRANCH

Phù hợp khi: anh muốn người khác (vd member trong church) review trước khi go-live, hoặc thay đổi rủi ro cao cần test trên environment thật.

#### Bước 1: Tạo feature branch

```bash
git checkout -b feature/<tên-tính-năng>
# edit code/translations/strings
git add .
git commit -m "WIP: test something"
git push -u origin feature/<tên-tính-năng>
```

Ví dụ: `git checkout -b feature/new-footer-translations`

#### Bước 2: Sửa `widget-test.html` trỏ về branch

Mở `widget-test.html` trong Notepad. Tìm dòng cuối:
```html
<script src="https://cdn.jsdelivr.net/gh/NhutNguyenH/gospelcenter@feature/test/widget.js"></script>
```

Đổi `feature/test` thành tên branch thật của anh, vd:
```html
<script src="https://cdn.jsdelivr.net/gh/NhutNguyenH/gospelcenter@feature/new-footer-translations/widget.js"></script>
```

#### Bước 3: Tạo trang TEST trong builder

1. Vào website builder → tạo trang mới, ví dụ `/test-widget`.
2. **QUAN TRỌNG**: KHÔNG link trang này vào menu chính, KHÔNG bật SEO/sitemap. Trang test chỉ cho anh + người được share link.
3. Thêm HTML widget vào layout.
4. Copy toàn bộ `widget-test.html` → paste vào HTML widget → save.
5. Tạo trang chứa nội dung muốn test (text/headings/buttons giống bản production sẽ áp dụng).
6. Publish.

`widget-test.html` có viền **đỏ đứt** quanh language switcher và prefix **"TEST"** — để anh không nhầm với bản production.

#### Bước 4: Test

Mở `https://gospelcenter.net/test-widget` (hoặc URL tương ứng) trong InPrivate Edge. Bấm EN/VI/NO. Kiểm tra widget hoạt động đúng.

Nếu jsDelivr cache cũ:
```
https://purge.jsdelivr.net/gh/NhutNguyenH/gospelcenter@<tên-branch>/widget.js
https://purge.jsdelivr.net/gh/NhutNguyenH/gospelcenter@<tên-branch>/translations.json
```

#### Bước 5: Iterate

Nếu cần sửa: edit local → commit + push lên CÙNG branch → purge URL của branch → reload trang test.

#### Bước 6: Merge khi OK

```bash
git checkout main
git merge feature/<tên-tính-năng>
git push
git branch -d feature/<tên-tính-năng>
git push origin --delete feature/<tên-tính-năng>
```

Hoặc tạo Pull Request trên GitHub UI → review → merge → delete branch.

#### Bước 7: Cleanup

- Xóa hoặc unpublish trang `/test-widget` trong builder (giữ làm sandbox cũng được, nhưng đảm bảo không index trên Google).
- Production tự pick up commit mới qua `@HEAD` của `widget.html` (sau cache lag bình thường).

### Khi nào dùng cách nào

| Tình huống | Cách |
|---|---|
| Sửa text translation 1-2 chuỗi | Cách A (local) → đủ |
| Sửa logic widget.js | Cách A trước, rồi push + purge production |
| Thêm/sửa nhiều translations | Cách A (local) |
| Refactor lớn (vd đổi walker rule) | Cách B (feature branch) để chắc chắn |
| Người khác review | Cách B (share link `/test-widget`) |
| Anh không chắc tác động | Cách B |

99% trường hợp anh chỉ cần Cách A.

---

## Lưu ý quan trọng (đọc kỹ!)

### A. KHÔNG đổi `@HEAD` về `@main`

`widget.html` + `widget-subpage.html` đang dùng `@HEAD`:
```html
<script src="https://cdn.jsdelivr.net/gh/NhutNguyenH/gospelcenter@HEAD/widget.js"></script>
```

jsDelivr CDN có nhiều symbolic ref (`@main`, `@latest`, `@HEAD`) với resolution cache riêng. `@main` thường lag rất tệ (đôi khi >1 giờ); `@latest` cũng có thể lag. `@HEAD` hiện đang fresh nhất.

Nếu sau này `@HEAD` cũng lag (push xong + purge mà widget.js cũ vẫn được serve), fallback: tạm dùng commit SHA cụ thể trong URL, ví dụ `@89b8ed0` (lấy SHA từ `git log --oneline -1`). Re-paste widget.html. Mất công 1 lần nhưng instant fresh.

### B. translate-gemini.js đã có MERGE mode

Từ phiên bản hiện tại, `translate-gemini.js` tự động merge với `translations.json` cũ:
- Key đã có đủ `{en, vi, no}` → giữ nguyên, KHÔNG gọi Gemini lại
- Key mới hoặc thiếu field → gọi Gemini dịch

Nghĩa là sửa tay translations.json (ví dụ đổi 1 từ tiếng Việt cho mượt) sẽ được preserved qua các lần `/translate`. Cũng giúp 16 key nav cũ không bị mất.

**Lưu ý**: nếu anh muốn re-dịch 1 key (vì sửa text gốc trên website mà giữ nguyên key cũ), anh phải DELETE entry đó khỏi translations.json trước khi `/translate`, hoặc xóa 1 trong 3 field (en/vi/no) để force re-translate.

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
| `widget.html` | Đoạn HTML paste vào trang HOME production (có nút EN/VI/NO). |
| `widget-subpage.html` | Đoạn HTML paste vào trang SUB production (chỉ 1 thẻ script). |
| `widget-test.html` | TEMPLATE để paste vào trang TEST trên feature branch. Có viền đỏ "TEST" để dễ phân biệt. Sửa tên branch trong `<script src>` trước khi dùng. |
| `test-local.html` | Trang test local (load file tương đối, không qua jsDelivr). Dùng với `python -m http.server 8000`. |
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
https://purge.jsdelivr.net/gh/NhutNguyenH/gospelcenter@HEAD/widget.js
https://purge.jsdelivr.net/gh/NhutNguyenH/gospelcenter@HEAD/translations.json
https://purge.jsdelivr.net/gh/NhutNguyenH/gospelcenter@HEAD/translations.js

# Test local trước khi push (PowerShell)
python -m http.server 8000
# rồi mở http://localhost:8000/test-local.html trong Edge
```
