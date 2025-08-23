// app.js — Add New Product page logic

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

  // CSV parser reused from AddProducts page
  function parseCSV(text) {
    const clean = (text || '').replace(/^\uFEFF/, '').trim();
    if (!clean) return [];
    const lines = clean.split(/\r?\n/);

    const parseLine = (s) =>
      (s.match(/("([^"\\]|\\.|"")*"|[^,]*)(?=,|$)/g) || [])
        .map((c) => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim());

    const headers = parseLine(lines.shift()).map(h => h.toLowerCase());
    if (!headers.length) return [];

    return lines
      .filter(Boolean)
      .map(line => {
        const cols = parseLine(line);
        const obj = {};
        headers.forEach((h, i) => (obj[h] = cols[i] ?? ''));

        return {
          title: obj.title,
          description: obj.description,
          price: parseFloat(obj.price) || 0,
          tags: obj.tags ? obj.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          image1: obj.image1,
          variation: {
            type: obj['variation 1 type'] || '',
            name: obj['variation 1 name'] || '',
            values: obj['variation 1 values']
              ? obj['variation 1 values'].split(',').map(v => v.trim()).filter(Boolean)
              : [],
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
  const bulkStatus   = document.getElementById('bulkStatus');
  const singleBtn    = document.getElementById('singleUpload');
  const bulkBtn      = document.getElementById('bulkUpload');

  const field = id => document.getElementById(id)?.value.trim();

  singleBtn?.addEventListener('click', async () => {
    try {
      setStatus(singleStatus, '');
      const product = {
        title: field('title'),
        description: field('description'),
        price: parseFloat(field('price')) || 0,
        tags: field('tags') ? field('tags').split(',').map(t => t.trim()).filter(Boolean) : [],
        image1: field('image1'),
        variation: {
          type: field('varType'),
          name: field('varName'),
          values: field('varValues') ? field('varValues').split(',').map(v => v.trim()).filter(Boolean) : [],
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

  bulkBtn?.addEventListener('click', async () => {
    try {
      setStatus(bulkStatus, '');
      const text = document.getElementById('bulkText')?.value || '';
      const csv = `TITLE,DESCRIPTION,PRICE,TAGS,IMAGE1,VARIATION 1 TYPE,VARIATION 1 NAME,VARIATION 1 VALUES\n${text}`;
      const entries = parseCSV(csv);
      if (!entries.length) { alert('No valid rows found.'); return; }
      setStatus(bulkStatus, 'Uploading to Firestore…');
      await writeProducts(entries);
      setStatus(bulkStatus, 'Products uploaded!');
      document.getElementById('bulkForm')?.reset();
    } catch (e) {
      console.error(e);
      alert('Upload failed: ' + (e.message || e));
      setStatus(bulkStatus, 'Upload failed.');
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
})();
