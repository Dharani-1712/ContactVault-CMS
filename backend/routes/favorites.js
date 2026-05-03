// ============================================================
// routes/favorites.js
// ============================================================
const express = require('express');
const router  = express.Router();
const { db }  = require('../config/firebase');
const { authenticate } = require('../middleware/auth');
const { createLog }    = require('../middleware/logger');

// GET all favorites for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const snap = await db.collection('favorites')
      .where('userId', '==', req.user.uid).get();

    const contactIds = snap.docs.map(d => d.data().contactId);
    if (contactIds.length === 0) return res.json([]);

    // Batch-fetch contact docs
    const chunks = [];
    for (let i = 0; i < contactIds.length; i += 10)
      chunks.push(contactIds.slice(i, i + 10));

    const contacts = [];
    for (const chunk of chunks) {
      const cSnap = await db.collection('contacts')
        .where('__name__', 'in', chunk).get();
      cSnap.docs.forEach(d => contacts.push({ id: d.id, ...d.data() }));
    }

    res.json(contacts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST – add to favorites
router.post('/:contactId', authenticate, async (req, res) => {
  const { contactId } = req.params;
  try {
    // Check contact ownership
    const cDoc = await db.collection('contacts').doc(contactId).get();
    if (!cDoc.exists || cDoc.data().userId !== req.user.uid)
      return res.status(404).json({ error: 'Contact not found' });

    // Idempotent: check existing
    const existing = await db.collection('favorites')
      .where('userId', '==', req.user.uid)
      .where('contactId', '==', contactId).get();
    if (!existing.empty) return res.json({ message: 'Already a favorite' });

    await db.collection('favorites').add({
      userId: req.user.uid, contactId,
      createdAt: new Date().toISOString()
    });
    await db.collection('contacts').doc(contactId).update({ isFavorite: true });
    await createLog(req.user.uid, 'ADD_FAVORITE', { contactId });

    res.status(201).json({ message: 'Added to favorites' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE – remove from favorites
router.delete('/:contactId', authenticate, async (req, res) => {
  const { contactId } = req.params;
  try {
    const snap = await db.collection('favorites')
      .where('userId', '==', req.user.uid)
      .where('contactId', '==', contactId).get();

    if (snap.empty) return res.status(404).json({ error: 'Not in favorites' });
    await snap.docs[0].ref.delete();
    await db.collection('contacts').doc(contactId).update({ isFavorite: false });
    await createLog(req.user.uid, 'REMOVE_FAVORITE', { contactId });

    res.json({ message: 'Removed from favorites' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
