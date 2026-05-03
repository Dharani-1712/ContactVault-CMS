// ============================================================
// middleware/logger.js  –  Activity Log Helper
// ============================================================
const { db } = require('../config/firebase');

/**
 * createLog(userId, action, details)
 * Writes a timestamped activity log entry to Firestore.
 */
const createLog = async (userId, action, details = {}) => {
  try {
    await db.collection('activityLogs').add({
      userId,
      action,       // e.g. 'CREATE_CONTACT', 'DELETE_CONTACT'
      details,      // arbitrary metadata
      timestamp: new Date().toISOString(),
      createdAt: require('firebase-admin').firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    // Non-fatal – never break the main request
    console.error('Log write failed:', err.message);
  }
};

module.exports = { createLog };
