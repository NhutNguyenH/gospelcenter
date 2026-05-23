// translate.js — Dùng DeepL Free API để dịch các chuỗi tiếng Anh sang Việt + Na Uy
// Yêu cầu: Node.js 18 trở lên (đã có fetch built-in)
//
// Cách dùng:
//   1. Sửa API_KEY ở dưới (hoặc set biến môi trường DEEPL_API_KEY)
//   2. Liệt kê các chuỗi tiếng Anh cần dịch vào file strings.json
//   3. Chạy:  node translate.js
//   4. Mở file widget.html vừa được sinh ra, copy toàn bộ nội dung,
//      dán vào hộp HTML/Custom Code trên website của bạn.

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.DEEPL_API_KEY || 'YOUR_DEEPL_API_KEY_HERE';
const SOURCE_LANG = 'EN';
const TARGET_LANGS = { vi: 'VI', no: 'NB' }; // VI = Vietnamese, NB = Norwegian Bokmål
const BATCH_SIZE = 50; // DeepL cho phép tối đa 50 chuỗi mỗi request

async function deeplTranslateBatch(texts, targetLang) {
  const body = new URLSearchParams();
  body.append('source_lang', SOURCE_LANG);
  body.append('target_lang', targetLang);
  body.append('preserve_formatting', '1');
  texts.forEach((t) => body.append('text', t));

  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepL HTTP ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return data.translations.map((t) => t.text);
}

async function main() {
  if (!API_KEY || API_KEY === 'YOUR_DEEPL_API_KEY_HERE') {
    console.error('⚠  Bạn chưa thiết lập DeepL API key.');
    console.error('   Mở translate.js và sửa biến API_KEY ở đầu file,');
    console.error('   hoặc chạy:  DEEPL_API_KEY=xxx node translate.js');
    process.exit(1);
  }

  const stringsPath = path.join(__dirname, 'strings.json');
  if (!fs.existsSync(stringsPath)) {
    console.error('⚠  Không tìm thấy strings.json. Tạo file này trước khi chạy.');
    process.exit(1);
  }

  const sourceStrings = JSON.parse(fs.readFileSync(stringsPath, 'utf8'));
  if (!Array.isArray(sourceStrings)) {
    console.error('strings.json phải là MỘT MẢNG (array) JSON các chuỗi tiếng Anh.');
    process.exit(1);
  }

  // Bỏ trùng lặp và chuỗi rỗng
  const unique = [...new Set(sourceStrings.map((s) => String(s).trim()).filter(Boolean))];
  console.log(`Sẽ dịch ${unique.length} chuỗi sang: ${Object.keys(TARGET_LANGS).join(', ').toUpperCase()}`);

  const translations = {};
  unique.forEach((s) => {
    translations[s] = {};
  });

  for (const [langKey, deeplCode] of Object.entries(TARGET_LANGS)) {
    console.log(`\n→ Đang dịch sang ${langKey.toUpperCase()} (${deeplCode})...`);
    for (let i = 0; i < unique.length; i += BATCH_SIZE) {
      const batch = unique.slice(i, i + BATCH_SIZE);
      try {
        const results = await deeplTranslateBatch(batch, deeplCode);
        batch.forEach((src, idx) => {
          translations[src][langKey] = results[idx];
        });
        console.log(`  ✓ Đã dịch ${Math.min(i + BATCH_SIZE, unique.length)}/${unique.length}`);
      } catch (err) {
        console.error(`  ✗ Lỗi batch ${i}-${i + batch.length}: ${err.message}`);
        process.exit(1);
      }
    }
  }

  fs.writeFileSync(
    path.join(__dirname, 'translations.json'),
    JSON.stringify(translations, null, 2),
    'utf8'
  );

  const tplPath = path.join(__dirname, 'widget-template.html');
  if (!fs.existsSync(tplPath)) {
    console.error('⚠  Không tìm thấy widget-template.html — chỉ tạo translations.json.');
    return;
  }
  const tpl = fs.readFileSync(tplPath, 'utf8');
  const out = tpl.replace('/*__TRANSLATIONS_PLACEHOLDER__*/', JSON.stringify(translations));
  fs.writeFileSync(path.join(__dirname, 'widget.html'), out, 'utf8');

  console.log('\n✓ Đã tạo translations.json (bản dịch dạng JSON, để bạn kiểm tra/chỉnh tay)');
  console.log('✓ Đã tạo widget.html (đoạn HTML+JS để nhúng vào website)');
  console.log('\n→ Mở widget.html, copy TOÀN BỘ nội dung, dán vào hộp HTML trên website của bạn.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
