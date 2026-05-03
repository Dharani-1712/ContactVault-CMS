// ============================================================
// routes/activityLogs.js
// ============================================================
const express = require('express');
const router  = express.Router();
const { db }  = require('../config/firebase');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET user's own logs (or all logs for admin)
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    let query = db.collection('activityLogs')
      .orderBy('createdAt', 'desc')
      .limit(Number(limit));

    if (req.user.role !== 'admin') {
      query = db.collection('activityLogs')
        .where('userId', '==', req.user.uid)
        .orderBy('createdAt', 'desc')
        .limit(Number(limit));
    }

    const snap = await query.get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE all logs for a user (admin only)
router.delete('/user/:uid', authenticate, requireAdmin, async (req, res) => {
  try {
    const snap = await db.collection('activityLogs')
      .where('userId', '==', req.params.uid).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    res.json({ message: `${snap.size} logs deleted` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
