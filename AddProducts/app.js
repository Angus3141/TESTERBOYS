// --------- Firebase init (compat) ---------
// 1) Firestore must be enabled.
// 2) Authentication → Sign-in method → Enable Anonymous.
// 3) Firestore rules (for testing):
//    rules_version = '2';
//    service cloud.firestore {
//      match /databases/{db}/documents {
//        match /products/{id} {
//          allow create, update: if request.auth != null;
//          allow read: if true;
//        }
//      }
//    }

(function () {
  // TODO: paste your real config here:
const firebaseConfig = {
  apiKey: "AIzaSyAaKun3buWr3xXH7DTC1aAMz2NMu4QxA1c",
  authDomain: "testerboys-31725.firebaseapp.com",
  projectId: "testerboys-31725",
  storageBucket: "testerboys-31725.firebasestorage.app",
  messagingSenderId: "486443361948",
  appId: "1:486443361948:web:99d07e60a4fcef240caf59"
};

  try {
    firebase.initializeApp(firebaseConfig);
  } catch (e) {
    // ignore "already exists" if hot reloading
  }

  const auth = firebase.auth();
  const db   = firebase.firestore();

  // Make sure network is actually available; surface errors loudly.
  auth.signInAnonymously().catch(err => {
    console.error('Anon sign-in failed:', err);
    alert('Firebase auth failed: ' + (err?.message || err));
  });

  // --------- CSV parsing helpers ---------
  function parseCSV(text) {
    const clean = (text || "").replace(/^\uFEFF/, "").trim();
    if (!clean) return [];
    const lines = clean.split(/\r?\n/);

    const parseLine = (s) =>
      (s.match(/("([^"\\]|\\.|"")*"|[^,]*)(?=,|$)/g) || [])
        .map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"').trim());

    const headers = parseLine(lines.shift()).map((h) => h.toLowerCase());
    if (!headers.length) return [];

    return lines
      .filter(Boolean)
      .map((line) => {
        const cols = parseLine(line);
        const obj = {};
        headers.forEach((h, i) => (obj[h] = cols[i] ?? ""));

        return {
          title: obj.title,
          description: obj.description,
          price: parseFloat(obj.price) || 0,
          tags: obj.tags ? obj.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          image1: obj.image1,
          variation: {
            type: obj["variation 1 type"] || "",
            name: obj["variation 1 name"] || "",
            values: obj["variation 1 values"]
              ? obj["variation 1 values"].split(",").map((v) => v.trim()).filter(Boolean)
              : [],
          },
        };
      })
      .filter((e) => e.title);
  }

  async function writeProducts(entries) {
    const batch = db.batch();
    const now = firebase.firestore.FieldValue.serverTimestamp();

    entries.forEach((e) => {
      const ref = db.collection('products').doc();
      batch.set(ref, { ...e, createdAt: now, updatedAt: now });
    });

    await batch.commit();
  }

  function setStatus(el, msg) { if (el) el.textContent = msg; }

  // --------- UI wiring ---------
  const singleFile   = document.getElementById("singleFile");
  const singleText   = document.getElementById("singleText");
  const bulkFile     = document.getElementById("bulkFile");
  const bulkText     = document.getElementById("bulkText");
  const singleStatus = document.getElementById("singleStatus");
  const bulkStatus   = document.getElementById("bulkStatus");

  document.getElementById("singleUpload").addEventListener("click", async () => {
    try {
      if (!firebase?.apps?.length) throw new Error('Firebase not loaded');
      setStatus(singleStatus, "");
      const file = singleFile.files[0];
      const csv = file ? await file.text() : (singleText.value || "");
      const entries = parseCSV(csv);
      if (!entries.length) { alert("No valid rows found."); return; }

      setStatus(singleStatus, "Uploading to Firestore…");
      await writeProducts([entries[0]]);
      setStatus(singleStatus, "Product uploaded!");
      document.getElementById("singleForm").reset();
    } catch (e) {
      console.error(e);
      alert("Upload failed: " + (e.message || e));
      setStatus(singleStatus, "Upload failed.");
    }
  });

  document.getElementById("bulkUpload").addEventListener("click", async () => {
    try {
      if (!firebase?.apps?.length) throw new Error('Firebase not loaded');
      setStatus(bulkStatus, "");
      const file = bulkFile.files[0];
      const csv = file ? await file.text() : (bulkText.value || "");
      const entries = parseCSV(csv);
      if (!entries.length) { alert("No valid rows found."); return; }

      setStatus(bulkStatus, "Uploading to Firestore…");
      await writeProducts(entries);
      setStatus(bulkStatus, "Products uploaded!");
      document.getElementById("bulkForm").reset();
    } catch (e) {
      console.error(e);
      alert("Upload failed: " + (e.message || e));
      setStatus(bulkStatus, "Upload failed.");
    }
  });

  // Optional: simple iOS-like back swipe
  let startX = 0;
  document.addEventListener("touchstart", (e) => (startX = e.changedTouches[0].screenX));
  document.addEventListener("touchend", (e) => {
    if (e.changedTouches[0].screenX - startX > 80) {
      if (history.length > 1) history.back();
      else location.href = "./index.html";
    }
  });
})();
