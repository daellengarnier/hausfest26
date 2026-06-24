# cc-app-translation-tool

Internal Cleverclip web app — **translation tool for Articulate XLIFF** exports.
Built to the Cleverclip cc-app standard: Google Apps Script web app, backend =
Google Sheet, Cleverclip design system, access limited to `@cleverclip.ch`.

> ⚠️ **This folder was produced in a sandbox that has no access to the
> `Cleverclip-Admin` org or the `ai@cleverclip.ch` Google account.** It contains
> the finished app source so it can be dropped into a fresh `cc-app-template`
> clone and deployed by the owner account. The deploy/setup steps below still
> have to be run by a human with those credentials — see "Manual steps".

## What it does

1. **Upload** an Articulate XLIFF 1.2 export (`.xlf` / `.xliff`). It is parsed in
   the browser into `<trans-unit>` segments (source / target).
2. The file is saved as a **project** in the backend Sheet (one row per file).
3. **Translate** segments by hand, or hit **Auto-translate empty** — server-side
   machine translation via `LanguageApp` (Google Translate) fills empty targets.
4. **Export** re-merges the edited targets into the *original* XLIFF (matched by
   `trans-unit` id) and downloads a translated `.xlf` ready for re-import into
   Articulate.

## Files

| File               | Role                                                            |
|--------------------|-----------------------------------------------------------------|
| `Config.gs`        | `APP_TITLE`, `BACKEND_NAME`, `ITEM_COLUMNS` (data model)        |
| `Code.gs`          | `doGet`, `setup()`, CRUD, `autoTranslate()`                     |
| `Index.html`       | Layout (dashboard + segment editor)                            |
| `Styles.html`      | Cleverclip design system (Ink/Paper/Lime, Caprasimo + Inter)   |
| `JavaScript.html`  | XLIFF parse / merge, upload, editor, export                    |
| `appsscript.json`  | Web-app manifest (`access: DOMAIN`, `executeAs: USER_DEPLOYING`)|

## Data model (`ITEM_COLUMNS`)

`id, fileName, sourceLang, targetLang, status, segmentCount, translatedCount,
segments (JSON), xliff (original text), createdAt, updatedAt`

## Manual steps (require `ai@cleverclip.ch` + `Cleverclip-Admin`)

```bash
# 1. Create the repo from the template (gh authed to Cleverclip-Admin)
gh repo create Cleverclip-Admin/cc-app-translation-tool \
  --private --template Cleverclip-Admin/cc-app-template --clone
cd cc-app-translation-tool

# 2. Copy these files in (Config.gs, Code.gs, Index/Styles/JavaScript.html),
#    reconciling with the template's own scaffold where needed.

# 3. Create the Apps Script project as ai@cleverclip.ch
npm install
npx clasp login            # log in as ai@cleverclip.ch
npx clasp create-script --type standalone --title "cc-app-translation-tool"
git checkout appsscript.json   # create-script overwrites the manifest
npx clasp push -f

# 4. In the Apps Script editor (signed in as ai@cleverclip.ch) run setup() once
#    -> creates the backend Sheet "cc-app-translation-tool-backend".
#    Move the project + Sheet into Drive: cc-apps/cc-app-translation-tool/

# 5. Deploy
npx clasp deploy --description "v1"
# -> note the /exec URL

# Updates later (keep the SAME url):
npx clasp push -f && npx clasp redeploy <deploymentId>
```

Finally, add the `/exec` URL as a tile in the **Cleverclip Apps** dashboard.

## Known limitations

- Inline XLIFF tags (`<g>`, `<x/>`, `<bpt>` …) inside a segment are flattened to
  plain text for editing; on export the `<target>` is written as plain text.
  Fine for Rise body copy; revisit if a course relies on inline formatting runs.
- Each project (original XLIFF + segment JSON) is stored in single Sheet cells.
  Google's ~50k-char-per-cell limit means very large courses may need chunking.
- Machine translation uses `LanguageApp` (Google Translate) and is subject to
  Apps Script daily quotas.
