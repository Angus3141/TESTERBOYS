// app.js (ESM)

// --------- 1) Firebase setup ---------
// Make sure you've created a Firebase project with Firestore.
// In Firebase Console: Project Settings → General → Your apps → Web app → Config.
// Paste the config below and enable Authentication → Anonymous sign-in.

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  writeBatch,
  doc,
  collection,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// TODO: paste your config here:
const firebaseConfig = {
  apiKey: "AIzaSyAaKun3buWr3xXH7DTC1aAMz2NMu4QxA1c",
  authDomain: "testerboys-31725.firebaseapp.com",
  projectId: "testerboys-31725",
  storageBucket: "testerboys-31725.firebasestorage.app",
  messagingSenderId: "486443361948",
  appId: "1:486443361948:web:99d07e60a4fcef240caf59"
};
// Initialise (idempotent)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Sign in anonymously so rules can require auth without user UI.
try { await signInAnonymously(auth); } catch (e) { /* already signed in or disabled */ }

// --------- 2) Helpers ---------
function setStatus(el, msg) { if (el) el.textContent = msg; }

// Robust CSV line parser supporting quoted fields (with commas and escaped quotes)
function parseCSV(text) {
  const clean = (text || "").replace(/^\uFEFF/, "").trim();
  if (!clean) return [];
  const lines = clean.split(/\r?\n/);

  const parseLine = (s) =>
    s.match(/("([^"\\]|\\.|"")*"|[^,]*)(?=,|$)/g)
      ?.map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"').trim()) ?? [];

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

async function writeProductsToFirestore(entries) {
  const batch = writeBatch(db);
  for (const e of entries) {
    const ref = doc(collection(db, "products"));
    batch.set(ref, {
      ...e,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

// --------- 3) UI wiring ---------
const singleFile = document.getElementById("singleFile");
const singleText = document.getElementById("singleText");
const bulkFile   = document.getElementById("bulkFile");
const bulkText   = document.getElementById("bulkText");

const singleStatus = document.getElementById("singleStatus");
const bulkStatus   = document.getElementById("bulkStatus");

document.getElementById("singleUpload").addEventListener("click", async () => {
  setStatus(singleStatus, "");
  let csv = "";
  const file = singleFile.files[0];
  csv = file ? await file.text() : (singleText.value || "");

  const entries = parseCSV(csv);
  if (!entries.length) { alert("No valid rows found."); return; }

  try {
    setStatus(singleStatus, "Uploading to Firestore…");
    await writeProductsToFirestore([entries[0]]);
    setStatus(singleStatus, "Product uploaded!");
    document.getElementById("singleForm").reset();
  } catch (e) {
    console.error(e);
    alert("Firestore write failed: " + (e.message || e));
    setStatus(singleStatus, "Upload failed.");
  }
});

document.getElementById("bulkUpload").addEventListener("click", async () => {
  setStatus(bulkStatus, "");
  let csv = "";
  const file = bulkFile.files[0];
  csv = file ? await file.text() : (bulkText.value || "");

  const entries = parseCSV(csv);
  if (!entries.length) { alert("No valid rows found."); return; }

  try {
    setStatus(bulkStatus, "Uploading to Firestore…");
    await writeProductsToFirestore(entries);
    setStatus(bulkStatus, "Products uploaded!");
    document.getElementById("bulkForm").reset();
  } catch (e) {
    console.error(e);
    alert("Firestore write failed: " + (e.message || e));
    setStatus(bulkStatus, "Upload failed.");
  }
});

// Optional: simple iOS-style back swipe (kept from your original)
let startX = 0;
document.addEventListener("touchstart", (e) => (startX = e.changedTouches[0].screenX));
document.addEventListener("touchend", (e) => {
  if (e.changedTouches[0].screenX - startX > 80) {
    if (history.length > 1) history.back();
    else location.href = "./index.html";
  }
});
