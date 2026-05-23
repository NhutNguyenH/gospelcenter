// translate-gemini.js — Dùng Gemini API để dịch các chuỗi tiếng Anh sang Việt + Na Uy
// Yêu cầu: Node.js 18 trở lên (đã có fetch built-in)
//
// Lấy Gemini API key MIỄN PHÍ tại: https://aistudio.google.com/apikey
// Free tier (gemini-2.5-flash): 15 request/phút, 1500 request/ngày — quá đủ cho website.
//
// Cách dùng:
//   1. Sửa API_KEY ở dưới (hoặc set biến môi trường GEMINI_API_KEY)
//   2. Liệt kê các chuỗi tiếng Anh cần dịch vào file strings.json
//   3. Chạy:  node translate-gemini.js
//   4. Mở file widget.html vừa được sinh ra, copy toàn bộ nội dung,
//      dán vào hộp HTML/Custom Code trên website của bạn.

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE';
const MODEL = 'gemini-2.5-flash'; // Nhanh + miễn phí. Đổi 'gemini-2.5-pro' nếu muốn chất lượng cao hơn.
const BATCH_SIZE = 40; // Số chuỗi mỗi request. Giảm xuống nếu gặp lỗi.

const TRANSLATION_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      vi: { type: 'string', description: 'Vietnamese translation' },
      no: { type: 'string', description: 'Norwegian Bokmål translation' },
    },
    required: ['vi', 'no'],
  },
};

async function geminiTranslateBatch(texts) {
  const prompt = [
    'You are a professional translator for a website.',
    'Translate each English string in the input array into Vietnamese (vi) and Norwegian Bokmål (no).',
    '',
    'Rules:',
    `- Output an array of EXACTLY ${texts.length} objects, in the same order as the input.`,
    '- Each object has the form {"vi": "...", "no": "..."}.',
    '- Preserve punctuation, casing style, and inline placeholders such as {name} or %s exactly.',
    '- Do not add anything that was not present in the source.',
    '- Keep brand names, product names, and proper nouns unchanged.',
    '- Use natural, idiomatic translation — not literal word-for-word.',
    '',
    'Input strings (JSON array):',
    JSON.stringify(texts),
  ].join('\n');

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent` +
    `?key=${encodeURIComponent(API_KEY)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: TRANSLATION_SCHEMA,
        temperature: 0.2,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error('Gemini không trả về nội dung. Raw: ' + JSON.stringify(data).slice(0, 500));
  }

  // Phòng trường hợp model trả về ```json ... ``` dù đã yêu cầu JSON
  let cleanText = textOutput.trim();
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  let parsed;
  try {
    parsed = JSON.parse(cleanText);
  } catch (e) {
    throw new Error('Không parse được JSON từ Gemini. Raw: ' + cleanText.slice(0, 500));
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Gemini không trả về array. Got: ' + typeof parsed);
  }
  if (parsed.length !== texts.length) {
    throw new Error(`Số lượng kết quả không khớp. Input=${texts.length}, output=${parsed.length}`);
  }
  return parsed;
}

async function main() {
  if (!API_KEY || API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    console.error('⚠  Bạn chưa thiết lập Gemini API key.');
    console.error('   Lấy key miễn phí tại: https://aistudio.google.com/apikey');
    console.error('   Sau đó mở translate-gemini.js và sửa biến API_KEY,');
    console.error('   hoặc chạy:  GEMINI_API_KEY=xxx node translate-gemini.js');
    process.exit(1);
  }

  const stringsPath = path.join(__dirname, 'strings.json');
  if (!fs.existsSync(stringsPath)) {
    console.error('⚠  Không tìm thấy strings.json.');
    process.exit(1);
  }

  const sourceStrings = JSON.parse(fs.readFileSync(stringsPath, 'utf8'));
  if (!Array.isArray(sourceStrings)) {
    console.error('strings.json phải là MỘT MẢNG (array) JSON các chuỗi tiếng Anh.');
    process.exit(1);
  }

  const unique = [...new Set(sourceStrings.map((s) => String(s).trim()).filter(Boolean))];
  console.log(`Sẽ dịch ${unique.length} chuỗi tiếng Anh sang VI + NO (cùng lúc trong mỗi request)...`);

  const translations = {};
  const totalBatches = Math.ceil(unique.length / BATCH_SIZE);

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    const batchNum = i / BATCH_SIZE + 1;
    console.log(`\n→ Batch ${batchNum}/${totalBatches}: ${batch.length} chuỗi (${i + 1}-${i + batch.length})`);
    try {
      const results = await geminiTranslateBatch(batch);
      batch.forEach((src, idx) => {
        translations[src] = {
          vi: results[idx].vi,
          no: results[idx].no,
        };
      });
      console.log(`  ✓ Xong (${i + batch.length}/${unique.length})`);
    } catch (err) {
      console.error(`  ✗ Lỗi: ${err.message}`);
      console.error(`  → Gợi ý: giảm BATCH_SIZE (đang là ${BATCH_SIZE}) và chạy lại.`);
      process.exit(1);
    }
  }

  fs.writeFileSync(
    path.join(__dirname, 'translations.json'),
    JSON.stringify(translations, null, 2),
    'utf8'
  );

  const tplPath = path.join(__dirname, 'widget-template.html');
  if (fs.existsSync(tplPath)) {
    const tpl = fs.readFileSync(tplPath, 'utf8');
    const out = tpl.replace('/*__TRANSLATIONS_PLACEHOLDER__*/', JSON.stringify(translations));
    fs.writeFileSync(path.join(__dirname, 'widget.html'), out, 'utf8');
    console.log('\n✓ Đã tạo translations.json (bản dịch dạng JSON, có thể chỉnh tay)');
    console.log('✓ Đã tạo widget.html (đoạn HTML+JS để nhúng vào website)');
    console.log('\n→ Mở widget.html, copy TOÀN BỘ nội dung, dán vào hộp HTML embed trên website.');
  } else {
    console.log('\n✓ Đã tạo translations.json. (Không tìm thấy widget-template.html nên không sinh widget.html)');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
