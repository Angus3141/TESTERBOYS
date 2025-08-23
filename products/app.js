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

  const listEl = document.getElementById('productList');
  const modal = document.getElementById('productModal');
  const modalImage = document.getElementById('modalImage');
  const modalTitle = document.getElementById('modalTitle');
  const modalDescription = document.getElementById('modalDescription');
  const modalPrice = document.getElementById('modalPrice');
  const modalTags = document.getElementById('modalTags');
  const modalVariation = document.getElementById('modalVariation');
  const modalClose = document.getElementById('modalClose');

  function openModal(data) {
    modalImage.src = data.image1 || '';
    modalTitle.textContent = data.title || '';
    modalDescription.textContent = data.description || '';
    modalPrice.textContent = data.price ? `$${data.price}` : '';
    modalTags.textContent = data.tags && data.tags.length ? `Tags: ${data.tags.join(', ')}` : '';
    const v = data.variation;
    modalVariation.textContent = v && (v.type || v.name || (v.values && v.values.length))
      ? `${v.type ? v.type + ': ' : ''}${v.name || ''} ${v.values && v.values.length ? '(' + v.values.join(', ') + ')' : ''}`
      : '';
    modal.classList.add('open');
    modal.removeAttribute('hidden');
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('hidden', '');
  }

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  try {
    const snapshot = await db.collection('products').get();
    snapshot.forEach(doc => {
      const data = doc.data();
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `<img src="${data.image1 || ''}" alt="${data.title || ''}"><h2>${data.title || ''}</h2>`;
      card.addEventListener('click', () => openModal(data));
      listEl.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to load products:', err);
  }
})();
