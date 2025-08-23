/**
 * Firestore configuration
 */
const PROJECT_ID = 'YOUR_FIRESTORE_PROJECT_ID';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/**
 * Fetches documents from a Firestore collection.
 * Authentication must be configured for the UrlFetchApp requests
 * to succeed in a real deployment.
 */
function fetchCollection(path) {
  const res = UrlFetchApp.fetch(`${BASE_URL}/${path}`);
  const data = JSON.parse(res.getContentText());
  return data.documents || [];
}

/**
 * Serves Index, Inventory, Expenses or Restock pages based on ?page=
 */
function doGet(e) {
  const raw = (e.parameter.page || 'index').toLowerCase();
  let fileName;
  switch (raw) {
    case 'inventory':
      fileName = 'Inventory';
      break;
    case 'expenses':
      fileName = 'Expenses';
      break;
    case 'restock':
      fileName = 'Restock';
      break;
    default:
      fileName = 'Index';
  }

  const template = HtmlService.createTemplateFromFile(fileName);

  if (fileName === 'Expenses') {
    const docs = fetchCollection('IncomeExpenses');
    template.categories = docs
      .map(d => d.fields?.category?.stringValue)
      .filter(String);

  } else if (fileName === 'Restock') {
    const docs = fetchCollection('Inventory');
    const rows = docs.map(d => {
      const f = d.fields || {};
      return {
        name:      f.name?.stringValue || '',
        stockIn:   Number(f.stockIn?.integerValue || 0),
        stockOut:  Number(f.stockOut?.integerValue || 0),
        stockLeft: Number(f.stockLeft?.integerValue || 0),
        threshold: Number(f.threshold?.integerValue || 0),
        needs:     Boolean(f.needs?.booleanValue)
      };
    });
    template.alertItems = rows.filter(item => item.needs || item.stockLeft <= item.threshold);

  } else if (fileName === 'Inventory') {
    const docs = fetchCollection('Inventory');
    template.stickers = docs
      .map(d => d.fields?.name?.stringValue)
      .filter(String);
  }

  const titleMap = {
    Index:     'Dashboard',
    Inventory: 'Inventory Manager',
    Expenses:  'Expenses Tracker',
    Restock:   'Restock Alerts'
  };

  return template.evaluate()
    .setTitle(titleMap[fileName])
    .addMetaTag('viewport','width=device-width,initial-scale=1.0,viewport-fit=cover');
}

/**
 * Updates inventory counts in Firestore.
 */
function processInventoryAction(actionType, entries) {
  entries.forEach(entry => {
    const docPath = `Inventory/${encodeURIComponent(entry.sticker)}`;
    const res = UrlFetchApp.fetch(`${BASE_URL}/${docPath}`, { muteHttpExceptions: true });
    let fields = {};
    if (res.getResponseCode() === 200) {
      fields = JSON.parse(res.getContentText()).fields || {};
    }
    let stockIn  = Number(fields.stockIn?.integerValue || 0);
    let stockOut = Number(fields.stockOut?.integerValue || 0);
    let stockLeft = Number(fields.stockLeft?.integerValue || 0);
    const threshold = Number(fields.threshold?.integerValue || 0);

    if (actionType === 'in') {
      stockIn += entry.quantity;
      stockLeft += entry.quantity;
    } else {
      stockOut += entry.quantity;
      stockLeft = Math.max(0, stockLeft - entry.quantity);
    }
    const needs = stockLeft <= threshold;

    const payload = {
      fields: {
        name:      { stringValue: entry.sticker },
        stockIn:   { integerValue: stockIn },
        stockOut:  { integerValue: stockOut },
        stockLeft: { integerValue: stockLeft },
        threshold: { integerValue: threshold },
        needs:     { booleanValue: needs }
      }
    };

    const method = res.getResponseCode() === 200 ? 'PATCH' : 'POST';
    const url = method === 'PATCH'
      ? `${BASE_URL}/${docPath}`
      : `${BASE_URL}/Inventory?documentId=${encodeURIComponent(entry.sticker)}`;

    UrlFetchApp.fetch(url, {
      method,
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  });
}

/**
 * Logs expense entries to Firestore.
 */
function processExpenses(user, entries) {
  entries.forEach(entry => {
    const payload = {
      fields: {
        user:     { stringValue: user },
        category: { stringValue: entry.category },
        amount:   { doubleValue: entry.amount },
        ts:       { timestampValue: new Date().toISOString() }
      }
    };
    UrlFetchApp.fetch(`${BASE_URL}/Expenses`, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  });
}
