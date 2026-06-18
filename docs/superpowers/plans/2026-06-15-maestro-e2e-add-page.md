# Maestro E2E: Add Page to Worksheet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Maestro E2E testing and write a re-runnable flow that creates a worksheet, adds a blank page, asserts the page count shows "2/2", then deletes the worksheet.

**Architecture:** Three `testID` props added to existing components (zero logic change), one Maestro YAML flow in `e2e/`. The key assertion `"2/2"` in the nav title catches the add-page bug — if the page isn't added, the title stays without a page indicator.

**Tech Stack:** Maestro CLI, React Native `testID` props, YAML flow files.

---

## File Map

| File | Change |
|------|--------|
| `src/elements.js` | Add `testID` prop to `MoreButton` component |
| `src/FileNew.js` | Pass `testID` to both `MoreButton` instances on worksheet cards |
| `src/App.js` | Pass `testID="editor-more-menu"` to editor header `MoreButton` |
| `e2e/add-page-to-worksheet.yaml` | New — Maestro flow file |

---

## Task 1: Install Maestro CLI

**Files:**
- No code changes — CLI install only

- [ ] **Step 1: Install Maestro**

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

- [ ] **Step 2: Verify install**

```bash
maestro --version
```

Expected output: a version string like `1.38.x`. If command not found, open a new terminal (the installer adds to PATH in `~/.zshrc`).

- [ ] **Step 3: Verify simulator is running**

The sim must be booted before running Maestro flows. Check with:

```bash
xcrun simctl list devices | grep Booted
```

Expected: at least one device listed as `(Booted)`. If none, open Xcode → Simulator, or run `open -a Simulator`.

---

## Task 2: Add `testID` to `MoreButton`

**Files:**
- Modify: `src/elements.js:149-167`

`MoreButton` is used in the gallery worksheet cards and the editor header. Both need `testID` so Maestro can target them without relying on fragile position-based selectors.

- [ ] **Step 1: Add `testID` prop to `MoreButton`**

In `src/elements.js`, replace lines 149-167:

```js
export function MoreButton({
    onPress,
    size,
    color,
    testID
}) {

    return <TouchableOpacity
        testID={testID}
        style={{
            borderRadius: size / 2,
            width: size,
            height: size,
            borderWidth: 2,
            borderStyle: "solid",
            borderColor: color,
        }}
        onPress={onPress} >
        <MyIcon info={{ type: "MI", color, name: "more-horiz", size: size - 3 }} />
    </TouchableOpacity>
}
```

- [ ] **Step 2: Commit**

```bash
git add src/elements.js
git commit -m "feat(e2e): add testID prop to MoreButton"
```

---

## Task 3: Pass `testID` to worksheet card `MoreButton` instances

**Files:**
- Modify: `src/FileNew.js:53` (tile view)
- Modify: `src/FileNew.js:103` (list view)

There are two `MoreButton` usages in `FileNew.js` — one for tile layout (line 53) and one for list layout (line 103). Both need the same `testID` so the flow works regardless of current display mode.

- [ ] **Step 1: Update tile view MoreButton (line 53)**

Replace:
```js
<MoreButton onPress={props.onContextMenu} size={30} color={"white"} />
```

With:
```js
<MoreButton testID={`worksheet-more-menu-${props.name}`} onPress={props.onContextMenu} size={30} color={"white"} />
```

- [ ] **Step 2: Update list view MoreButton (line 103)**

Replace:
```js
<MoreButton onPress={props.onContextMenu} size={30} color={semanticColors.titleText} />
```

With:
```js
<MoreButton testID={`worksheet-more-menu-${props.name}`} onPress={props.onContextMenu} size={30} color={semanticColors.titleText} />
```

- [ ] **Step 3: Commit**

```bash
git add src/FileNew.js
git commit -m "feat(e2e): add testID to worksheet card MoreButton"
```

---

## Task 4: Pass `testID` to editor header `MoreButton`

**Files:**
- Modify: `src/App.js:185-189`

The editor header's `MoreButton` is rendered inline in `App.js`. It needs a stable `testID` so Maestro can open the context menu from inside the editor.

