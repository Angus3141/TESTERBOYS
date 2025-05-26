/**
 * Configuration
 */
const SHEET_ID = '1j6awHnwdaKQLiw1Z1emrH_b7N8IUmVaaZrS-JrLU45M';  // ← replace with your Spreadsheet’s ID

/**
 * Serves Inventory, Expenses or Restock pages based on URL param ?page=
 */
function doGet(e) {
  const page = (e.parameter.page || 'inventory').toLowerCase();
  const file = page === 'expenses'
    ? 'Expenses'
    : page === 'restock'
      ? 'Restock'
      : 'Inventory';
  const template = HtmlService.createTemplateFromFile(file);
  const ss = SpreadsheetApp.openById(SHEET_ID);

  if (page === 'expenses') {
    const summarySheet = ss.getSheetByName('IncomeExpenses');
    if (!summarySheet) throw new Error('Sheet "IncomeExpenses" not found');
    template.categories = summarySheet
      .getRange('A2:A')
      .getValues()
      .flat()
      .filter(String);

  } else if (page === 'restock') {
    const inv = ss.getSheetByName('Inventory');
    if (!inv) throw new Error('Sheet "Inventory" not found');
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

  } else {
    const inv = ss.getSheetByName('Inventory');
    if (!inv) throw new Error('Sheet "Inventory" not found');
    template.stickers = inv
      .getRange('A2:A')
      .getValues()
      .flat()
      .filter(String);
  }

  const title = page === 'expenses'
    ? 'Expenses Tracker'
    : page === 'restock'
      ? 'Restock Alerts'
      : 'Inventory Manager';

  return template.evaluate()
    .setTitle(title)
    .addMetaTag('viewport', 'width=device-width,initial-scale=1.0,viewport-fit=cover');
}


/**
 * Logs inventory actions (in/out) and updates the Inventory sheet
 */
function processInventoryAction(actionType, entries) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const log = ss.getSheetByName('Shipping Log');
  const inv = ss.getSheetByName('Inventory');
  if (!log) throw new Error('Sheet "Shipping Log" not found');
  if (!inv) throw new Error('Sheet "Inventory" not found');

  const data = inv.getDataRange().getValues();
  const ts = new Date();

  entries.forEach(e => {
    // 1) Append to log
    log.appendRow([ts, e.sticker, e.quantity, actionType]);
    // 2) Update inventory counts
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === e.sticker) {
        const row = i + 1;
        const col = (actionType === 'in' ? 2 : 3);
        inv.getRange(row, col)
           .setValue((data[i][col - 1] || 0) + e.quantity);
        break;
      }
    }
  });
}


/**
 * Logs expenses/income entries and updates the summary sheet
 */
function processExpenses(user, entries) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const log = ss.getSheetByName('ExpenseLog');
  const summary = ss.getSheetByName('IncomeExpenses');
  if (!log) throw new Error('Sheet "ExpenseLog" not found');
  if (!summary) throw new Error('Sheet "IncomeExpenses" not found');

  const data = summary.getDataRange().getValues();
  const ts = new Date();

  entries.forEach(e => {
    // 1) Append new log entry
    log.appendRow([ts, user, e.category, e.amount, e.description]);
    // 2) Update category totals
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === e.category) {
        summary.getRange(i + 1, 2)
               .setValue((data[i][1] || 0) + e.amount);
        summary.getRange(i + 1, 3)
               .setValue((data[i][2] || 0) + 1);
        break;
      }
    }
  });
}
