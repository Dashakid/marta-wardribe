export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt, imageBase64, mimeType } = req.body;
  const key = process.env.GEMINI_API_KEY;

  const parts = [];
  if (imageBase64) {
    parts.push({
      inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 }
    });
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
}
