// Add GEMINI_API_KEY as an environment variable in Vercel dashboard
const verifyFirebaseToken = require('./_auth.js');

const MAX_PROMPT_CHARS = 4000;
const MAX_IMAGES = 8;
// Only fetch images from Firebase Storage download URLs — never arbitrary hosts.
const ALLOWED_IMAGE_HOSTS = new Set(['firebasestorage.googleapis.com']);

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await verifyFirebaseToken(req))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { prompt, imageBase64, mimeType, imageUrls } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > MAX_PROMPT_CHARS) {
    return res.status(400).json({ error: 'Invalid prompt' });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });

  const parts = [];

  // Inline base64 image (wardrobe classification)
  if (imageBase64) {
    parts.push({
      inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 }
    });
  }

  // URL-referenced images (outfit rating with actual photos)
  // Firebase Storage HTTPS URLs must be fetched and converted to inlineData;
  // Gemini fileData.fileUri only accepts Google AI File API URIs, not arbitrary HTTPS URLs.
  if (Array.isArray(imageUrls) && imageUrls.length) {
    for (const img of imageUrls.slice(0, MAX_IMAGES)) {
      if (!img?.url) continue;
      let parsed;
      try { parsed = new URL(img.url); } catch { continue; }
      if (parsed.protocol !== 'https:' || !ALLOWED_IMAGE_HOSTS.has(parsed.hostname)) continue;
      try {
        const imgRes = await fetch(parsed.href);
        if (imgRes.ok) {
          const buf = await imgRes.arrayBuffer();
          const b64 = Buffer.from(buf).toString('base64');
          const ct = imgRes.headers.get('content-type') || 'image/png';
          parts.push({ inlineData: { mimeType: ct, data: b64 } });
        }
      } catch (_) {
        // skip unloadable image — text-only fallback still works
      }
    }
  }

  parts.push({ text: prompt });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] })
      }
    );
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Gemini upstream request failed' });
  }
};

module.exports.config = {
  api: {
    bodyParser: { sizeLimit: '15mb' },
  },
};
