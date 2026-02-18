export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { password } = req.body || {};
    const correctPassword = process.env.BASIC_AUTH_PASSWORD;

    if (!correctPassword) {
      // If no password is configured, allow access (dev mode)
      return res.status(200).json({ success: true });
    }

    if (password === correctPassword) {
      return res.status(200).json({ success: true });
    }

    return res.status(401).json({ success: false, error: 'Incorrect password' });
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}