- [ ] **Step 1: Add testID to editor header MoreButton**

In `src/App.js`, replace lines 185-189:
```js
<MoreButton
  size={30} color={"white"}
  onPress={() => {
    props.route.params.onMoreMenu ? props.route.params.onMoreMenu() : {}
  }} />
```

With:
```js
<MoreButton
  testID="editor-more-menu"
  size={30} color={"white"}
  onPress={() => {
    props.route.params.onMoreMenu ? props.route.params.onMoreMenu() : {}
  }} />
```

- [ ] **Step 2: Build and run app on simulator to verify no crashes**

```bash
npx react-native run-ios
```

Expected: app builds and launches without errors. The `testID` additions have no visual effect.

- [ ] **Step 3: Commit**

```bash
git add src/App.js
git commit -m "feat(e2e): add testID to editor header MoreButton"
```

---

## Task 5: Write the Maestro flow

**Files:**
- Create: `e2e/add-page-to-worksheet.yaml`

This is the test itself. It creates a blank worksheet named "E2E Test Sheet", adds a blank page via the editor context menu, asserts the nav title shows "2/2" (the bug would cause this to fail or be absent), returns to gallery, and deletes the worksheet.

- [ ] **Step 1: Create `e2e/` directory and flow file**

```bash
mkdir -p e2e
```

Create `e2e/add-page-to-worksheet.yaml` with this content:

```yaml
appId: com.issieshapiro.issiedoc.IssieDoc
---
# ── Step 1: Launch app (preserve real user data) ──────────────────────────────
- launchApp:
    clearState: false

# ── Step 2: Create a blank worksheet ─────────────────────────────────────────
# Tap the new-page icon button in the gallery toolbar (SVG icon, no text).
# It opens a small popup menu. We tap "Blank".
- tapOn:
    id: "new-page-menu-button"
- tapOn: "Blank"

# ── Step 3: Name the worksheet and save ───────────────────────────────────────
# The SavePhoto screen shows a "Name" label above the TextInput.
# Maestro can tap the input below that label.
- tapOn: "Name"
- clearText
- inputText: "E2E Test Sheet"
- tapOn: "Save"

# ── Step 4: Assert we landed in the editor ────────────────────────────────────
- assertVisible: "E2E Test Sheet"

# ── Step 5: Open editor context menu ─────────────────────────────────────────
- tapOn:
    id: "editor-more-menu"

# ── Step 6: Tap "Blank" in the Add Page section ───────────────────────────────
# The context menu shows "Add Page:" as a section title, then "Blank" below it.
- assertVisible: "Add Page"
- tapOn: "Blank"

# ── Step 7: Confirm on SavePhoto screen ───────────────────────────────────────
- tapOn: "Add"

# ── Step 8: Assert page 2 of 2 ────────────────────────────────────────────────
# Nav title becomes "E2E Test Sheet - 2/2" after successful page add.
# This is the key assertion — the bug causes this to be missing or wrong.
- assertVisible: "2/2"

# ── Step 9: Go home ───────────────────────────────────────────────────────────
- tapOn:
    id: "header-home-button"

# ── Step 10: Open context menu for the worksheet ──────────────────────────────
- tapOn:
    id: "worksheet-more-menu-E2E Test Sheet"

# ── Step 11: Delete the worksheet ─────────────────────────────────────────────
- tapOn: "Delete"
- tapOn: "Delete"

# ── Step 12: Assert worksheet is gone (re-run safe) ───────────────────────────
- assertNotVisible: "E2E Test Sheet"
```

- [ ] **Step 2: Commit**

```bash
git add e2e/add-page-to-worksheet.yaml
git commit -m "test(e2e): add Maestro flow for add-page-to-worksheet"
```

---

## Task 6: Add `testID` to the new-page and home buttons

**Files:**
- Modify: `src/FolderGallery.js:1168-1174` (new page button)
- Modify: `src/App.js:176-183` (home button in editor header)

The YAML flow references `new-page-menu-button` and `header-home-button` — these don't exist yet.

- [ ] **Step 1: Add testID to the new-page button in FolderGallery**

