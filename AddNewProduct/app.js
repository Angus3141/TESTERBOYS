// app.js — Add New Product page logic (robust RFC-4180 CSV + working mode buttons)

(async function () {
  const VERSION = '10.12.5';
  const SDKS = [
    `https://www.gstatic.com/firebasejs/${VERSION}/firebase-app-compat.js`,
    `https://www.gstatic.com/firebasejs/${VERSION}/firebase-auth-compat.js`,
    `https://www.gstatic.com/firebasejs/${VERSION}/firebase-firestore-compat.js`,
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }

  function setStatus(el, msg) { if (el) el.textContent = msg; }

  function blockFormSubmissions() {
    document.querySelectorAll('form').forEach(f => {
      f.addEventListener('submit', e => e.preventDefault());
      f.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
    });
    // make every <button> inside a form type="button" to avoid accidental submits
    document.querySelectorAll('form button').forEach(btn => {
      if (!btn.getAttribute('type')) btn.setAttribute('type', 'button');
    });
    // also make the mode buttons safe
    document.querySelectorAll('.mode-buttons button').forEach(btn => {
      if (!btn.getAttribute('type')) btn.setAttribute('type', 'button');
    });
  }

  // Split helper for list fields: DO NOT split on commas.
  // If multiple entries are desired, separate with ';' or '|'.
  function splitList(s = '') {
    const t = String(s).trim();
    if (!t) return [];
    const parts = /[;|]/.test(t) ? t.split(/[;|]/) : [t];
    return parts.map(p => p.trim()).filter(Boolean);
  }

  // ===== Robust CSV Parser (RFC-4180) =====
  // Handles:
  //  - commas inside quoted cells
  //  - "" escaped quotes inside quoted cells
  //  - newlines inside quoted cells
  //  - empty trailing cells
  function parseCSVToMatrix(text) {
    const s = (text || '').replace(/^\uFEFF/, '');
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < s.length; i++) {
      const ch = s[i];

      if (inQuotes) {
        if (ch === '"') {
          // escaped quote?
          if (i + 1 < s.length && s[i + 1] === '"') {
            cell += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cell += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          row.push(cell);
          cell = '';
        } else if (ch === '\r') {
          // ignore; \r\n handled by \n branch
        } else if (ch === '\n') {
          row.push(cell);
          rows.push(row);
          row = [];
          cell = '';
        } else {
          cell += ch;
        }
      }
    }
    // push last cell/row
    row.push(cell);
    // if there's at least one non-empty value or there were separators, keep the row
    if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
      rows.push(row);
    }

    // Trim cells at the end
    return rows.map(r => r.map(c => c.trim()));
  }

  function parseCSV(text) {
    const matrix = parseCSVToMatrix(text);
    if (!matrix.length) return [];

    const header = matrix[0].map(h => h.toLowerCase());
    const body = matrix.slice(1).filter(r => r.some(c => c && c.trim().length));

    return body.map(cols => {
      const obj = {};
      header.forEach((h, i) => { obj[h] = (cols[i] ?? '').trim(); });

      return {
        // Preserve commas exactly as provided
        title: obj.title || '',
        description: obj.description || '',
        price: parseFloat(obj.price) || 0,
        tags: splitList(obj.tags),
        image1: obj.image1 || '',
        variation: {
          type: obj['variation 1 type'] || '',
          name: obj['variation 1 name'] || '',
          values: splitList(obj['variation 1 values']),
        },
      };
    }).filter(e => e.title);
  }

  // For Row (paste) mode: quote a field for CSV if needed
  function csvQuote(field = '') {
    const s = String(field ?? '');
    const needs = /[",\r\n]/.test(s);
    const esc = s.replace(/"/g, '""');
    return needs ? `"${esc}"` : esc;
  }
  blockFormSubmissions();

  // ===== Mode button UI =====
  const singleStatus = document.getElementById('singleStatus');
  const rowStatus    = document.getElementById('rowStatus');
  const csvStatus    = document.getElementById('csvStatus');
  const singleBtn    = document.getElementById('singleUpload');
  const rowBtn       = document.getElementById('rowUpload');
  const csvBtn       = document.getElementById('csvUpload');

  const forms = ['singleForm','rowForm','csvForm'];
  const modeBtns = Array.from(document.querySelectorAll('.mode-buttons button'));

  function showForm(targetId) {
    forms.forEach(id => document.getElementById(id)?.classList.add('hidden'));
    document.getElementById(targetId)?.classList.remove('hidden');
    modeBtns.forEach(b => b.classList.remove('active'));
    modeBtns.find(b => b.dataset.target === targetId)?.classList.add('active');
  }

  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (!target) return;
      showForm(target);
      try { history.replaceState(null, '', `#${target}`); } catch (_) {}
    });
  });

  forms.forEach(id => document.getElementById(id)?.classList.add('hidden'));
  const hashTarget = location.hash?.slice(1);
  showForm(forms.includes(hashTarget) ? hashTarget : 'singleForm');

  // ===== Load Firebase SDKs =====
  try {
    for (const url of SDKS) await loadScript(url);
  } catch (e) {
    console.error(e);
    alert('Failed to load Firebase SDKs.');
    return;
  }

  const firebaseConfig = {
    apiKey: "AIzaSyAaKun3buWr3xXH7DTC1aAMz2NMu4QxA1c",
    authDomain: "testerboys-31725.firebaseapp.com",
    projectId: "testerboys-31725",
    storageBucket: "testerboys-31725.firebasestorage.app",
    messagingSenderId: "486443361948",
    appId: "1:486443361948:web:99d07e60a4fcef240caf59"
  };

  try { firebase.initializeApp(firebaseConfig); } catch (_) {}

  const auth = firebase.auth();
  const db   = firebase.firestore();

  try { await db.enablePersistence?.(); } catch (_) {}

  try { await auth.signInAnonymously(); } catch (err) {
    console.error('Anon sign-in failed:', err);
  }

  // Safe batching (Firestore limit 500 ops per batch). We'll use 400 to be comfy.
  async function writeProducts(entries) {
    const chunkSize = 400;
    const now = firebase.firestore.FieldValue.serverTimestamp();

    for (let i = 0; i < entries.length; i += chunkSize) {
      const batch = db.batch();
      const slice = entries.slice(i, i + chunkSize);
      slice.forEach(e => {
        const ref = db.collection('products').doc();
        batch.set(ref, { ...e, createdAt: now, updatedAt: now });
      });
      await batch.commit();
    }
  }

  const field = id => (document.getElementById(id)?.value ?? '').trim();

  // ===== Handlers =====
  singleBtn?.addEventListener('click', async () => {
    try {
      setStatus(singleStatus, '');
      const product = {
        title: field('title'),
        description: field('description'),
        price: parseFloat(field('price')) || 0,
        tags: splitList(field('tags')), // use ; or | for multiple
        image1: field('image1'),
        variation: {
          type: field('varType'),
          name: field('varName'),
          values: splitList(field('varValues')),
        },
      };

      if (!product.title) { alert('Title is required.'); return; }
      setStatus(singleStatus, 'Uploading to Firestore…');
      await writeProducts([product]);
      setStatus(singleStatus, 'Product uploaded!');
      document.getElementById('singleForm')?.reset();
    } catch (e) {
      console.error(e);
      alert('Upload failed: ' + (e.message || e));
      setStatus(singleStatus, 'Upload failed.');
    }
  });

  // Row mode: support TSV (tabs) or CSV (commas); we quote TSV so embedded commas survive.
  rowBtn?.addEventListener('click', async () => {
    try {
      setStatus(rowStatus, '');
      const raw = document.getElementById('rowText')?.value || '';
      const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (!lines.length) { alert('No valid rows found.'); return; }

      const header = [
        'TITLE','DESCRIPTION','PRICE','TAGS','IMAGE1',
        'VARIATION 1 TYPE','VARIATION 1 NAME','VARIATION 1 VALUES'
      ];

      let csvBody = '';
      if (raw.includes('\t')) {
        // Treat as TSV: split by tabs, then safely quote to CSV
        csvBody = lines
          .map(line => line.split('\t').map(csvQuote).join(','))
          .join('\n');
      } else {
        // Treat as CSV already; leave as-is to preserve quoting the user pasted
        csvBody = lines.join('\n');
      }

      const csv = `${header.join(',')}\n${csvBody}`;
      const entries = parseCSV(csv);
      if (!entries.length) { alert('No valid rows found.'); return; }

      setStatus(rowStatus, 'Uploading to Firestore…');
      await writeProducts(entries);
      setStatus(rowStatus, 'Products uploaded!');
      document.getElementById('rowForm')?.reset();
    } catch (e) {
      console.error(e);
      alert('Upload failed: ' + (e.message || e));
      setStatus(rowStatus, 'Upload failed.');
    }
  });

  csvBtn?.addEventListener('click', async () => {
    try {
      setStatus(csvStatus, '');
      const file = document.getElementById('csvFile')?.files?.[0];
      const csv = file ? await file.text() : '';
      const entries = parseCSV(csv);
      if (!entries.length) { alert('No valid rows found.'); return; }
      setStatus(csvStatus, 'Uploading to Firestore…');
      await writeProducts(entries);
      setStatus(csvStatus, 'Products uploaded!');
      document.getElementById('csvForm')?.reset();
    } catch (e) {
      console.error(e);
      alert('Upload failed: ' + (e.message || e));
      setStatus(csvStatus, 'Upload failed.');
    }
  });

  // swipe back
  let startX = 0;
  document.addEventListener('touchstart', e => (startX = e.changedTouches[0].screenX));
  document.addEventListener('touchend', e => {
    if (e.changedTouches[0].screenX - startX > 80) {
      if (history.length > 1) history.back();
      else location.href = '../index.html';
    }
  });
})();
