/**
 * Configuration
 */
const SHEET_ID = '1j6awHnwdaKQLiw1Z1emrH_b7N8IUmVaaZrS-JrLU45M';  // ← keep this

/**
 * Serves Index, Inventory, Expenses or Restock pages based on ?page=
 */
function doGet(e) {
  // default to 'index' (your menu) when page is missing/empty/unknown
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
      fileName = 'Index';   // ← menu/dashboard
  }

  const template = HtmlService.createTemplateFromFile(fileName);
  const ss = SpreadsheetApp.openById(SHEET_ID);

  if (fileName === 'Expenses') {
    const summary = ss.getSheetByName('IncomeExpenses');
    template.categories = summary.getRange('A2:A').getValues().flat().filter(String);

  } else if (fileName === 'Restock') {
    const inv = ss.getSheetByName('Inventory');
    const rows = inv.getRange('A2:F').getValues().filter(r => r[0]);
    template.alertItems = rows
      .map(r => ({
        name:      r[0],
        stockIn:   r[1] || 0,
        stockOut:  r[2] || 0,
        stockLeft: r[3] || 0,
        threshold: r[4] || 0,
        needs:     r[5]
      }))
      .filter(item => {
        const flag = item.needs;
        return flag === true
            || String(flag).toLowerCase() === 'yes'
            || item.stockLeft <= item.threshold;
      });

  } else if (fileName === 'Inventory') {
    const inv = ss.getSheetByName('Inventory');
    template.stickers = inv.getRange('A2:A').getValues().flat().filter(String);
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
