// ============================================================
// middleware/auth.js  –  Firebase Token Verification
// ============================================================
const { auth, db } = require('../config/firebase');

/**
 * Verifies the Firebase ID token sent in Authorization header.
 * Attaches decoded token + Firestore user doc to req.user.
 */
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = header.split('Bearer ')[1];
  try {
    const decoded = await auth.verifyIdToken(token);
    const userDoc = await db.collection('users').doc(decoded.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    req.user = { uid: decoded.uid, ...userDoc.data() };
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Restricts route to users whose role === 'admin'.
 * Must be used AFTER authenticate.
 */
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authenticate, requireAdmin };
