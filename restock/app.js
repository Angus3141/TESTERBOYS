(async function () {
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

  try { await auth.signInAnonymously(); } catch (err) {
    console.error('Anon sign-in failed:', err);
  }

  const grid  = document.getElementById('alertGrid');
  const empty = document.getElementById('emptyMessage');

  try {
    const snapshot = await db.collection('products').get();
    const items = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const quantity = Number(
        data.quantity ?? data.Quantity ?? data.stockLeft ?? 0
      );
      const restock = Number(
        data.restock ?? data.Restock ?? data.threshold ?? 0
      );
      const name = data.title || data.name || doc.id;
      if (quantity <= restock) {
        items.push({ name, quantity, restock });
      }
    });

    if (items.length) {
      items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <h2>${item.name}</h2>
          <div class="info"><span class="label">Left:</span><span class="value">${item.quantity}</span></div>
          <div class="info"><span class="label">Threshold:</span><span class="threshold">${item.restock}</span></div>
          <div class="info"><span class="label">Needs Restock?</span><span>Yes</span></div>`;
        grid.appendChild(card);
      });
    } else {
      empty.removeAttribute('hidden');
    }
  } catch (err) {
    console.error('Failed to load restock info:', err);
    empty.textContent = 'Failed to load restock data.';
    empty.removeAttribute('hidden');
  }

  let startX = 0;
  document.addEventListener('touchstart', e => {
    startX = e.changedTouches[0].screenX;
  });
  document.addEventListener('touchend', e => {
    if (e.changedTouches[0].screenX - startX > 80) {
      if (history.length > 1) history.back();
      else location.href = '../index.html';
    }
  });
})();
