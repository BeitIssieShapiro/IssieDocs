# IssieDocs

IssieDocs is a React Native app for creating illustrated worksheets — pages with drawings, images, text, and audio that can be combined into multi-page documents.

## Development

- Metro runs on **port 8084** (`RCT_jsLocation: localhost:8084` in `.detoxrc.js`).
- Shared canvas code lives in `src/canvas/` and is shared with IssieAlbom.
- Developer prefers to commit on their own — do not create commits without being asked.
- Do not run Metro yourself; the developer starts it manually.

## E2E Tests (Detox)

**Tests:** `e2e/` — `home-screen.test.ts`, `add-page-to-worksheet.test.ts`, `page-navigator.test.ts`.

**Run** (Metro must be running on port 8084, app built for simulator):
```
npx detox test -c ios.sim.debug
```

**Key implementation notes:**

- **Firebase skip:** Firebase's persistent WebSocket prevents Detox from ever seeing the app as idle. Skipped in e2e mode via a check at the top of `index.js`:
  ```js
  const IS_DETOX_TEST = Platform.OS === 'ios' && !!(RNSettings.get('IS_DETOX_TEST') || RNSettings.get('e2e'));
  if (!IS_DETOX_TEST) { firebaseLocalInit(); }
  ```
  `RNSettings.get()` reads iOS NSUserDefaults populated from Detox launch args. This check **must stay at `index.js` body level** (after all imports) — calling `Settings.get()` during the import chain returns `undefined` because native module constants aren't populated at that point.

- **Cold Hermes cache:** On a fresh simulator install, Hermes must compile the full debug bundle — this can take 15–25 min. `testTimeout` is set to 3600000 ms (60 min). Subsequent runs with a warm cache complete in ~1–2 min.

- **On RN 0.88.1**, a `UIDimmingView` / `PopoverDismissRegion` popover may appear on first launch. If needed, dismiss by tapping `{ x: 825, y: 1185 }` on the element (top-left corner, away from the popover bubble).

- **No Android config:** IssieDocs currently has only an iOS Detox configuration (`ios.sim.debug`).
