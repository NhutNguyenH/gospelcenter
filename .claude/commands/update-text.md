---
description: Sửa 1 bản dịch có sẵn (vi/no/en) từ đầu tới cuối — tìm, sửa, regen, test browser, hỏi rồi commit + push + purge jsDelivr.
---

Invoke the `update-translation` skill.

Arguments (free text, Vietnamese is fine): which string to change and what it
should become. Examples:

- `/update-text đổi "Cell Groups" tiếng Việt thành "Nhóm Nhỏ"`
- `/update-text bản dịch Na Uy của Camps sai, phải là "Leirer"`
- `/update-text trang cellgroup, chữ "spiritual family" dịch nghe cứng quá`

If no argument is given, ask which string and which language before doing
anything.

The skill will:

1. `node tools/find-translation.js` — tìm entry theo key hoặc theo bất kỳ
   ngôn ngữ nào (en/vi/no). Nếu ra nhiều kết quả → **hỏi anh chọn cái nào**.
2. **Kiểm tra từ anh đưa**: chính tả, dạng ngữ pháp (số ít/số nhiều), hợp
   ngữ cảnh nhà thờ, nhất quán với phần còn lại của site. Lệch → đưa anh
   2–4 phương án kèm lý do để chọn. Không tự ý sửa.
3. Sửa đúng field ngôn ngữ trong `translations.json` (không đụng key).
4. `node tools/regen-translations-js.js` — regen `translations.js` (KHÔNG gọi
   Gemini, không tốn quota).
5. Show `git diff` → `git add` đúng 2 file → commit → push → purge jsDelivr
   (cả 2 URL) → fetch lại từ CDN xác nhận giá trị mới đã lên.

Anh tự verify trên trang thật (InPrivate Edge). Không có bước test local —
đã bỏ 2026-07-25 vì chậm.

Nếu diff có gì anh không chọn (vd key bị đổi), skill dừng và báo — không commit.

**Ngoài phạm vi** (skill sẽ từ chối và chỉ đúng chỗ trong `HOW-TO.md`):

- Anh vừa đổi text tiếng Anh trên website builder → cần re-extract (Trường hợp 1).
- Thêm chuỗi hoàn toàn mới chưa có trong `translations.json` → cần `/translate`.
