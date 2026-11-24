# End-to-end tests (Detox)

`editor-features.test.ts` drives the editor's tools on a new worksheet: pen with undo/redo, brush color,
eraser, marker, ruler line, fill (and its undo), select tool (cut, move, copy, delete, undo), text,
text styling (bold and color on a selected word), audio recording, reload of the page, a new page, and a
table with text in a cell. The other files cover the home screen and the page navigator.

The canvas is drawn by Skia, so the tests read what a page holds from the hidden `editor-state` view
(dev builds only), e.g. `strokes:7 texts:1 styled:1 fills:1 images:2 audio:1 mode:fill page:1/1 ...`.

## Run

Start Metro first (`npm start`): the tests use debug builds.

| Device | Build once (and after native changes) | Run |
| --- | --- | --- |
| iPad simulator | `npm run test:e2e:build` | `npm run test:e2e:ipad` |
| iPhone simulator | same build | `npm run test:e2e:iphone` |
| Android emulator | `npm run test:e2e:android:build` | `npm run test:e2e:android` |
| Android device (USB) | same build | `npm run test:e2e:android:device` |

Add a file to run just it, e.g. `npm run test:e2e:android -- e2e/editor-features.test.ts`, and
`-t "fills"` for one test. Device names: `DETOX_IPAD`, `DETOX_IPHONE`, `DETOX_AVD` (default `IssieTest`),
`DETOX_ADB_NAME`.

Options:
- `E2E_SCREENSHOT_DIR=/some/dir` - copy the tests' screenshots there
- `E2E_KEEP=1` - keep the test worksheet and screen after the run, to look at a failure
- `--take-screenshots failing --artifacts-location /some/dir` - Detox's screenshots of failures

Real iPhones/iPads are not supported by Detox (simulators only).

## Notes

- Text Styling is turned on in Settings at the start (it is off by default).
- On Android, a few touches are sent with `adb` (a long press that selects a word, and the editor's menu),
  since Detox's own do not reach them; the microphone permission is granted with `adb` too.
- Not covered: adding an image (the system photo picker), camera, dictation and read-aloud, sharing.
