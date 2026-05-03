// ============================================================
// js/app.js  –  Shared utilities for all dashboard pages
// ============================================================

// ── Config ────────────────────────────────────────────────────
const API_BASE = 'http://localhost:5000/api'; // change in production

// ── Auth Guard ────────────────────────────────────────────────
function requireAuth(expectedRole = null) {
  const token = localStorage.getItem('idToken');
  const role  = localStorage.getItem('userRole');
  if (!token) { window.location.href = '../pages/login.html'; return false; }
  if (expectedRole && role !== expectedRole) {
    alert('Access denied.');
    window.location.href = role === 'admin'
      ? 'admin-dashboard.html' : 'user-dashboard.html';
    return false;
  }
  return true;
}

// ── API Helper ────────────────────────────────────────────────
async function api(method, path, body = null) {
  const token = localStorage.getItem('idToken');
  const opts  = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res  = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data;
}

// ── Toast ─────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  let c = document.getElementById('toastContainer');
  if (!c) { c = document.createElement('div'); c.id = 'toastContainer'; c.className = 'toast-container'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  t.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span>
                 <span class="toast-message">${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// ── Avatar initials & colour ─────────────────────────────────
const AVATAR_COLORS = [
  '#2563EB','#7C3AED','#DB2777','#059669','#D97706','#DC2626',
  '#0891B2','#65A30D','#9333EA','#EA580C'
];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

// ── Avatar HTML ───────────────────────────────────────────────
function avatarHtml(contact, size = 64) {
  if (contact.photoURL) {
    return `<img src="${contact.photoURL}" alt="${contact.name}"
                 style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;" />`;
  }
  const bg = avatarColor(contact.name);
  const fs = Math.round(size * 0.35);
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};
                      display:flex;align-items:center;justify-content:center;
                      font-family:'Syne',sans-serif;font-size:${fs}px;font-weight:800;color:#fff;flex-shrink:0;">
            ${initials(contact.name)}
          </div>`;
}

// ── Format date ───────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
}

// ── Log dot class ─────────────────────────────────────────────
function logDotClass(action = '') {
  if (action.includes('CREATE') || action.includes('IMPORT') || action.includes('ADD')) return 'create';
  if (action.includes('UPDATE') || action.includes('MERGE'))  return 'update';
  if (action.includes('DELETE') || action.includes('REMOVE')) return 'delete';
  return 'other';
}

// ── Dark mode toggle ──────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const cur  = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
}

// ── Logout ────────────────────────────────────────────────────
function logout() {
  ['idToken','userRole','uid'].forEach(k => localStorage.removeItem(k));
  window.location.href = 'login.html';
}

// ── CSV parser (simple) ───────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g,'').trim().toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.match(/(".*?"|[^,]+)/g) || [];
    const obj  = {};
    headers.forEach((h, i) => obj[h] = (vals[i] || '').replace(/"/g, '').trim());
    return obj;
  });
}

// ── Generate contact card HTML ────────────────────────────────
function generateContactCard(contact) {
  const bg = avatarColor(contact.name);
  const ini = initials(contact.name);
  const groups = (contact.groups || []).join(', ') || 'No Group';
  return `
    <div class="digital-card" id="digitalCard">
      <div class="digital-card-id">ID: ${contact.id || 'N/A'}</div>
      <div class="digital-card-avatar" style="background:${bg};">
        ${contact.photoURL
          ? `<img src="${contact.photoURL}" alt="${contact.name}" />`
          : ini}
      </div>
      <div class="digital-card-name">${contact.name}</div>
      <div class="digital-card-group">${groups}</div>
      <div class="digital-card-fields">
        ${contact.phone ? `
        <div class="digital-card-field">
          <div class="digital-card-field-icon">📞</div>
          <span>${contact.phone}</span>
        </div>` : ''}
        ${contact.email ? `
        <div class="digital-card-field">
          <div class="digital-card-field-icon">✉️</div>
          <span>${contact.email}</span>
        </div>` : ''}
        ${contact.address ? `
        <div class="digital-card-field">
          <div class="digital-card-field-icon">📍</div>
          <span>${contact.address}</span>
        </div>` : ''}
      </div>
    </div>`;
}

// ── Sidebar active nav ────────────────────────────────────────
function setActiveNav(id) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// Init theme on load
initTheme();
