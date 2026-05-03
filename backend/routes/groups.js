// ============================================================
// routes/groups.js
// ============================================================
const express = require('express');
const router  = express.Router();
const { db }  = require('../config/firebase');
const { authenticate } = require('../middleware/auth');
const { createLog }    = require('../middleware/logger');

router.get('/', authenticate, async (req, res) => {
  try {
    const snap = await db.collection('groups')
      .where('userId', '==', req.user.uid).get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Group name required' });
  try {
    const ref = await db.collection('groups').add({
      name: name.trim(),
      userId: req.user.uid,
      createdAt: new Date().toISOString()
    });
    await createLog(req.user.uid, 'CREATE_GROUP', { name });
    res.status(201).json({ id: ref.id, name, userId: req.user.uid });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const ref = db.collection('groups').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().userId !== req.user.uid)
      return res.status(404).json({ error: 'Not found' });
    await ref.update({ name: req.body.name?.trim() });
    res.json({ message: 'Group updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const ref = db.collection('groups').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().userId !== req.user.uid)
      return res.status(404).json({ error: 'Not found' });
    await ref.delete();
    await createLog(req.user.uid, 'DELETE_GROUP', { groupId: req.params.id });
    res.json({ message: 'Group deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