In `src/FolderGallery.js`, the `newPageButton` function wraps `getSvgIconButton` in a `View`. The SVG icon button itself needs a `testID`. Replace the `getSvgIconButton` call at line ~1169:

```js
newPageButton = rtl => {
  return (
    <View key="6" ref={ref => this._newPageBtnRef = ref} collapsable={false}>
      <TouchableOpacity
        testID="new-page-menu-button"
        onPress={() => this.openNewPageMenu()}
      >
        {getSvgIcon(semanticColors.addButton, 'menu-new-empty-page', 40)}
      </TouchableOpacity>
```

Wait — `getSvgIconButton` returns a `TouchableOpacity` internally and doesn't accept `testID`. Check its signature first:

```bash
grep -n "getSvgIconButton" src/elements.js | head -5
```

If `getSvgIconButton` doesn't accept `testID`, wrap it:

```js
newPageButton = rtl => {
  return (
    <View key="6" ref={ref => this._newPageBtnRef = ref} collapsable={false}>
      <View testID="new-page-menu-button" collapsable={false}>
        {getSvgIconButton(
          () => this.openNewPageMenu(),
          semanticColors.addButton,
          'menu-new-empty-page',
          40,
        )}
      </View>
```

Note: Maestro's `tapOn` with an `id` taps the center of the matched element. A wrapping `View` with `testID` and `collapsable={false}` is a valid and common pattern.

- [ ] **Step 2: Add testID to home button in editor header**

In `src/App.js`, the home `TouchableOpacity` is at lines ~176-183. Add `testID`:

```js
<TouchableOpacity
  testID="header-home-button"
  onPress={() => {
    props.route.params.goHome ? props.route.params.goHome() : {}
  }}
  activeOpacity={1}
  style={{ flexDirection: 'row', alignItems: 'center' }}>
  <SvgIcon name='home' color='white' size={30} />
</TouchableOpacity>
```

- [ ] **Step 3: Build and run on simulator**

```bash
npx react-native run-ios
```

Expected: app launches, no crashes.

- [ ] **Step 4: Commit**

```bash
git add src/FolderGallery.js src/App.js
git commit -m "feat(e2e): add testIDs to new-page and home buttons"
```

---

## Task 7: Run the flow and verify it fails on the bug

**Files:** None — run only.

Run this before fixing the bug to confirm the test catches it.

- [ ] **Step 1: Make sure the simulator is running with the app installed**

```bash
xcrun simctl list devices | grep Booted
```

- [ ] **Step 2: Run the Maestro flow**

```bash
maestro test e2e/add-page-to-worksheet.yaml
```

Expected result **before the bug fix**: flow fails at the `assertVisible: "2/2"` step (page not added, title never updates).

Expected result **after the bug fix**: flow passes all steps and the worksheet is deleted at the end.

- [ ] **Step 3: If the flow fails for unexpected reasons (wrong text, element not found)**

Run with video capture for debugging:

```bash
maestro record e2e/add-page-to-worksheet.yaml
```

This records the simulator screen during the run and saves a video. Use it to see exactly which step failed and what the screen looked like.

---

## Notes

**Re-running:** The flow is safe to re-run. The worksheet is deleted at the end. If a previous run crashed mid-flow leaving "E2E Test Sheet" in the gallery, the `launchApp: clearState: false` start will just proceed — the "Blank" tap in step 2 will create a second one, and the delete step targets by name so it will delete whichever one it finds. If you need a clean slate, manually delete any leftover "E2E Test Sheet" from the gallery first.

**The bug fix (separate task):** Once the test is running and failing at `assertVisible: "2/2"`, fix `filesystem.js:841`:

```js
// Before (bug): !!(-1) is true, so addAtIndex = -1 gets used as filename
let newFileName = basePath + (!!addAtIndex ? addAtIndex : sheet.count) + '.jpg';

// After (fix): -1 means "append at end", use sheet.count
let newFileName = basePath + (addAtIndex >= 0 ? addAtIndex : sheet.count) + '.jpg';
```

Then re-run the flow — it should pass.
