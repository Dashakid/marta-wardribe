// Shared auth helper for the /api/* serverless functions.
// Verifies a Firebase ID token by calling the Identity Toolkit lookup endpoint,
// which only needs the public Firebase web API key — no service account required.
// Files starting with "_" in /api are not exposed as routes by Vercel.

const FIREBASE_WEB_API_KEY =
  process.env.FIREBASE_WEB_API_KEY || 'AIzaSyAuCebKFZa12DassYZNvND7YFvPFOLdX6w';

module.exports = async function verifyFirebaseToken(req) {
  const header = req.headers.authorization || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!idToken) return false;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      }
    );
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data.users) && data.users.length > 0;
  } catch {
    return false;
  }
};
