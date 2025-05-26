/**
 * Configuration
 */
const SHEET_ID = 'YOUR_SHEET_ID_HERE';  // ← replace with your Spreadsheet’s ID

/**
 * GET handler: serves JSON for data or falls back to your HTML templates
 */
function doGet(e) {
  const action = e.parameter.action;
  const page   = (e.parameter.page || '').toLowerCase();

  // 1a) Data‐fetch endpoint
  if (action === 'list') {
    const ss    = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(page === 'expenses'
                       ? 'IncomeExpenses'
                       : page === 'restock'
                         ? 'Inventory'
                         : 'Inventory');
    // for expenses we might return categories; for inventory/restock, full rows
    if (page === 'expenses') {
      const cats = sheet.getRange('A2:A').getValues().flat().filter(String);
      return ContentService.createTextOutput(JSON.stringify(cats))
                           .setMimeType(ContentService.MimeType.JSON);
    } else {
      // Inventory or Restock both live in the Inventory sheet
      const rows = sheet.getRange('A2:F').getValues().filter(r => r[0]);
      return ContentService.createTextOutput(JSON.stringify(rows))
                           .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 1b) Fallback: serve your HTML templates via HtmlService
  const tplName = (page === 'expenses' || page === 'restock' || page === 'inventory')
                ? page.charAt(0).toUpperCase() + page.slice(1)
                : 'Index';
  const t = HtmlService.createTemplateFromFile(tplName);
  return t.evaluate()
          .setTitle(tplName)
          .addMetaTag('viewport','width=device-width,initial-scale=1.0');
}

/**
 * POST handler: accepts JSON payloads to append rows
 */
function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const ss     = SpreadsheetApp.openById(SHEET_ID);
  let sheet;

  if (params.page === 'expenses') {
    sheet = ss.getSheetByName('ExpenseLog');
    // expect params.values = [user, category, amount, description]
  } else {
    sheet = ss.getSheetByName('Shipping Log');
    // expect params.values = [sticker, quantity, actionType]
  }

  sheet.appendRow([new Date(), ...(params.values)]);
  return ContentService.createTextOutput(JSON.stringify({ success: true }))
                       .setMimeType(ContentService.MimeType.JSON);
}
