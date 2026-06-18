# E2E Test Plan

Status legend: ✅ Covered · 🔲 Planned · ⬜ Out of scope

---

## Home Screen

| Feature | Priority | Status | Notes |
|---|---|---|---|
| Create blank worksheet (blank/lined/grid) | High | ✅ | `add-page-to-worksheet.test.ts` |
| Open worksheet from tile | High | ✅ | `add-page-to-worksheet.test.ts` |
| Delete worksheet | High | ✅ | `add-page-to-worksheet.test.ts` (cleanup) |
| Rename worksheet | High | ✅ | `home-screen.test.ts` |
| Create folder | Medium | ✅ | `home-screen.test.ts` |
| Move worksheet to folder | Medium | ✅ | `home-screen.test.ts` |
| Create worksheet from camera | Low | ✅ | `home-screen.test.ts` — mock image, full flow through preview → name → save |
| Create worksheet from gallery | Low | ⬜ | Requires media mock |
| Import from PDF | Low | ⬜ | Requires file mock |
| Search / filter | Medium | ✅ | `home-screen.test.ts` — finds sheets in folders, no-results message |
| Sort by name / date | Low | 🔲 | Sort toggle → order changes |
| Drag file between folders | Low | ⬜ | Complex gesture, low ROI |
| Backup / restore | Low | ⬜ | Hard to automate file system round-trip |

---

## Editor — Pages

| Feature | Priority | Status | Notes |
|---|---|---|---|
| Add blank page to worksheet | High | ✅ | `add-page-to-worksheet.test.ts` |
| Nav title shows current page (N/N) | High | ✅ | Key regression assertion |
| Navigate to next page | High | ✅ | `nav-next-page` testID |
| Navigate to previous page | Medium | 🔲 | `nav-prev-page` |
| Add page from camera | Low | ⬜ | Requires camera mock |
| Add page from gallery | Low | ⬜ | Requires media mock |
| Delete current page | Medium | 🔲 | More-menu → Delete page |

---

## Editor — Drawing

| Feature | Priority | Status | Notes |
|---|---|---|---|
| Select brush tool | High | ✅ | `toolbar-brush-btn` tap |
| Draw stroke on canvas | High | ✅ | `swipe('down')` on canvas |
| Brush color change | High | ✅ | `color-btn-{hex}` |
| Brush size change | Medium | 🔲 | `BrushSizePicker` — needs testIDs |
| Marker tool | Medium | 🔲 | `toolbar-marker-btn` — needs testID |
| Eraser | Medium | 🔲 | Eraser button — needs testID |
| Undo stroke | High | 🔲 | Undo btn → stroke disappears |
| Redo | Medium | 🔲 | After undo → redo restores |

---

## Editor — Text

| Feature | Priority | Status | Notes |
|---|---|---|---|
| Select text tool | High | ✅ | `toolbar-text-btn` |
| Place text box on canvas | High | ✅ | `tapAtPoint` on canvas |
| Type text | High | ✅ | `text-input-active` |
| Move text element | High | ✅ | `swipe` on `text-element-edit` |
| Change text size | High | ✅ | `text-size-btn-{n}` |
| Change text color | High | ✅ | `color-btn-{hex}` |
| Bold / italic / underline | Medium | 🔲 | Style buttons — needs testIDs |
| Font family change | Low | 🔲 | Font picker — needs testIDs |
| Text alignment | Medium | 🔲 | Alignment buttons — needs testIDs |
| Delete text element | Medium | 🔲 | Select + delete — needs testID |

---

## Editor — Ruler / Lines

| Feature | Priority | Status | Notes |
|---|---|---|---|
| Draw a line | Medium | 🔲 | Ruler tool + drag |
| Move line | Low | 🔲 | |
| Delete line | Low | 🔲 | |

---

## Editor — Images

| Feature | Priority | Status | Notes |
|---|---|---|---|
| Insert image from gallery | Low | ⬜ | Requires media mock |
| Move image | Low | ⬜ | |
| Resize image | Low | ⬜ | |
| Delete image | Low | ⬜ | |

---

## Editor — Tables

| Feature | Priority | Status | Notes |
|---|---|---|---|
| Insert table | Medium | 🔲 | Table tool — needs testIDs |
| Type in cell | Medium | 🔲 | Tap cell → text input |
| Delete table | Medium | 🔲 | |

---

## Editor — Zoom / Pan

| Feature | Priority | Status | Notes |
|---|---|---|---|
| Zoom in / out buttons | Low | 🔲 | `zoom-in`/`zoom-out` testIDs exist |
| Pinch to zoom | Low | ⬜ | Multi-touch, hard to automate |

---

## Editor — Undo/Redo

| Feature | Priority | Status | Notes |
|---|---|---|---|
| Undo drawing stroke | High | 🔲 | Tap undo → stroke gone |
| Redo | Medium | 🔲 | |
| Undo text placement | High | 🔲 | |

---

## Editor — Share / Export

| Feature | Priority | Status | Notes |
|---|---|---|---|
| Share as PDF | Low | ⬜ | System share sheet, hard to automate |
| Share as image | Low | ⬜ | |
| Share as worksheet | Low | ⬜ | |

---

## Settings

| Feature | Priority | Status | Notes |
|---|---|---|---|
| Change language | Low | ⬜ | Restarts layout, complex |
| Toggle tools visibility | Low | 🔲 | Verify tool appears/disappears |

---

## Summary

| Status | Count |
|---|---|
| ✅ Covered | 15 |
| 🔲 Planned | 21 |
| ⬜ Out of scope | 16 |

**Suggested next tests (by bang-for-buck):**
1. **Undo stroke** — high-value regression, simple to implement
2. **Delete current page** — completes page lifecycle
3. **Brush size / marker tool** — extends existing drawing coverage
4. **Text bold/italic/underline** — extends existing text coverage
5. **Navigate to previous page** — completes page nav coverage
