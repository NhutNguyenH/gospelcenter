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
      source: { type: 'string', description: 'The original input string, copied VERBATIM (byte-for-byte). Used to map result back to input.' },
      en: { type: 'string', description: 'English translation (verbatim copy if source already English)' },
      vi: { type: 'string', description: 'Vietnamese translation' },
      no: { type: 'string', description: 'Norwegian Bokmål translation' },
    },
    required: ['source', 'en', 'vi', 'no'],
  },
};

async function geminiTranslateBatch(texts) {
  const prompt = [
    'You are a professional translator for a website.',
    'For each input string, produce an English (en), Vietnamese (vi), and Norwegian Bokmål (no) translation.',
    '',
    'CRITICAL — all three fields MUST be in their correct target language:',
    '- "en" MUST be English. If the source is already English, copy it verbatim. If the source is Norwegian or another language (e.g., "Adresse", "Kontakt"), translate it to English ("Address", "Contact").',
    '- "no" MUST be Norwegian Bokmål. If the source is already Norwegian, copy it verbatim. NEVER copy English source into the "no" field.',
    '- "vi" MUST be Vietnamese.',
    '- Example A (English source): "Welcome" → {"en":"Welcome","vi":"Chào mừng","no":"Velkommen"}.',
    '- Example B (Norwegian source): "Kontakt" → {"en":"Contact","vi":"Liên hệ","no":"Kontakt"}.',
    '- NEVER copy the source string verbatim into a field unless that field\'s target language matches the source language.',
    '',
    'Other rules:',
    `- Output an array of EXACTLY ${texts.length} objects — one per input string, no more, no less.`,
    '- Each object has the form {"source": "...", "en": "...", "vi": "...", "no": "..."}.',
    '- "source" MUST be the original input string copied VERBATIM (byte-for-byte, including any HTML tags). This is used to match results back to inputs — do NOT alter, split, or merge it.',
    '- Treat each input array element as ONE indivisible unit even if it contains multiple sentences or HTML. Never split one input into multiple outputs, never merge two inputs into one.',
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

  // Map theo `source` (nội dung) thay vì index — tránh off-by-one khi model
  // gom/tách chuỗi. Build lookup từ source → {en,vi,no}, rồi align lại đúng
  // thứ tự input. Nếu thiếu source nào → reject batch (không corrupt).
  const bySource = new Map();
  for (const item of parsed) {
    if (item && typeof item.source === 'string') {
      bySource.set(item.source, item);
    }
  }
  const aligned = [];
  const missing = [];
  for (const src of texts) {
    const hit = bySource.get(src);
    if (hit && hit.en && hit.vi && hit.no) {
      aligned.push({ en: hit.en, vi: hit.vi, no: hit.no });
    } else {
      missing.push(src);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Gemini không trả đủ/đúng source cho ${missing.length}/${texts.length} chuỗi ` +
      `(vd: ${JSON.stringify(missing[0].slice(0, 50))}). Reject batch để tránh lệch mapping.`
    );
  }
  return aligned;
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

  const allKeys = [...new Set(collected.map((s) => String(s).trim()).filter(Boolean))];
  console.log(`\nTổng: ${collected.length} chuỗi đọc vào, ${allKeys.length} chuỗi duy nhất sau khi gộp + trim.`);

  // MERGE MODE: load existing translations.json để preserve manual edits + tránh
  // re-dịch những key đã có đủ {en, vi, no}. Chỉ dịch các key MỚI hoặc thiếu field.
  const jsonPath = path.join(__dirname, 'translations.json');
  const translations = {};
  let preservedCount = 0;
  if (fs.existsSync(jsonPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      for (const k of Object.keys(existing)) {
        translations[k] = existing[k];
      }
      // Preserve entries có đủ en+vi+no, hoặc keys không nằm trong allKeys (manual entries).
      for (const k of allKeys) {
        const e = translations[k];
        if (e && e.en && e.vi && e.no) preservedCount++;
      }
    } catch (e) {
      console.warn('⚠  Không parse được translations.json hiện tại, sẽ tạo mới:', e.message);
    }
  }

  // Chỉ translate những key chưa đầy đủ {en, vi, no}
  const unique = allKeys.filter((k) => {
    const e = translations[k];
    return !(e && e.en && e.vi && e.no);
  });

  if (preservedCount > 0) {
    console.log(`Preserved ${preservedCount} translation đã đầy đủ (en+vi+no) từ translations.json cũ.`);
  }
  if (unique.length === 0) {
    console.log('✓ Tất cả chuỗi đã có translation đầy đủ. Không cần gọi Gemini.');
    // Vẫn ghi file để regenerate translations.js (trong case file bị xóa)
    writeOutputs(translations, jsonPath);
    return;
  }
  console.log(`Sẽ dịch ${unique.length} chuỗi mới/thiếu sang EN + VI + NO...`);

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
        translations[src] = {
          en: results[idx].en,
          vi: results[idx].vi,
          no: results[idx].no,
        };
      });
      console.log(`  ✓ Xong (translated batch ${batchNum}/${totalBatches})`);
    } else {
      console.error(`  ✗ Batch ${batchNum} fail sau ${MAX_RETRIES} attempts. Skip ${batch.length} chuỗi.`);
      console.error(`  → Last error: ${lastErr && lastErr.message}`);
      console.error(`  → Gợi ý: chạy lại sau ít phút (Gemini có thể đang quá tải), hoặc giảm BATCH_SIZE (${BATCH_SIZE}).`);
    }
  }

  // Đếm key dịch thành công trong run này (chỉ trong unique, không tính preserved)
  const translatedThisRun = unique.filter((k) => {
    const e = translations[k];
    return e && e.en && e.vi && e.no;
  }).length;

  if (translatedThisRun === 0 && unique.length > 0) {
    console.error(`\n✗ KHÔNG có chuỗi nào được dịch trong run này (tất cả ${unique.length} chuỗi đã skip). KHÔNG ghi file để bảo toàn translations.json hiện tại.`);
    process.exit(1);
  }
  if (translatedThisRun < unique.length) {
    console.warn(`\n⚠  Chỉ dịch được ${translatedThisRun}/${unique.length} chuỗi mới. Chạy lại để bổ sung.`);
  }

  writeOutputs(translations, jsonPath);
  console.log('\n→ Bước tiếp theo: git commit + push translations.js. Cache jsDelivr tự refresh sau 12h;');
  console.log('  để refresh ngay, mở: https://purge.jsdelivr.net/gh/NhutNguyenH/gospelcenter@latest/translations.js');
}

// Ghi atomic translations.json + translations.js. Sorted keys để diff git ổn định.
function writeOutputs(translations, jsonPath) {
  const sorted = Object.fromEntries(Object.keys(translations).sort().map((k) => [k, translations[k]]));

  const jsonTmp = jsonPath + '.tmp';
  fs.writeFileSync(jsonTmp, JSON.stringify(sorted, null, 2), 'utf8');
  fs.renameSync(jsonTmp, jsonPath);

  const jsPath = path.join(path.dirname(jsonPath), 'translations.js');
  const jsTmp = jsPath + '.tmp';
  const jsBody =
    '// Auto-generated by translate-gemini.js. KHÔNG sửa tay — chỉnh strings/*.json rồi chạy lại.\n' +
    'window.WIDGET_TRANSLATIONS = ' + JSON.stringify(sorted, null, 2) + ';\n';
  fs.writeFileSync(jsTmp, jsBody, 'utf8');
  fs.renameSync(jsTmp, jsPath);

  console.log('\n✓ Đã tạo translations.json (bản dịch dạng JSON, có thể chỉnh tay).');
  console.log('✓ Đã tạo translations.js (file để phục vụ qua jsDelivr).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
