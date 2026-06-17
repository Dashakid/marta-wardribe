// Add GEMINI_API_KEY as an environment variable in Vercel dashboard
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt, imageBase64, mimeType, imageUrls } = req.body;
  const key = process.env.GEMINI_API_KEY;

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
    for (const img of imageUrls) {
      if (img?.url) {
        try {
          const imgRes = await fetch(img.url);
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
  }

  parts.push({ text: prompt });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] })
    }
  );

  const data = await response.json();
  res.status(response.status).json(data);
};

module.exports.config = {
  api: {
    bodyParser: { sizeLimit: '15mb' },
  },
};
