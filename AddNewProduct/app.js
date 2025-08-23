// app.js — Add New Product page logic (robust CSV handling; preserves commas inside cells)

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
    document.querySelectorAll('form button').forEach(btn => {
      if (!btn.getAttribute('type')) btn.setAttribute('type', 'button');
    });
  }

  // Title-case normaliser used for human-facing text; does NOT split fields anymore.
  function normalizeParts(text) {
    return (text || '')
      .split(',') // keep existing behaviour for titles/descriptions that came comma-separated
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
  }

  // RFC 4180-compliant CSV line parser: preserves commas inside quoted cells; supports "" escapes.
  function parseCSVLine(s) {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < s.length && s[i + 1] === '"') { // double quote -> literal quote
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else {
        if (ch === ',') {
          out.push(cur);
          cur = '';
        } else if (ch === '"') {
          inQuotes = true;
        } else {
          cur += ch;
        }
      }
    }
    out.push(cur);
    return out.map(c => c.trim());
  }

  // Quote a single field for CSV output (used by Row/TSV mode)
  function csvQuote(field = '') {
    const s = String(field ?? '');
    const needsQuotes = /[",\r\n]/.test(s);
    const esc = s.replace(/"/g, '""');
    return needsQuotes ? `"${esc}"` : esc;
  }

  // Split helper for list fields: DO NOT split on commas (since many cells contain commas).
  // If multiple entries are desired, separate them with ';' or '|' in the CSV cell.
  function splitListPreservingCommas(s = '') {
    const trimmed = s.trim();
    if (!trimmed) return [];
    const parts = /[;|]/.test(trimmed) ? trimmed.split(/[;|]/) : [trimmed];
    return parts.map(p => p.trim()).filter(Boolean);
  }

  // Robust CSV parser using parseCSVLine for every row.
  function parseCSV(text) {
    const clean = (text || '').replace(/^\uFEFF/, '').trim();
    if (!clean) return [];
    const lines = clean.split(/\r?\n/);

    const headers = parseCSVLine(lines.shift()).map(h => h.toLowerCase());
    if (!headers.length) return [];

    return lines
      .filter(line => line.length > 0)
      .map(line => {
        const cols = parseCSVLine(line);
        const obj = {};
        headers.forEach((h, i) => (obj[h] = (cols[i] ?? '').trim()));

        return {
          title: normalizeParts(obj.title).join(', '),           // keep visual normalisation
          description: normalizeParts(obj.description).join(', '),
          price: parseFloat(obj.price) || 0,
          tags: splitListPreservingCommas(obj.tags),             // use ; or | for multiple
          image1: (obj.image1 || '').trim(),
          variation: {
            type: (obj['variation 1 type'] || '').trim(),
            name: (obj['variation 1 name'] || '').trim(),
            values: splitListPreservingCommas(obj['variation 1 values']), // use ; or |
          },
        };
      })
      .filter(e => e.title);
  }

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

  async function writeProducts(entries) {
    const batch = db.batch();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    entries.forEach(e => {
      const ref = db.collection('products').doc();
      batch.set(ref, { ...e, createdAt: now, updatedAt: now });
    });
    await batch.commit();
  }

  blockFormSubmissions();
  const singleStatus = document.getElementById('singleStatus');
  const rowStatus    = document.getElementById('rowStatus');
  const csvStatus    = document.getElementById('csvStatus');
  const singleBtn    = document.getElementById('singleUpload');
  const rowBtn       = document.getElementById('rowUpload');
  const csvBtn       = document.getElementById('csvUpload');

  // Toggle forms based on buttons
  const forms = ['singleForm','rowForm','csvForm'];
  const modeBtns = Array.from(document.querySelectorAll('.mode-buttons button'));
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      forms.forEach(id => document.getElementById(id)?.classList.add('hidden'));
      document.getElementById(btn.dataset.target)?.classList.remove('hidden');
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  forms.forEach(id => document.getElementById(id)?.classList.add('hidden'));
  // forms start hidden; show relevant form when a button is pressed

  const field = id => document.getElementById(id)?.value.trim() || '';

  singleBtn?.addEventListener('click', async () => {
    try {
      setStatus(singleStatus, '');
      const product = {
        title: field('title'),
        description: field('description'),
        price: parseFloat(field('price')) || 0,
        // IMPORTANT: do not split on commas; allow ; or | for multiple
        tags: splitListPreservingCommas(field('tags')),
        image1: field('image1'),
        variation: {
          type: field('varType'),
          name: field('varName'),
          values: splitListPreservingCommas(field('varValues')),
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

  // Row mode: treat pasted text as TSV by default, with robust quoting to CSV.
  // If no tabs are present, fall back to treating each non-empty line as a CSV row.
  rowBtn?.addEventListener('click', async () => {
    try {
      setStatus(rowStatus, '');
      const raw = document.getElementById('rowText')?.value || '';
      const nonEmptyLines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (!nonEmptyLines.length) { alert('No valid rows found.'); return; }

      const headerCols = [
        'TITLE','DESCRIPTION','PRICE','TAGS','IMAGE1',
        'VARIATION 1 TYPE','VARIATION 1 NAME','VARIATION 1 VALUES'
      ];

      let csvBody = '';
      if (raw.includes('\t')) {
        // TSV path: split by tabs and quote each cell for CSV
        csvBody = nonEmptyLines
          .map(line => line.split('\t').map(csvQuote).join(','))
          .join('\n');
      } else {
        // CSV path: assume user already pasted CSV rows; keep as-is
        csvBody = nonEmptyLines.join('\n');
      }

      const csv = `${headerCols.join(',')}\n${csvBody}`;
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

  let startX = 0;
  document.addEventListener('touchstart', e => (startX = e.changedTouches[0].screenX));
  document.addEventListener('touchend', e => {
    if (e.changedTouches[0].screenX - startX > 80) {
      if (history.length > 1) history.back();
      else location.href = '../index.html';
    }
  });

  // Developer note:
  // - To allow multiple tags/values within a single cell without breaking on commas,
  //   separate them with ';' or '|' (e.g., "red; blue | green").
})();
