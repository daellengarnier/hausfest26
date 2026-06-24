/**
 * Code.gs — server side for the Cleverclip Translation Tool.
 *
 * Responsibilities:
 *   - serve the web app (doGet / include)
 *   - setup(): create the backend Sheet once (run as ai@cleverclip.ch)
 *   - CRUD over translation projects
 *   - server-side machine translation via LanguageApp (Google Translate)
 */

/* ------------------------------------------------------------------ *
 * Web app entry points
 * ------------------------------------------------------------------ */

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(APP_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setFaviconUrl('https://www.cleverclip.ch/favicon.ico')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Include another HTML file (Styles / JavaScript) into Index. */
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/* ------------------------------------------------------------------ *
 * Setup — run ONCE from the Apps Script editor as ai@cleverclip.ch
 * ------------------------------------------------------------------ */

/**
 * Creates the backend spreadsheet and stores its id in Script Properties.
 * Idempotent: running it again returns the existing id.
 */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var existing = props.getProperty('BACKEND_SHEET_ID');
  if (existing) {
    try {
      SpreadsheetApp.openById(existing);
      Logger.log('Backend already exists: ' + existing);
      return existing;
    } catch (e) {
      // stored id no longer valid — fall through and recreate
    }
  }

  var ss = SpreadsheetApp.create(BACKEND_NAME);
  var sheet = ss.getSheets()[0];
  sheet.setName('Items');
  sheet.getRange(1, 1, 1, ITEM_COLUMNS.length).setValues([ITEM_COLUMNS]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, ITEM_COLUMNS.length).setFontWeight('bold');

  props.setProperty('BACKEND_SHEET_ID', ss.getId());
  Logger.log('Backend created: ' + ss.getId());
  Logger.log('Move it into Drive: cc-apps/cc-app-translation-tool/');
  return ss.getId();
}

/* ------------------------------------------------------------------ *
 * Sheet helpers
 * ------------------------------------------------------------------ */

function getSheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('BACKEND_SHEET_ID');
  if (!id) {
    throw new Error('Backend not initialised. Run setup() once from the editor.');
  }
  var sheet = SpreadsheetApp.openById(id).getSheetByName('Items');
  if (!sheet) throw new Error('Backend sheet "Items" not found.');
  return sheet;
}

function rowToObject_(row) {
  var obj = {};
  for (var i = 0; i < ITEM_COLUMNS.length; i++) {
    obj[ITEM_COLUMNS[i]] = row[i];
  }
  return obj;
}

function objectToRow_(obj) {
  return ITEM_COLUMNS.map(function (col) {
    var v = obj[col];
    return v === undefined || v === null ? '' : v;
  });
}

/** Returns { row: 1-based row index, data: object } or null. */
function findRowById_(sheet, id) {
  var values = sheet.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) { // skip header
    if (String(values[r][0]) === String(id)) {
      return { row: r + 1, data: rowToObject_(values[r]) };
    }
  }
  return null;
}

function countTranslated_(segments) {
  var n = 0;
  for (var i = 0; i < segments.length; i++) {
    if (segments[i].target && String(segments[i].target).trim() !== '') n++;
  }
  return n;
}

function deriveStatus_(segmentCount, translatedCount) {
  if (translatedCount === 0) return STATUS.NEW;
  if (translatedCount >= segmentCount) return STATUS.DONE;
  return STATUS.IN_PROGRESS;
}

/* ------------------------------------------------------------------ *
 * CRUD API (called from the client via google.script.run)
 * ------------------------------------------------------------------ */

/** Lightweight list for the dashboard — omits the heavy segments/xliff fields. */
function listProjects() {
  var values = getSheet_().getDataRange().getValues();
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var o = rowToObject_(values[r]);
    out.push({
      id: o.id,
      fileName: o.fileName,
      sourceLang: o.sourceLang,
      targetLang: o.targetLang,
      status: o.status,
      segmentCount: Number(o.segmentCount) || 0,
      translatedCount: Number(o.translatedCount) || 0,
      updatedAt: o.updatedAt
    });
  }
  // newest first
  out.sort(function (a, b) { return String(b.updatedAt).localeCompare(String(a.updatedAt)); });
  return out;
}

/** Full project incl. parsed segments. */
function getProject(id) {
  var hit = findRowById_(getSheet_(), id);
  if (!hit) throw new Error('Project not found: ' + id);
  var o = hit.data;
  o.segments = o.segments ? JSON.parse(o.segments) : [];
  return o;
}

/**
 * Create a project from a parsed XLIFF upload.
 * payload = { fileName, sourceLang, targetLang, segments:[{id,source,target}], xliff }
 */
function createProject(payload) {
  var sheet = getSheet_();
  var now = new Date().toISOString();
  var segments = payload.segments || [];
  var translated = countTranslated_(segments);

  var obj = {
    id: Utilities.getUuid(),
    fileName: payload.fileName || 'untitled.xlf',
    sourceLang: payload.sourceLang || '',
    targetLang: payload.targetLang || '',
    status: deriveStatus_(segments.length, translated),
    segmentCount: segments.length,
    translatedCount: translated,
    segments: JSON.stringify(segments),
    xliff: payload.xliff || '',
    createdAt: now,
    updatedAt: now
  };

  sheet.appendRow(objectToRow_(obj));
  return obj.id;
}

/**
 * Update targets / target language of a project.
 * payload = { segments:[{id,source,target}], targetLang? }
 */
function updateProject(id, payload) {
  var sheet = getSheet_();
  var hit = findRowById_(sheet, id);
  if (!hit) throw new Error('Project not found: ' + id);

  var o = hit.data;
  var segments = payload.segments || JSON.parse(o.segments || '[]');
  var translated = countTranslated_(segments);

  o.segments = JSON.stringify(segments);
  o.segmentCount = segments.length;
  o.translatedCount = translated;
  if (payload.targetLang) o.targetLang = payload.targetLang;
  o.status = deriveStatus_(segments.length, translated);
  o.updatedAt = new Date().toISOString();

  sheet.getRange(hit.row, 1, 1, ITEM_COLUMNS.length).setValues([objectToRow_(o)]);
  return true;
}

function deleteProject(id) {
  var sheet = getSheet_();
  var hit = findRowById_(sheet, id);
  if (!hit) throw new Error('Project not found: ' + id);
  sheet.deleteRow(hit.row);
  return true;
}

/* ------------------------------------------------------------------ *
 * Machine translation (server side — LanguageApp = Google Translate)
 * ------------------------------------------------------------------ */

/** "en-US" -> "en". LanguageApp expects 2-letter codes. */
function shortLang_(code) {
  return String(code || '').split(/[-_]/)[0].toLowerCase();
}

/**
 * Translate the given segments. Only fills targets that are empty unless
 * overwrite is true. Returns the updated segments array.
 *
 * segments = [{ id, source, target }]
 */
function autoTranslate(segments, sourceLang, targetLang, overwrite) {
  var src = shortLang_(sourceLang);
  var tgt = shortLang_(targetLang);
  if (!tgt) throw new Error('No target language set for this project.');

  for (var i = 0; i < segments.length; i++) {
    var seg = segments[i];
    var hasTarget = seg.target && String(seg.target).trim() !== '';
    if (hasTarget && !overwrite) continue;
    var source = String(seg.source || '');
    if (source.trim() === '') continue;
    try {
      seg.target = LanguageApp.translate(source, src, tgt);
    } catch (e) {
      // leave target untouched on a single failure; keep going
      Logger.log('translate failed for segment ' + seg.id + ': ' + e);
    }
  }
  return segments;
}
