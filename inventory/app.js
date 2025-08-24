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
  const db = firebase.firestore();

  try { await auth.signInAnonymously(); } catch (err) {
    console.error('Anon sign-in failed:', err);
  }

  const grid = document.getElementById('productGrid');
  const searchInput = document.getElementById('searchInput');
  const typeFilter = document.getElementById('typeFilter');
  const actionToggle = document.getElementById('actionToggle');
  const submitBtn = document.getElementById('submitBtn');
  const clearBtn = document.getElementById('clearBtn');

  let allProducts = [];
  let quantities = {};

  const STORAGE_KEY = 'inventoryGridState';

  function saveState() {
    const state = {
      quantities,
      actionIn: actionToggle.classList.contains('stock-in')
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const state = JSON.parse(raw);
      quantities = state.quantities || {};
      if (state.actionIn) {
        actionToggle.classList.remove('stock-out');
        actionToggle.classList.add('stock-in');
        actionToggle.textContent = 'Stock In';
      }
    } catch (_) {}
  }

  function render(list) {
    grid.innerHTML = '';
    list.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.dataset.id = p.id;
      card.dataset.title = p.title || '';

      card.innerHTML = `
        <img src="${p.image1 || ''}" alt="${p.title || ''}">
        <div class="quantity-control">
          <button type="button" class="up">^</button>
          <span class="qty">${quantities[p.id] || 0}</span>
          <button type="button" class="down">⌄</button>
        </div>
      `;

      const qtySpan = card.querySelector('.qty');

      card.querySelector('.down').addEventListener('click', () => {
        const q = quantities[p.id] || 0;
        if (q > 0) {
          quantities[p.id] = q - 1;
          qtySpan.textContent = quantities[p.id];
          saveState();
        }
      });

      card.querySelector('.up').addEventListener('click', () => {
        quantities[p.id] = (quantities[p.id] || 0) + 1;
        qtySpan.textContent = quantities[p.id];
        saveState();
      });

      grid.appendChild(card);
    });
  }

  function applyFilters() {
    let list = [...allProducts];
    const query = searchInput.value.toLowerCase();
    const type = typeFilter.value;
    if (query) {
      list = list.filter(p => (p.title || '').toLowerCase().includes(query));
    }
    if (type) {
      list = list.filter(p => p.type === type);
    }
    list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    render(list);
  }

  actionToggle.addEventListener('click', () => {
    const isIn = actionToggle.classList.toggle('stock-in');
    actionToggle.classList.toggle('stock-out', !isIn);
    actionToggle.textContent = isIn ? 'Stock In' : 'Stock Out';
    saveState();
  });

  searchInput.addEventListener('input', applyFilters);
  typeFilter.addEventListener('change', applyFilters);

  submitBtn.addEventListener('click', e => {
    e.preventDefault();
    const actionType = actionToggle.classList.contains('stock-in') ? 'in' : 'out';
    const entries = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([id, quantity]) => ({ id, quantity }));
    if (!entries.length) {
      alert('Please select at least one product.');
      return;
    }
    submitBtn.disabled = true;
    google.script.run
      .withSuccessHandler(() => {
        alert('Inventory updated!');
        submitBtn.disabled = false;
      })
      .withFailureHandler(err => {
        alert('Error: ' + err.message);
        submitBtn.disabled = false;
      })
      .processInventoryAction(actionType, entries);
  });

  clearBtn.addEventListener('click', () => {
    quantities = {};
    applyFilters();
    saveState();
  });

  loadState();

  try {
    const snapshot = await db.collection('products').get();
    const typeSet = new Set();
    allProducts = snapshot.docs.map(doc => {
      const data = doc.data();
      if (data.type) typeSet.add(data.type);
      return { id: doc.id, ...data };
    });
    Array.from(typeSet).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      typeFilter.appendChild(opt);
    });
    applyFilters();
  } catch (err) {
    console.error('Failed to load products:', err);
  }
})();
