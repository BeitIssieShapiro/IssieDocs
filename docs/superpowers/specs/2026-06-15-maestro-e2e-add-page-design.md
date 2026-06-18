# Maestro E2E: Add Page to Worksheet

**Date:** 2026-06-15
**Status:** Approved

## Goal

Re-runnable E2E test on iOS simulator (English) that catches the "add page to existing worksheet fails sometimes" bug. Creates a worksheet, adds a page, asserts success, then deletes the worksheet.

## Setup

Install Maestro CLI (one-time):
```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

No app rebuild required. Run against the sim already in use.

- **Bundle ID:** `com.issieshapiro.issiedoc.IssieDoc`
- **Test files:** `e2e/` at project root
- **Language:** English

## Code Changes

Two `testID` additions — no logic changes.

### `src/elements.js` — `MoreButton`

Add `testID` prop, pass to `TouchableOpacity`:

```js
export function MoreButton({ onPress, size, color, testID }) {
  return <TouchableOpacity testID={testID} ... onPress={onPress}>
    ...
  </TouchableOpacity>
}
```

### `src/FileNew.js` — worksheet card

Pass `testID` to the `MoreButton` on each worksheet card:

```js
<MoreButton
  testID={`worksheet-more-menu-${props.name}`}
  onPress={props.onContextMenu}
  size={30}
  color={...}
/>
```

Note: Maestro matches `testID` exactly. The flow will target `worksheet-more-menu-E2E Test Sheet`.

### `src/App.js` — editor header `MoreButton`

Pass `testID` to the editor header `MoreButton`:

```js
<MoreButton
  testID="editor-more-menu"
  size={30}
  color={"white"}
  onPress={() => { ... }}
/>
```

## Test Flow (`e2e/add-page-to-worksheet.yaml`)

```
1.  Launch app (clearState: false — preserve real user data)
2.  Tap new page button → tap "Blank"
3.  Type "E2E Test Sheet" in name field → tap "Save"
4.  Assert nav title "E2E Test Sheet" is visible (editor opened)
5.  Tap editor MoreButton (testID: editor-more-menu)
6.  Context menu opens → tap "Blank" under "Add Page"
7.  SavePhoto screen → tap "Add"
8.  Assert nav title contains "2/2"  ← key assertion, catches the bug
9.  Tap home icon → return to gallery
10. Tap MoreButton on "E2E Test Sheet" card
11. Tap "Delete" → confirm → assert "E2E Test Sheet" not visible
```

## Assertions

| Step | Assert | Why |
|------|--------|-----|
| After create | "E2E Test Sheet" visible in nav title | Worksheet created and opened |
| After add page | Nav title contains "2/2" | Page was actually added |
| After delete | "E2E Test Sheet" not in gallery | Cleanup succeeded, re-run safe |

## Re-runnability

- `clearState: false` — preserves existing user data
- Unique worksheet name "E2E Test Sheet" avoids collisions
- Worksheet deleted at end — safe to re-run immediately

## Running

```bash
maestro test e2e/add-page-to-worksheet.yaml
```

## Future

When suite grows, decompose into subflows:
- `e2e/flows/create-blank-worksheet.yaml`
- `e2e/flows/add-blank-page.yaml`
- `e2e/flows/delete-worksheet.yaml`
- Master flow composes them.
