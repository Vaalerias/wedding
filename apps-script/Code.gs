/**
 * Приём ответов анкеты свадебного сайта → Google Таблица.
 * SPREADSHEET_ID — id таблицы из её адреса (docs.google.com/spreadsheets/d/<ID>/edit).
 * Развертывание: Развернуть → Новое развертывание → Веб-приложение
 * (Запуск от имени: «Я», Доступ: «Все»). URL веб-приложения вставлен в index.html (RSVP_ENDPOINT).
 */
const SPREADSHEET_ID = '1sLdqIT5kFnkSKm8FjLCJD4jsH_FgmTVkWbIUubxwnyE';
const SHEET_NAME = 'Ответы';
const HEADERS = ['Дата и время', 'Имя и фамилия', 'Присутствие', 'Пара / семья'];
// Необязательно: адрес почты для уведомлений о каждом новом ответе ('' — без писем).
const NOTIFY_EMAIL = '';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const name = clean(data.name, 150);
    const attendance = clean(data.attendance, 10);
    const family = clean(data.family, 1000);
    if (!name || !attendance) return json({ ok: false, error: 'missing fields' });

    const sheet = getSheet();
    sheet.appendRow([new Date(), name, attendance, family]);

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail(NOTIFY_EMAIL, 'Новый ответ на анкету: ' + name,
        'Имя: ' + name + '\nПрисутствие: ' + attendance + '\nПара / семья: ' + (family || '—'));
    }
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json({ ok: true, status: 'ready' });
}

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    const first = ss.getSheets()[0];
    sheet = first.getLastRow() === 0 ? first.setName(SHEET_NAME) : ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setColumnWidths(1, HEADERS.length, 220);
  }
  return sheet;
}

// Обрезает длину и защищает от формул в ячейках (=, +, -, @ в начале).
function clean(value, max) {
  const text = String(value == null ? '' : value).trim().slice(0, max);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Запустить один раз вручную из редактора: создаёт заголовки и выдаёт доступ к таблице.
function setup() {
  getSheet();
}
