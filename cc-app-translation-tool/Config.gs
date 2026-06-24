/**
 * Config.gs — configuration for the Cleverclip Translation Tool.
 *
 * Follows the cc-app standard: APP_TITLE, BACKEND_NAME and ITEM_COLUMNS
 * (the data model) live here so the rest of the code stays generic.
 *
 * The backend is a single Google Sheet created by setup(). One row =
 * one translation project (one uploaded Articulate XLIFF file).
 */

var APP_TITLE = 'Cleverclip Translation Tool';

// Name of the backend spreadsheet that setup() creates (under ai@cleverclip.ch).
var BACKEND_NAME = 'cc-app-translation-tool-backend';

// Data model. Order matters: this is the header row written to the sheet.
var ITEM_COLUMNS = [
  'id',              // uuid
  'fileName',        // original file name, e.g. "course-rise.xlf"
  'sourceLang',      // e.g. "en-US"
  'targetLang',      // e.g. "de-CH"
  'status',          // "New" | "In progress" | "Done"
  'segmentCount',    // total trans-units
  'translatedCount', // trans-units with a non-empty target
  'segments',        // JSON string: [{ id, source, target }]
  'xliff',           // original XLIFF text, kept so export can re-merge targets
  'createdAt',       // ISO timestamp
  'updatedAt'        // ISO timestamp
];

// Status values used by the UI.
var STATUS = {
  NEW: 'New',
  IN_PROGRESS: 'In progress',
  DONE: 'Done'
};
