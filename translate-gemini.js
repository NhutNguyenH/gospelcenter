// translate-gemini.js — Dùng Gemini API để dịch các chuỗi tiếng Anh sang Việt + Na Uy
// Yêu cầu: Node.js 18 trở lên (đã có fetch built-in)
//
// Lấy Gemini API key MIỄN PHÍ tại: https://aistudio.google.com/apikey
// Free tier (gemini-2.5-flash): 15 request/phút, 1500 request/ngày — quá đủ cho website.
//
// Cách dùng:
//   1. Đặt GEMINI_API_KEY vào file .env (file đã được gitignore).
//   2. Tạo thư mục strings/ và thêm một file .json cho mỗi trang
//      (mỗi file là một MẢNG JSON các chuỗi tiếng Anh).
//      Ví dụ: strings/home.json, strings/about-us.json, ...
//      Chuỗi trùng giữa các file sẽ được gộp tự động khi dịch.
//   3. Chạy:  node --env-file=.env translate-gemini.js
//   4. Output:
//        - translations.json  (bản dịch dạng JSON, có thể chỉnh tay)
//        - translations.js    (window.WIDGET_TRANSLATIONS = {...}, để jsDelivr phục vụ)
//      widget.html + widget.js KHÔNG còn sinh tự động — chúng được anh duy trì
//      thủ công và phục vụ qua jsDelivr (xem widget.html để biết URL).
//   5. Commit + push translations.js. Nếu cần xoá cache jsDelivr ngay:
//        https://purge.jsdelivr.net/gh/NhutNguyenH/gospelcenter@main/translations.js

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE';
const MODEL = 'gemini-2.5-flash-lite'; // 2.5-flash quota chỉ 20/ngày, 2.0-flash bị Google chặn free tier. Flash-lite cần prompt cứng để dịch EN→NO.
const BATCH_SIZE = 20; // Số chuỗi mỗi request. Giảm khi key có HTML dài (element-level).
const MAX_RETRIES = 3; // Retry trên 429/503/5xx với exponential backoff 1s/2s/4s.

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
    'For each English string in the input array, produce a Vietnamese (vi) translation AND a Norwegian Bokmål (no) translation.',
    '',
    'CRITICAL — Both vi AND no MUST be actual translations:',
    '- The "no" field MUST be Norwegian Bokmål, NOT a copy of the English input.',
    '- The "vi" field MUST be Vietnamese, NOT a copy of the English input.',
    '- If the source already happens to be Norwegian or Vietnamese (rare), translate the meaning into the correct target language; never just echo the source verbatim into both fields.',
    '- Example: "Welcome" → {"vi":"Chào mừng","no":"Velkommen"}. NEVER {"vi":"Chào mừng","no":"Welcome"}.',
    '',
    'Other rules:',
    `- Output an array of EXACTLY ${texts.length} objects, in the same order as the input.`,
    '- Each object has the form {"vi": "...", "no": "..."}.',
    '- Input may contain inline HTML tags: <strong>, <em>, <b>, <i>, <u>, <br>, <a>.',
    '  PRESERVE these tags EXACTLY in their relative position around the translated text.',
    '  Translate only the visible text content between/around tags. Do NOT add, remove,',
    '  rename, rearrange, or escape tags. Keep `href` and other attributes byte-identical.',
    '- Translate the WHOLE input as one natural sentence (the tags mark emphasis inside',
    '  the sentence — do not translate fragments in isolation).',
    '- Preserve punctuation, casing style, and inline placeholders such as {name} or %s exactly.',
    '- Keep brand names, product names, and proper nouns unchanged.',
    '- Use natural, idiomatic translation — not literal word-for-word.',
    '',
    'Input strings (JSON array):',
    JSON.stringify(texts),
  ].join('\n');

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent` +
    `?key=${encodeURIComponent(API_KEY)}`;

  // Abort fetch after 30s — bắt buộc theo rule, tránh treo nếu API không trả lời.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  let res;
  try {
    res = await fetch(url, {
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
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Gemini timeout sau 30 giây — kiểm tra mạng hoặc thử lại.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

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
    console.error('⚠  Chưa thiết lập GEMINI_API_KEY.');
    console.error('   1. Lấy key miễn phí tại: https://aistudio.google.com/apikey');
    console.error('   2. Tạo file .env trong thư mục dự án với nội dung:');
    console.error('        GEMINI_API_KEY=AIzaSy...');
    console.error('   3. Chạy:  node --env-file=.env translate-gemini.js');
    process.exit(1);
  }

  const stringsDir = path.join(__dirname, 'strings');
  if (!fs.existsSync(stringsDir) || !fs.statSync(stringsDir).isDirectory()) {
    console.error('⚠  Không tìm thấy thư mục strings/.');
    console.error('   Tạo strings/ rồi thêm các file .json (mỗi file là một mảng chuỗi tiếng Anh).');
    console.error('   Ví dụ: strings/home.json, strings/about-us.json, ...');
    process.exit(1);
  }

  const files = fs.readdirSync(stringsDir)
    .filter((f) => f.toLowerCase().endsWith('.json'))
    .sort();
  if (files.length === 0) {
    console.error('⚠  Thư mục strings/ không có file .json nào.');
    process.exit(1);
  }

  console.log(`Đọc ${files.length} file từ strings/:`);
  const collected = [];
  for (const file of files) {
    const filePath = path.join(stringsDir, file);
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      console.error(`✗ Không parse được ${file}: ${err.message}`);
      process.exit(1);
    }
    if (!Array.isArray(parsed)) {
      console.error(`✗ ${file} phải là MỘT MẢNG (array) JSON các chuỗi tiếng Anh.`);
      process.exit(1);
    }
    console.log(`  • ${file}: ${parsed.length} chuỗi`);
    collected.push(...parsed);
  }

  const unique = [...new Set(collected.map((s) => String(s).trim()).filter(Boolean))];
  console.log(`\nTổng: ${collected.length} chuỗi đọc vào, ${unique.length} chuỗi duy nhất sau khi gộp + trim.`);
  console.log(`Sẽ dịch ${unique.length} chuỗi sang VI + NO (cùng lúc trong mỗi request)...`);

  const translations = {};
  const totalBatches = Math.ceil(unique.length / BATCH_SIZE);

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    const batchNum = i / BATCH_SIZE + 1;
    console.log(`\n→ Batch ${batchNum}/${totalBatches}: ${batch.length} chuỗi (${i + 1}-${i + batch.length})`);

    let results = null;
    let lastErr = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        results = await geminiTranslateBatch(batch);
        break;
      } catch (err) {
        lastErr = err;
        const msg = err.message || '';
        // Retry trên 429/503/5xx + AbortError (timeout)
        const isTransient = /HTTP (429|5\d\d)/.test(msg) || /timeout/i.test(msg) || /UNAVAILABLE/i.test(msg);
        if (!isTransient || attempt === MAX_RETRIES) {
          console.error(`  ✗ Lỗi (attempt ${attempt}/${MAX_RETRIES}): ${msg}`);
          break;
        }
        const delayMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
        console.warn(`  ⚠  Attempt ${attempt}/${MAX_RETRIES} failed (${msg.split('\n')[0].slice(0, 100)}). Đợi ${delayMs}ms rồi retry...`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    if (results) {
      batch.forEach((src, idx) => {
        translations[src] = { vi: results[idx].vi, no: results[idx].no };
      });
      console.log(`  ✓ Xong (${Object.keys(translations).length}/${unique.length})`);
    } else {
      console.error(`  ✗ Batch ${batchNum} fail sau ${MAX_RETRIES} attempts. Skip ${batch.length} chuỗi.`);
      console.error(`  → Last error: ${lastErr && lastErr.message}`);
      console.error(`  → Gợi ý: chạy lại sau ít phút (Gemini có thể đang quá tải), hoặc giảm BATCH_SIZE (${BATCH_SIZE}).`);
    }
  }

  const expectedCount = unique.length;
  const actualCount = Object.keys(translations).length;
  if (actualCount === 0) {
    console.error(`\n✗ KHÔNG có chuỗi nào được dịch (tất cả ${expectedCount} chuỗi đã skip). KHÔNG ghi file để bảo toàn translations.json hiện tại.`);
    process.exit(1);
  }
  if (actualCount < expectedCount) {
    console.warn(`\n⚠  Chỉ dịch được ${actualCount}/${expectedCount} chuỗi. Một số batch đã skip. Cân nhắc chạy lại để bổ sung.`);
  }

  // Ghi atomic: viết .tmp rồi rename để readers không thấy file half-written.
  const jsonPath = path.join(__dirname, 'translations.json');
  const jsonTmp = jsonPath + '.tmp';
  fs.writeFileSync(jsonTmp, JSON.stringify(translations, null, 2), 'utf8');
  fs.renameSync(jsonTmp, jsonPath);

  const jsPath = path.join(__dirname, 'translations.js');
  const jsTmp = jsPath + '.tmp';
  const jsBody =
    '// Auto-generated by translate-gemini.js. KHÔNG sửa tay — chỉnh strings/*.json rồi chạy lại.\n' +
    'window.WIDGET_TRANSLATIONS = ' + JSON.stringify(translations, null, 2) + ';\n';
  fs.writeFileSync(jsTmp, jsBody, 'utf8');
  fs.renameSync(jsTmp, jsPath);

  console.log('\n✓ Đã tạo translations.json (bản dịch dạng JSON, có thể chỉnh tay).');
  console.log('✓ Đã tạo translations.js (file để phục vụ qua jsDelivr).');
  console.log('\n→ Bước tiếp theo: git commit + push translations.js. Cache jsDelivr tự refresh sau 12h;');
  console.log('  để refresh ngay, mở: https://purge.jsdelivr.net/gh/NhutNguyenH/gospelcenter@main/translations.js');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
