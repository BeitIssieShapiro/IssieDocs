# Detox E2E: Add Page to Worksheet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Detox E2E testing and write a re-runnable test that creates a worksheet, adds a blank page, asserts "2/2" in the nav title, then deletes the worksheet.

**Architecture:** Detox 20.x builds its own XCTest runner linked into a dedicated debug build (`IssieDocs.e2e` scheme) — no `devicectl` dependency, sidesteps the macOS 26.5 beta bug. Jest 29 (already installed) runs the test file. All `testID` props are already in the codebase from the Maestro work.

**Tech Stack:** Detox 20.51.3, Jest 29, TypeScript, iOS Simulator (iPad A16, UDID `236048FF-F825-4B8D-8432-6781B32FCE98`).

---

## File Map

| File | Change |
|------|--------|
| `package.json` | Add `detox` to devDependencies, add `test:e2e` script |
| `ios/Podfile` | Add `pod 'Detox'` to IssieDocs target |
| `.detoxrc.js` | New — Detox config (sim, bundle ID, build/test configs) |
| `e2e/jest.config.js` | New — Jest config for E2E (separate from unit tests) |
| `e2e/add-page-to-worksheet.test.ts` | New — the E2E test |
| `ios/IssieDocs.xcodeproj/xcshareddata/xcschemes/IssieDocs.e2e.xcscheme` | New — Xcode scheme for Detox builds |

---

## Task 1: Install Detox and dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Detox**

```bash
npm install --save-dev detox@20.51.3
```

- [ ] **Step 2: Verify install**

```bash
npx detox --version
```

Expected output: `20.51.3`

---

## Task 2: Add Detox pod to iOS project

**Files:**
- Modify: `ios/Podfile`

Detox ships its iOS framework as a CocoaPod. It must be added to the `IssieDocs` target.

- [ ] **Step 1: Add Detox pod**

In `ios/Podfile`, inside the `target 'IssieDocs' do` block, add after the existing pods and before `use_react_native!`:

```ruby
target 'IssieDocs' do
  pod 'RNLocalize', :path => '../node_modules/react-native-localize'
  pod 'Detox', :path => '../node_modules/detox/ios'
  config = use_native_modules!
```

- [ ] **Step 2: Run pod install**

```bash
cd ios && pod install && cd ..
```

Expected: Detox pod installs without errors. If you see a `use_modular_headers` warning for Detox, add this inside `post_install` in the Podfile:

```ruby
installer.pods_project.targets.each do |target|
  if target.name == 'Detox'
    target.build_configurations.each do |config|
      config.build_settings['SWIFT_VERSION'] = '5.0'
    end
  end
end
```

---

## Task 3: Create Xcode scheme for Detox builds

**Files:**
- Create: `ios/IssieDocs.xcodeproj/xcshareddata/xcschemes/IssieDocs.e2e.xcscheme`

Detox needs a dedicated scheme so it can build the app with its test runner linked in. This is a copy of the Debug scheme with the build configuration explicitly set to `Debug`.

- [ ] **Step 1: Create the scheme file**

Create `ios/IssieDocs.xcodeproj/xcshareddata/xcschemes/IssieDocs.e2e.xcscheme` with this content:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1210"
   version = "1.3">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "NO"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "13B07F861A680F5B00A75B9A"
               BuildableName = "IssieDocs.app"
               BlueprintName = "IssieDocs"
               ReferencedContainer = "container:IssieDocs.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      shouldUseLaunchSchemeArgsEnv = "YES">
      <Testables>
      </Testables>
   </TestAction>
   <LaunchAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      launchStyle = "0"
      useCustomWorkingDirectory = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "13B07F861A680F5B00A75B9A"
            BuildableName = "IssieDocs.app"
            BlueprintName = "IssieDocs"
            ReferencedContainer = "container:IssieDocs.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction
      buildConfiguration = "Release"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useCustomWorkingDirectory = "NO"
      debugDocumentVersioning = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "13B07F861A680F5B00A75B9A"
            BuildableName = "IssieDocs.app"
            BlueprintName = "IssieDocs"
            ReferencedContainer = "container:IssieDocs.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "Debug">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "Release"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
```

Note: `BlueprintIdentifier = "13B07F861A680F5B00A75B9A"` is the IssieDocs target ID — taken from the existing `IssieDocs.xcscheme`.

---

## Task 4: Create Detox config

**Files:**
- Create: `.detoxrc.js`

- [ ] **Step 1: Create `.detoxrc.js`**

Create `.detoxrc.js` at project root:

```js
/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/IssieDocs.app',
      build: 'xcodebuild -workspace ios/IssieDocs.xcworkspace -scheme IssieDocs.e2e -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build | xcpretty',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        udid: '236048FF-F825-4B8D-8432-6781B32FCE98',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
  },
};
```

---

## Task 5: Create E2E Jest config

**Files:**
- Create: `e2e/jest.config.js`

This is a separate Jest config used only for E2E tests. It must not interfere with the existing unit test setup in `jest.config.js`.

- [ ] **Step 1: Create `e2e/jest.config.js`**

```js
/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.test.ts'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
};
```

---

## Task 6: Write the E2E test

**Files:**
- Create: `e2e/add-page-to-worksheet.test.ts`

This test creates a blank worksheet, adds a second blank page via the editor context menu, asserts the nav title shows "2/2" (catches the bug in `filesystem.js:841`), then deletes the worksheet for re-runnability.

All `testID` values used here are already in the codebase:
- `new-page-btn` — gallery new-page button (`src/FolderGallery.js`)
- `editor-more-btn` — editor header more button (`src/App.js`)
- `header-home-button` — editor header home button (`src/App.js`)
- `worksheet-more-btn-E2E Test Sheet` — worksheet card more button (`src/FileNew.js`)

- [ ] **Step 1: Create the test file**

```ts
import { by, device, element, expect, waitFor } from 'detox';

