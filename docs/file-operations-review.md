# File operations review and tests

Reviewed on 2026-11-19 following reports of disappearing folders, accidental moves and failed backup restoration.

## Run the regression tests

Use Node.js 22.11 or newer. Install dependencies with `npm ci`, then run from the repository root.

```sh
npm test -- --runInBand --watchman=false \
  __tests__/filesystem-transfer.test.js \
  __tests__/dragdrop-gesture.test.js \
  __tests__/dragdrop-scroll.test.js \
  __tests__/promise-progress.test.js
```

Run an individual regression by its name.

```sh
npm test -- --runInBand --watchman=false \
  __tests__/filesystem-transfer.test.js \
  --testNamePattern='preserves all source files'
```

The filesystem tests run the application code against isolated directories in the operating system's temporary directory, with cleanup after each test. The RNFS adapter uses Node filesystem operations. The ZIP adapter models archive entries as JSON, allowing the application's export and restore flows to run in Jest. Native ZIP compression, iOS file-provider access, application termination and physical-device gestures require separate validation.

## Coverage

| Suite | Cases |
| --- | --- |
| `filesystem-transfer.test.js` | Move failures, moves into a folder and back home, parent renames, cached paths, collisions, metadata/order write failures, deletion failures, cold folder lookup, invalid paths, duplication, worksheet movement, attachments, page insertion/deletion, backup and nested folder-export round trips, templates, empty folders, archive name collisions, restore retries and unreadable backup sources |
| `dragdrop-gesture.test.js` | Swipes, released/cancelled touches, repeated taps, intentional long presses and unmount cleanup |
| `dragdrop-scroll.test.js` | Navigation reset, ordinary rerenders, content shrinking, viewport growth and scroll bounds |
| `promise-progress.test.js` | Completion ordering, archive failures and empty backups |

The original move and restore implementations were checked against the new regressions. A failed move reported success. Concurrent restoration failed while assigning metadata to an unregistered folder. Both cases pass with the fixes.

## Changes made

- Folder moves use one directory move within the app's document storage. A failed move preserves the source. Moves are serialized, destination collisions are rejected, and cached folder, page and thumbnail paths follow successful moves.
- Drag activation is cancelled when scrolling begins, a touch ends or is cancelled, and the component unmounts. A stationary long press still enables dragging.
- Restore waits for initial folder loading and processes archives sequentially. Write failures reach the import UI. Retrying a partial restore retains existing destination files and restores missing files.
- Folder creation handles folders already present on disk. Metadata/order write failures propagate. Reload callers share the active load, and `getItem` loads uncached worksheets.
- Backups preserve single-page template markers and restore nested folder exports. Internal worksheet archive names avoid collisions such as folder `A_B` with worksheet `C` and folder `A` with worksheet `B_C`. Export waits for folder contents and rejects unreadable folders. The backup UI displays export failures.
- Saves reject existing destinations before invoking native file operations. Import metadata and save paths reject parent-directory traversal. Worksheet copy and page sorting variables have local declarations. Archive progress errors propagate through the returned promise.

The earlier scrolling fix is committed as `a5f3a5d`.

## Remaining findings

1. **High — partial worksheet operations.** Single-page moves and renames transfer images, annotation JSON, template markers and attachments separately. Some sidecar failures are ignored, allowing success while annotations remain at the old path. Page insertion/deletion renumbers files incrementally, so a failure can misalign filenames and sidecars. Multi-page duplication can leave a partial destination after failure. These operations need recovery across all related files. [filesystem.js](../src/filesystem.js) [IssieSavePhoto.js](../src/IssieSavePhoto.js)

2. **High — overlapping imports share extraction storage.** `extractZipInfo` defaults to a fixed temporary directory and deletes its previous contents. Opening another archive while a restore or import confirmation is pending can erase the first operation's extracted files. Top-level imports need isolated workspaces or serialization. Backup output filenames also have one-second timestamp resolution, permitting simultaneous exports to reuse an output path. [filesystem.js](../src/filesystem.js)

3. **Medium — deletion UI does not await completion.** `FolderGallery.DeletePage` starts asynchronous deletions without awaiting them. Its synchronous `try/catch` cannot catch a rejected promise. A worksheet without a generated thumbnail uses its first page as the thumbnail, so the handler can attempt to delete the same page twice. [FolderGallery.js](../src/FolderGallery.js) [work-sheet.js](../src/work-sheet.js)

4. **Medium — failed reload can clear cached subfolders.** `FileSystemFolder._reload` clears the live subfolder list before all reads finish. A later failure can leave subfolders missing until another successful reload. Publishing the file and folder lists together would preserve the last complete view. [filesystem.js](../src/filesystem.js)

## Full suite and device checks

```sh
npm test -- --runInBand --watchman=false
```

The full run has two pre-existing failures. `src/test.js` is a demonstration component picked up by Jest's default filename matching and contains no tests. `__tests__/App.test.tsx` imports `../App`, while the application component is in `src/App.js`. On this checkout the import resolves to an object and rendering fails. The targeted command above runs the relevant regression suites directly.

The README documents simulator setup and the existing Detox scenarios. Build the test binary before running Detox. [README](../README.md#e2e-testing-detox)

Physical iPad validation remains pending. Check long home lists, swiping over folders, intentional dragging into a folder and back home, and sharing a real backup onto a fresh installation. Include large archives, subfolders, templates, annotations, audio attachments and insufficient-storage retries. The reporting user's exact backup failure remains unconfirmed because the error details and archive were unavailable.
