// ============================================================
// routes/admin.js  –  Admin-only analytics & management
// ============================================================
const express = require('express');
const router  = express.Router();
const { db, auth } = require('../config/firebase');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All routes require admin
router.use(authenticate, requireAdmin);

// ── GET /api/admin/analytics ──────────────────────────────────
router.get('/analytics', async (req, res) => {
  try {
    const [usersSnap, contactsSnap, logsSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('contacts').get(),
      db.collection('activityLogs').orderBy('createdAt', 'desc').limit(100).get()
    ]);

    const contacts = contactsSnap.docs.map(d => d.data());

    // Contacts per group
    const groupMap = {};
    contacts.forEach(c => {
      (c.groups || []).forEach(g => {
        groupMap[g] = (groupMap[g] || 0) + 1;
      });
    });

    // Recently added (last 7 days)
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentContacts = contacts.filter(c => c.createdAt > cutoff);

    res.json({
      totalUsers:    usersSnap.size,
      totalContacts: contactsSnap.size,
      contactsPerGroup: groupMap,
      recentContacts: recentContacts.length,
      recentLogs: logsSnap.docs.slice(0, 20).map(d => ({ id: d.id, ...d.data() }))
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/admin/users ──────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const snap = await db.collection('users').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /api/admin/users/:uid/role ────────────────────────────
router.put('/users/:uid/role', async (req, res) => {
  const { role } = req.body;
  if (!['admin','user'].includes(role))
    return res.status(400).json({ error: 'Invalid role' });
  try {
    await db.collection('users').doc(req.params.uid).update({ role });
    res.json({ message: `Role updated to ${role}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/admin/users/:uid ──────────────────────────────
router.delete('/users/:uid', async (req, res) => {
  try {
    const batch = db.batch();

    // Delete user's contacts
    const cSnap = await db.collection('contacts')
      .where('userId', '==', req.params.uid).get();
    cSnap.docs.forEach(d => batch.delete(d.ref));

    // Delete user profile
    batch.delete(db.collection('users').doc(req.params.uid));
    await batch.commit();

    // Delete Firebase Auth account
    await auth.deleteUser(req.params.uid);
    res.json({ message: 'User and data deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/admin/contacts ───────────────────────────────────
router.get('/contacts', async (req, res) => {
  try {
    const snap = await db.collection('contacts')
      .orderBy('createdAt', 'desc').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
