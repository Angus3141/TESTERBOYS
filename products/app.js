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
  const searchInput = document.getElementById('searchInput');
  const typeFilter = document.getElementById('typeFilter');
  const searchButton = document.getElementById('searchButton');

  let allProducts = [];

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

  function renderProducts(list) {
    listEl.innerHTML = '';
    list.forEach(data => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `<img src="${data.image1 || ''}" alt="${data.title || ''}"><h2>${data.title || ''}</h2>`;
      card.addEventListener('click', () => openModal(data));
      listEl.appendChild(card);
    });
  }

  function applyFilters() {
    const query = searchInput.value.toLowerCase();
    const type = typeFilter.value;
    const filtered = allProducts.filter(p => {
      const matchesQuery = !query || (p.title && p.title.toLowerCase().includes(query));
      const matchesType = !type || p.type === type;
      return matchesQuery && matchesType;
    });
    renderProducts(filtered);
  }

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  searchInput.addEventListener('input', applyFilters);
  typeFilter.addEventListener('change', applyFilters);
  searchButton.addEventListener('click', applyFilters);

  try {
    const snapshot = await db.collection('products').get();
    const map = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      const key = data.title || doc.id;
      if (!map[key]) {
        map[key] = {
          ...data,
          variation: {
            type: data.variation?.type || '',
            name: data.variation?.name || '',
            values: data.variation?.values ? [...data.variation.values] : []
          }
        };
      } else {
        const existing = map[key];
        const v = data.variation;
        if (v) {
          existing.variation = existing.variation || { type: '', name: '', values: [] };
          if (!existing.variation.type && v.type) existing.variation.type = v.type;
          if (!existing.variation.name && v.name) existing.variation.name = v.name;
          if (v.values && v.values.length) {
            existing.variation.values = Array.from(new Set([...(existing.variation.values || []), ...v.values]));
          }
        }
      }
    });

    allProducts = Object.values(map);
    const types = Array.from(new Set(allProducts.map(p => p.type).filter(Boolean)));
    types.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      typeFilter.appendChild(opt);
    });

    renderProducts(allProducts);
  } catch (err) {
    console.error('Failed to load products:', err);
  }
})();
