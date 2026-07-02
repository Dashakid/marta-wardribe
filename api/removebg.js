const verifyFirebaseToken = require('./_auth.js');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await verifyFirebaseToken(req))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const key = process.env.REMOVEBG_API_KEY;
  if (!key) return res.status(500).json({ error: 'Missing REMOVEBG_API_KEY' });

  const { imageBase64 } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'Missing imageBase64' });

  try {
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': key,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        image_file_b64: imageBase64,
        size: 'preview', // 'preview' (~0.25 MP) stays on the free tier; larger sizes bill credits
        format: 'png'
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: 'remove.bg failed', details: text });
    }

    const arrayBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'image/png');
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err) {
    return res.status(500).json({ error: 'remove.bg request failed', details: String(err?.message || err) });
  }
};

module.exports.config = {
  api: {
    bodyParser: { sizeLimit: '15mb' },
    responseLimit: false,
  },
};
