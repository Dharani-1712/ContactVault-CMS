// ============================================================
// routes/contacts.js  –  Full Contact CRUD + Duplicate + Export
// ============================================================
const express = require('express');
const router  = express.Router();
const admin   = require('firebase-admin');
const { db }  = require('../config/firebase');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { createLog } = require('../middleware/logger');

// ── Utility: build contact object ─────────────────────────────
const buildContact = (body, userId) => ({
  userId,
  name:      body.name?.trim()    || '',
  phone:     body.phone?.trim()   || '',
  email:     body.email?.trim().toLowerCase() || '',
  address:   body.address?.trim() || '',
  notes:     body.notes?.trim()   || '',
  groups:    Array.isArray(body.groups) ? body.groups : [],
  photoURL:  body.photoURL        || null,
  isFavorite: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

// ══════════════════════════════════════════════════════════════
// GET /api/contacts  –  list with search & filter
// ══════════════════════════════════════════════════════════════
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, group, sort = 'name', order = 'asc' } = req.query;
    const uid = req.user.uid;
    const isAdmin = req.user.role === 'admin';

    let query = db.collection('contacts');
    if (!isAdmin) query = query.where('userId', '==', uid);
    if (group)   query = query.where('groups', 'array-contains', group);

    const snap = await query.get();
    let contacts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Client-side search (Firestore full-text needs algolia/ext)
    if (search) {
      const s = search.toLowerCase();
      contacts = contacts.filter(c =>
        c.name?.toLowerCase().includes(s) ||
        c.phone?.includes(s) ||
        c.email?.toLowerCase().includes(s)
      );
    }

    // Sort
    contacts.sort((a, b) => {
      let va = a[sort] || '';
      let vb = b[sort] || '';
      if (sort === 'createdAt') { va = new Date(va); vb = new Date(vb); }
      return order === 'desc'
        ? (va < vb ? 1 : -1)
        : (va > vb ? 1 : -1);
    });

    res.json({ contacts, total: contacts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// GET /api/contacts/:id
// ══════════════════════════════════════════════════════════════
router.get('/:id', authenticate, async (req, res) => {
  try {
    const doc = await db.collection('contacts').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Contact not found' });

    const data = doc.data();
    if (data.userId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json({ id: doc.id, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// POST /api/contacts  –  create with duplicate detection
// ══════════════════════════════════════════════════════════════
router.post('/', authenticate, async (req, res) => {
  const { name, phone, email, force = false } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const uid = req.user.uid;

    // ── Duplicate detection ──────────────────────────────────
    if (!force) {
      let dupQuery = db.collection('contacts').where('userId', '==', uid);
      const snap = await dupQuery.get();
      const duplicates = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c =>
          (phone && c.phone === phone) ||
          (email && c.email === email?.toLowerCase())
        );

      if (duplicates.length > 0) {
        return res.status(409).json({
          error: 'Duplicate detected',
          duplicates,
          message: 'A contact with the same phone or email already exists. Pass force:true to save anyway, or merge.'
        });
      }
    }

    const contact = buildContact(req.body, uid);
    const ref = await db.collection('contacts').add(contact);
    await createLog(uid, 'CREATE_CONTACT', { contactId: ref.id, name });

    res.status(201).json({ id: ref.id, ...contact });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// PUT /api/contacts/:id  –  full update
// ══════════════════════════════════════════════════════════════
router.put('/:id', authenticate, async (req, res) => {
  try {
    const ref = db.collection('contacts').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });

    const data = doc.data();
    if (data.userId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates = {
      name:    req.body.name?.trim()    ?? data.name,
      phone:   req.body.phone?.trim()   ?? data.phone,
      email:   req.body.email?.trim().toLowerCase() ?? data.email,
      address: req.body.address?.trim() ?? data.address,
      notes:   req.body.notes?.trim()   ?? data.notes,
      groups:  Array.isArray(req.body.groups) ? req.body.groups : data.groups,
      photoURL:req.body.photoURL        ?? data.photoURL,
      updatedAt: new Date().toISOString()
    };

    await ref.update(updates);
    await createLog(req.user.uid, 'UPDATE_CONTACT', { contactId: req.params.id });

    res.json({ id: req.params.id, ...data, ...updates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// DELETE /api/contacts/:id
// ══════════════════════════════════════════════════════════════
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const ref = db.collection('contacts').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });

    if (doc.data().userId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await ref.delete();
    // Also remove from favorites
    const favSnap = await db.collection('favorites')
      .where('contactId', '==', req.params.id).get();
    const batch = db.batch();
    favSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    await createLog(req.user.uid, 'DELETE_CONTACT', { contactId: req.params.id });
    res.json({ message: 'Contact deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// POST /api/contacts/merge  –  merge two duplicate contacts
// ══════════════════════════════════════════════════════════════
router.post('/merge', authenticate, async (req, res) => {
  const { keepId, deleteId } = req.body;
  if (!keepId || !deleteId) {
    return res.status(400).json({ error: 'keepId and deleteId required' });
  }
  try {
    const delRef = db.collection('contacts').doc(deleteId);
    const delDoc = await delRef.get();
    if (!delDoc.exists) return res.status(404).json({ error: 'Source contact not found' });
    if (delDoc.data().userId !== req.user.uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await delRef.delete();
    await createLog(req.user.uid, 'MERGE_CONTACT', { kept: keepId, deleted: deleteId });
    res.json({ message: 'Contacts merged', kept: keepId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// GET /api/contacts/export/csv  –  export all user contacts
// ══════════════════════════════════════════════════════════════
router.get('/export/csv', authenticate, async (req, res) => {
  try {
    const snap = await db.collection('contacts')
      .where('userId', '==', req.user.uid).get();

    const headers = ['Name','Phone','Email','Address','Notes','Groups','Created At'];
    const rows = snap.docs.map(d => {
      const c = d.data();
      return [
        `"${c.name || ''}"`,
        `"${c.phone || ''}"`,
        `"${c.email || ''}"`,
        `"${c.address || ''}"`,
        `"${c.notes?.replace(/"/g, '""') || ''}"`,
        `"${(c.groups || []).join('; ')}"`,
        `"${c.createdAt || ''}"`
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="contacts.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// POST /api/contacts/import/csv  –  bulk import
// ══════════════════════════════════════════════════════════════
router.post('/import/csv', authenticate, async (req, res) => {
  const { rows } = req.body; // array of contact objects from parsed CSV
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'rows[] array required' });
  }

  try {
    const batch = db.batch();
    let count = 0;
    rows.forEach(row => {
      const ref = db.collection('contacts').doc();
      batch.set(ref, buildContact(row, req.user.uid));
      count++;
    });
    await batch.commit();
    await createLog(req.user.uid, 'IMPORT_CONTACTS', { count });
    res.status(201).json({ message: `${count} contacts imported` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
