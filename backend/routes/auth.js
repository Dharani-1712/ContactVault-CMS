// ============================================================
// routes/auth.js  –  Register / Login / Profile
// ============================================================
const express  = require('express');
const router   = express.Router();
const { db, auth } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');
const { createLog }    = require('../middleware/logger');

// ── POST /api/auth/register ───────────────────────────────────
// Called after client-side Firebase sign-up to create Firestore profile
router.post('/register', async (req, res) => {
  const { uid, name, email, role = 'user' } = req.body;

  if (!uid || !name || !email) {
    return res.status(400).json({ error: 'uid, name, and email are required' });
  }

  // Only allow 'admin' role if explicitly set and validated server-side
  const safeRole = ['admin','user'].includes(role) ? role : 'user';

  try {
    const userRef  = db.collection('users').doc(uid);
    const existing = await userRef.get();

    if (existing.exists) {
      return res.status(409).json({ error: 'User profile already exists' });
    }

    const userData = {
      uid, name, email,
      role: safeRole,
      photoURL: null,
      createdAt: new Date().toISOString()
    };

    await userRef.set(userData);
    await createLog(uid, 'REGISTER', { email, role: safeRole });

    res.status(201).json({ message: 'Profile created', user: userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// ── PUT /api/auth/profile ─────────────────────────────────────
router.put('/profile', authenticate, async (req, res) => {
  const { name, photoURL } = req.body;
  const updates = {};
  if (name)     updates.name     = name;
  if (photoURL) updates.photoURL = photoURL;

  try {
    await db.collection('users').doc(req.user.uid).update(updates);
    await createLog(req.user.uid, 'UPDATE_PROFILE', updates);
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/auth/account ──────────────────────────────────
router.delete('/account', authenticate, async (req, res) => {
  try {
    await db.collection('users').doc(req.user.uid).delete();
    await auth.deleteUser(req.user.uid);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
