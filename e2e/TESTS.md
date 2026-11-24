# What the automated tests cover

End-to-end tests written with [Detox](https://wix.github.io/Detox/). They run against debug builds, with Metro running.

The canvas is drawn by Skia, so its content can't be checked through the screen. In dev builds a hidden
`editor-state` view reports what the page holds (strokes, texts, fills, pieces, audio, mode, page). The
tests check those counts after each step.

## Devices and setup

| Device | Configuration | Build | Run |
| --- | --- | --- | --- |
| iPad simulator (default `iPad (A16)`) | `ios.sim.debug` | `npm run test:e2e:build` | `npm run test:e2e:ipad` |
| iPhone simulator (default `iPhone 17`) | `ios.iphone.debug` | same build | `npm run test:e2e:iphone` |
| Android emulator (default AVD `IssieTest`) | `android.emu.debug` | `npm run test:e2e:android:build` | `npm run test:e2e:android` |
| Android phone or tablet (USB) | `android.att.debug` | same build | `npm run test:e2e:android:device` |

- **iOS needs:** Xcode and `applesimutils` (`brew install wix/brew/applesimutils`). After an Xcode update, run
  `npx detox clean-framework-cache && npx detox build-framework-cache`.
- **Android needs:** JDK 17 and the Android SDK, plus an AVD for the emulator.
- **Choosing a device:** set `DETOX_IPAD`, `DETOX_IPHONE`, `DETOX_AVD` or `DETOX_ADB_NAME`.
- Real iPhones and iPads aren't supported, because Detox runs only on simulators.
- **Before the editor tests:** they turn on Text Styling in Settings and create a fresh blank worksheet. They
  delete it at the end, unless `E2E_KEEP=1` is set.

### Status

The editor tests pass on all three: Android emulator, iPad and iPhone simulators (13/13).

## Editor (`editor-features.test.ts`)

**Drawing**
- Pen stroke (saved with all its points), then undo and redo it
- Change the brush color, then draw
- Eraser stroke
- Marker stroke
- Ruler line

**Fill**
- Draw a closed rectangle and fill inside it
- Undo and redo the fill
- Tap outside any closed shape: a message appears and no fill is added

**Select tool (cut)**
- Choose the rectangle selection and cut out a piece of the drawing
- Move the piece, and the move is recorded for undo
- Copy the piece, then delete the copy
- Undo brings the copy back

**Text**
- Add a text box and type in it
- Text styling: select a word, then apply bold and a color to that word only

**Audio**
- Record a short clip (the microphone permission is granted by the test)

**Saving and pages**
- Leave the worksheet and reopen it: everything above is still there
- Add a blank page from the editor menu: it opens as page 2 of 2, and it's empty
- On the new page, add a table and type text in a cell

**Tools row**
- Each tool is opened from the toolbar, including the extra tools row (opened with the "more" button)

## Home screen (`home-screen.test.ts`)
- Rename a worksheet
- Create a folder, and a folder inside it
- Move a worksheet into a folder
- Search finds worksheets in all folders, and shows a message when nothing matches
- Create a worksheet from the camera (the simulator returns a sample image)

## Pages (`page-navigator.test.ts`, `add-page-to-worksheet.test.ts`)
- Add a blank page: the title shows 2/2
- Page navigator: it appears only with more than one page, opens from the bottom button and from the menu, and
  tapping a thumbnail jumps to that page

The home screen and page files were written for the iPad. They find the Save button by its text, which phones
don't show, so they may need small changes for the iPhone and Android.

## Not covered
- Adding an image from the photo picker
- Dictation and read-aloud
- Sharing and export
- Right-to-left (Hebrew/Arabic) layouts
- Zoom