describe('add page to worksheet', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: false });
  });

  afterAll(async () => {
    // Cleanup: delete the worksheet if it exists (makes test re-runnable)
    try {
      await waitFor(element(by.id('worksheet-more-btn-E2E Test Sheet')))
        .toBeVisible()
        .withTimeout(3000);
      await element(by.id('worksheet-more-btn-E2E Test Sheet')).tap();
      await element(by.text('Delete')).tap();
      await element(by.text('Delete')).tap();
    } catch {
      // worksheet already deleted by test — nothing to do
    }
  });

  it('adds a blank page and shows 2/2 in nav title', async () => {
    // ── Create blank worksheet ─────────────────────────────────────────────
    await element(by.id('new-page-btn')).tap();
    await element(by.text('Blank')).tap();

    // Name it and save
    await element(by.text('Name')).tap();
    await element(by.text('Name')).clearText();
    await element(by.text('Name')).typeText('E2E Test Sheet');
    await element(by.text('Save')).tap();

    // ── Assert editor opened ───────────────────────────────────────────────
    await waitFor(element(by.id('editor-more-btn')))
      .toBeVisible()
      .withTimeout(5000);

    // ── Open context menu and add blank page ───────────────────────────────
    await element(by.id('editor-more-btn')).tap();

    await waitFor(element(by.text('Add Page')))
      .toBeVisible()
      .withTimeout(3000);
    await element(by.text('Blank')).atIndex(0).tap();

    // ── Orientation screen → tap Save (Portrait default is fine) ──────────
    await waitFor(element(by.text('Save')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.text('Save')).tap();

    // ── Key assertion: page 2 of 2 in nav title ───────────────────────────
    // Nav title becomes "E2E Test Sheet - 2/2" after successful add.
    // Bug in filesystem.js:841 causes this to be absent (page saved as "-1.jpg").
    await waitFor(element(by.text('2/2')))
      .toBeVisible()
      .withTimeout(8000);

    // ── Go home ───────────────────────────────────────────────────────────
    await element(by.id('header-home-button')).tap();

    // ── Delete worksheet ──────────────────────────────────────────────────
    await waitFor(element(by.id('worksheet-more-btn-E2E Test Sheet')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('worksheet-more-btn-E2E Test Sheet')).tap();
    await element(by.text('Delete')).tap();
    await element(by.text('Delete')).tap();

    // ── Assert gone (re-run safe) ─────────────────────────────────────────
    await waitFor(element(by.text('E2E Test Sheet')))
      .not.toBeVisible()
      .withTimeout(3000);
  });
});
```

---

## Task 7: Add npm scripts and tsconfig for e2e

**Files:**
- Modify: `package.json`
- Create: `e2e/tsconfig.json`

- [ ] **Step 1: Add e2e scripts to `package.json`**

In `package.json`, add to the `scripts` section:

```json
"test:e2e:build": "detox build --configuration ios.sim.debug",
"test:e2e": "detox test --configuration ios.sim.debug"
```

- [ ] **Step 2: Create `e2e/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "commonjs",
    "lib": ["ES2018"],
    "strict": true,
    "esModuleInterop": true,
    "types": ["detox", "jest", "node"]
  }
}
```

- [ ] **Step 3: Install xcpretty (used in build command)**

```bash
gem install xcpretty
```

Expected: `xcpretty` installs. If `gem` requires sudo: `sudo gem install xcpretty`.

---

## Task 8: Build and run

**Files:** None — build and run only.

- [ ] **Step 1: Build the Detox app (first time, ~5 min)**

```bash
npm run test:e2e:build
```

Expected: xcodebuild compiles, output ends with `** BUILD SUCCEEDED **`. If it fails with a signing error, open `ios/IssieDocs.xcworkspace` in Xcode, select the `IssieDocs.e2e` scheme, and verify it builds manually first.

- [ ] **Step 2: Run the test (before bug fix — should fail)**

```bash
npm run test:e2e
```

Expected: test fails at `waitFor(element(by.text('2/2')))` — the nav title never shows "2/2" because the page is saved as `-1.jpg` (the bug).

- [ ] **Step 3: Fix the bug in `src/filesystem.js:841`**

Replace:
```js
let newFileName = basePath + (!!addAtIndex ? addAtIndex : sheet.count) + '.jpg';
```

With:
```js
let newFileName = basePath + (addAtIndex >= 0 ? addAtIndex : sheet.count) + '.jpg';
```

- [ ] **Step 4: Run the test again (after bug fix — should pass)**

```bash
npm run test:e2e
```

Expected: all assertions pass, worksheet deleted, output ends with `1 passed`.

- [ ] **Step 5: Commit everything**

```bash
git add .detoxrc.js e2e/ ios/Podfile ios/IssieDocs.xcodeproj/xcshareddata/xcschemes/IssieDocs.e2e.xcscheme package.json src/filesystem.js
git commit -m "test(e2e): add Detox setup and add-page test; fix addPageToSheet bug"
```

---

## Notes

**Re-runnability:** The `afterAll` block deletes the worksheet even if the test fails mid-way. If the app crashes before `afterAll` runs, manually delete "E2E Test Sheet" from the gallery before re-running.

**`Blank` appears twice:** In step "add page", both the gallery new-page menu and the context menu "Add Page" section contain a "Blank" item. The test uses `.atIndex(0)` to target the first visible one (context menu). If the gallery is visible in the background, adjust the index.

**Simulator must be booted:** Run `xcrun simctl list devices | grep Booted` before running tests. If no device is booted, open Simulator.app or run `open -a Simulator`.
