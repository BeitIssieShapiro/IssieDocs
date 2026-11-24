// The editor's tools end to end, on iPad, iPhone and Android (see .detoxrc.js for configurations).
// Drawing happens on a Skia canvas the test cannot see, so each step checks the page's content
// through the editor-state view (dev builds only): a label like "strokes:2 texts:1 fills:1 ...".
import { by, device, element, expect, waitFor } from 'detox';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const SHEET = 'E2E Editor Features';
const SCREENSHOT_DIR = process.env.E2E_SCREENSHOT_DIR;

type EditorState = Record<string, string>;

async function shot(name: string) {
  const file = await device.takeScreenshot(name);
  if (SCREENSHOT_DIR) fs.copyFileSync(file, path.join(SCREENSHOT_DIR, `${device.getPlatform()}-${name}.png`));
}

async function readState(): Promise<EditorState> {
  const attrs: any = await element(by.id('editor-state')).getAttributes();
  const label: string = attrs.label ?? attrs.elements?.[0]?.label ?? '';
  return Object.fromEntries(label.split(' ').map(kv => kv.split(':') as [string, string]));
}

const count = (s: EditorState, key: string) => Number(s[key] ?? 0);

// waits until the editor state passes the check (tools like fill and cut finish asynchronously)
async function expectState(what: string, check: (s: EditorState) => boolean, timeout = 10000) {
  const until = Date.now() + timeout;
  let s = await readState();
  while (!check(s) && Date.now() < until) {
    await new Promise(r => setTimeout(r, 300));
    s = await readState();
  }
  if (!check(s)) throw new Error(`editor state: expected ${what}, got ${JSON.stringify(s)}`);
  return s;
}

async function canvasSize() {
  const s = await expectState('a laid out canvas', st => count(st, 'canvas') !== 0 && !st.canvas?.startsWith('-'));
  const [w, h] = s.canvas.split('x').map(Number);
  return { w, h };
}

// a tap at a point of the page given as fractions of its size
async function tapCanvas(fx: number, fy: number) {
  const { w, h } = await canvasSize();
  await element(by.id('editor-canvas')).tap({ x: Math.round(w * fx), y: Math.round(h * fy) });
}

// a straight stroke, from (fx, fy) as fractions of the page, `offset` of its size in `direction`
async function strokeOnCanvas(direction: 'up' | 'down' | 'left' | 'right', offset: number, fx: number, fy: number) {
  const canvas = element(by.id('editor-canvas'));
  if (device.getPlatform() === 'android') {
    await canvas.swipe(direction, 'slow', offset, fx, fy);
    return;
  }
  // iOS: Detox's swipe is faster than any hand - the editor saves such a stroke before it has its points
  const [dx, dy] = { up: [0, -offset], down: [0, offset], left: [-offset, 0], right: [offset, 0] }[direction];
  await canvas.longPressAndDrag(50, fx, fy, canvas, fx + dx, fy + dy, 'slow', 100);
}

// a diagonal drag (select tool), between two points as fractions of the page
async function dragOnCanvas(fx1: number, fy1: number, fx2: number, fy2: number) {
  const canvas = element(by.id('editor-canvas'));
  await canvas.longPressAndDrag(300, fx1, fy1, canvas, fx2, fy2, 'slow', 300);
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Menus slide in, drawn outside their parent view: on Android Detox's visibility check fails for
// them although they show (getGlobalVisibleRect is clipped by the parent). So wait for the element
// to exist, and for the slide to end.
async function waitVisible(id: string, timeout = 3000) {
  await waitFor(element(by.id(id))).toExist().withTimeout(timeout);
  await sleep(700);
}

async function exists(id: string) {
  try {
    await expect(element(by.id(id))).toExist();
    return true;
  } catch {
    return false;
  }
}

// a tool of the second toolbar row (opens the row when it is closed); `mode`: the edit mode it sets
async function extTool(id: string, mode?: string) {
  if (!(await exists(id))) {
    await element(by.id('toolbar-more-btn')).tap();
    await waitVisible(id);
  }
  await element(by.id(id)).tap();
  if (mode) await expectState(`${mode} mode`, s => s.mode === mode);
}

// the text tool - tapping it again while it is on opens its menu instead
async function textTool() {
  if ((await readState()).mode !== 'text') await element(by.id('toolbar-text-btn')).tap();
  await expectState('text mode', s => s.mode === 'text');
}

async function brushTool() {
  if ((await readState()).mode !== 'sketch') await element(by.id('toolbar-brush-btn')).tap();
  await expectState('brush mode', s => s.mode === 'sketch');
}

// A tap as a finger would do it (adb on Android): Detox's tap does not reach the editor's menu
// (it opens over the page), though the element is found where it shows
async function fingerTap(id: string) {
  if (device.getPlatform() !== 'android') {
    await element(by.id(id)).tap();
    return;
  }
  const { frame }: any = await element(by.id(id)).getAttributes(); // screen pixels
  execSync(`adb -s ${device.id} shell input tap ${Math.round(frame.x + frame.width / 2)} ${Math.round(frame.y + frame.height / 2)}`);
}

// selects the word in the text being edited: a double tap on iOS, a long press on Android.
// Detox's Android long press does not start a text selection, so it is sent with adb (as a finger would).
async function selectWord() {
  const input = element(by.id('text-input-active'));
  if (device.getPlatform() !== 'android') {
    await input.multiTap(2);
    return;
  }
  const { frame }: any = await input.getAttributes(); // screen pixels
  const x = Math.round(frame.x + frame.width / 2), y = Math.round(frame.y + frame.height / 2);
  const adb = `adb -s ${device.id} shell`;
  // right after the text is opened for editing a long press may only place the cursor: try again
  for (let attempt = 0; attempt < 3; attempt++) {
    execSync(`${adb} "input motionevent DOWN ${x} ${y}; sleep 1.2; input motionevent UP ${x} ${y}"`);
    if (await exists('format-color')) return;
    await sleep(500);
  }
}

async function dismissKeyboard() {
  if (device.getPlatform() === 'android') {
    await device.pressBack();
  } else {
    // tapping the brush tool ends text editing
    await element(by.id('toolbar-brush-btn')).tap();
  }
}

async function deleteSheet(name: string) {
  try {
    await waitFor(element(by.id(`worksheet-more-btn-${name}`))).toBeVisible().withTimeout(3000);
    await element(by.id(`worksheet-more-btn-${name}`)).tap();
    await waitFor(element(by.text('Delete'))).toBeVisible().withTimeout(3000);
    await element(by.text('Delete')).tap();
    await element(by.text('Delete')).tap();
  } catch { /* already gone */ }
}

async function createAndOpenBlankSheet(name: string) {
  await element(by.id('new-page-btn')).tap();
  await waitFor(element(by.text('Blank'))).toBeVisible().withTimeout(3000);
  await element(by.text('Blank')).tap();
  await element(by.id('worksheet-name-input')).clearText();
  await element(by.id('worksheet-name-input')).typeText(name);
  await element(by.id('save-photo-save-btn')).tap();
  await openSheet(name);
}

async function openSheet(name: string) {
  await waitFor(element(by.id(`worksheet-item-${name}`))).toBeVisible().withTimeout(5000);
  await element(by.id(`worksheet-item-${name}`)).tap();
  await waitFor(element(by.id('editor-state'))).toExist().withTimeout(10000);
  await canvasSize();
}

async function goHome() {
  await element(by.id('header-home-button')).tap();
  await waitFor(element(by.id('new-page-btn'))).toBeVisible().withTimeout(8000);
}

// Settings > Tools > Text Styling: turned on (it is off by default)
async function turnOnTextStyling() {
  await waitFor(element(by.id('settings-btn'))).toExist().withTimeout(10000);
  await element(by.id('settings-btn')).tap();
  try {
    await waitVisible('settings-scroll', 5000);
  } catch {
    await element(by.id('settings-btn')).tap(); // the home screen was still loading
    await waitVisible('settings-scroll', 5000);
  }
  await waitFor(element(by.id('setting-text-styling'))).toBeVisible()
    .whileElement(by.id('settings-scroll')).scroll(200, 'down', 0.5, 0.4);
  if (!(await exists('setting-text-styling-checked'))) {
    await element(by.id('setting-text-styling')).tap();
    await waitFor(element(by.id('setting-text-styling-checked'))).toExist().withTimeout(3000);
  }
  await element(by.id('settings-close-btn')).tap();
}

describe('editor features', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { camera: 'YES', microphone: 'YES', photos: 'YES' } });
    await deleteSheet(SHEET);
    await turnOnTextStyling();
    await createAndOpenBlankSheet(SHEET);
  });

  afterAll(async () => {
    if (process.env.E2E_KEEP) return; // keep the worksheet and screen, to look at after a failure
    try { await goHome(); } catch { }
    await deleteSheet(SHEET);
  });

  it('draws with the pen, and undoes and redoes it', async () => {
    await brushTool();
    await strokeOnCanvas('right', 0.5, 0.2, 0.15);
    await expectState('a stroke', s => count(s, 'strokes') === 1 && count(s, 'undo') === 1);

    await element(by.id('toolbar-undo-btn')).tap();
    await expectState('the stroke undone', s => count(s, 'strokes') === 0 && count(s, 'redo') === 1);

    await element(by.id('toolbar-redo-btn')).tap();
    await expectState('the stroke redone', s => count(s, 'strokes') === 1 && count(s, 'redo') === 0);
    await shot('pen');
  });

  it('picks a brush color', async () => {
    await element(by.id('toolbar-color-btn')).tap();
    await waitVisible('color-btn-#da3242');
    await element(by.id('color-btn-#da3242')).tap();
    const before = await readState();
    await strokeOnCanvas('right', 0.5, 0.2, 0.2);
    await expectState('one more stroke', s => count(s, 'strokes') === count(before, 'strokes') + 1);
  });

  it('erases', async () => {
    await element(by.id('toolbar-eraser-btn')).tap();
    await strokeOnCanvas('down', 0.15, 0.4, 0.1);
    await expectState('an eraser stroke', s => count(s, 'erasers') === 1);
    await element(by.id('toolbar-eraser-btn')).tap();
  });

  it('draws with the marker', async () => {
    await extTool('toolbar-marker-btn', 'marker');
    const before = await readState();
    await strokeOnCanvas('right', 0.4, 0.2, 0.27);
    await expectState('a marker stroke', s => count(s, 'strokes') === count(before, 'strokes') + 1);
  });

  it('draws a ruler line', async () => {
    await extTool('toolbar-ruler-btn', 'line');
    await strokeOnCanvas('right', 0.5, 0.2, 0.33);
    await expectState('a line', s => count(s, 'lines') === 1);
  });

  it('fills a closed shape, and undoes the fill', async () => {
    // a rectangle of four strokes that overlap at the corners
    await brushTool();
    const start = await readState();
    // (in the page's upper part: in dev builds a warnings banner may cover its bottom)
    await strokeOnCanvas('right', 0.44, 0.14, 0.42);
    await strokeOnCanvas('down', 0.22, 0.52, 0.37);
    await strokeOnCanvas('left', 0.44, 0.56, 0.54);
    await strokeOnCanvas('up', 0.22, 0.20, 0.59);
    const before = await expectState('the rectangle', s => count(s, 'strokes') === count(start, 'strokes') + 4);
    await shot('rectangle');

    await extTool('toolbar-fill-btn', 'fill');
    await tapCanvas(0.36, 0.48);
    await expectState('a fill', s => count(s, 'fills') === 1, 15000);
    await shot('fill');

    await element(by.id('toolbar-undo-btn')).tap();
    await expectState('the fill undone', s => count(s, 'fills') === 0);
    await element(by.id('toolbar-redo-btn')).tap();
    await expectState('the fill redone', s => count(s, 'fills') === 1);

    // outside any closed shape: a toast, nothing filled
    await tapCanvas(0.9, 0.48);
    await waitFor(element(by.id('editor-toast'))).toExist().withTimeout(8000);
    await expectState('still one fill', s => count(s, 'fills') === 1 && count(s, 'strokes') === count(before, 'strokes'));
  });

  it('cuts a piece out, copies and deletes it', async () => {
    await extTool('toolbar-cut-btn', 'cut');
    await waitVisible('cut-shape-rect');
    await element(by.id('cut-shape-rect')).tap();
    await dragOnCanvas(0.12, 0.37, 0.62, 0.6);
    await expectState('a selected piece', s => count(s, 'images') === 1, 15000);
    await shot('cut');

    // moving the selection makes it a piece of its own (a selection not acted on is not kept)
    await dragOnCanvas(0.36, 0.48, 0.72, 0.25);
    await expectState('the piece moved, in the history', s => count(s, 'images') === 1 && count(s, 'undo') === 1);

    await element(by.id('piece-copy')).tap();
    await expectState('a copy', s => count(s, 'images') === 2, 15000);

    await element(by.id('piece-delete')).tap();
    await expectState('the copy deleted', s => count(s, 'images') === 1);

    await element(by.id('toolbar-undo-btn')).tap();
    await expectState('the copy back', s => count(s, 'images') === 2);
  });

  it('types a text', async () => {
    await textTool();
    await tapCanvas(0.3, 0.62);
    await waitFor(element(by.id('text-input-active'))).toExist().withTimeout(5000);
    await element(by.id('text-input-active')).typeText('Hello');
    await dismissKeyboard();
    await expectState('a text', s => count(s, 'texts') === 1);
    await shot('text');
  });

  it('styles part of a text with the text styling bar', async () => {
    // edit the one-word text again (left of the floating speech buttons' reach), and select the word
    await textTool();
    await tapCanvas(0.33, 0.64);
    await waitFor(element(by.id('text-input-active'))).toExist().withTimeout(5000);
    await sleep(500);
    await selectWord();
    // a selection: the bar has the color button (with no selection it has alignment instead)
    await waitVisible('format-color', 5000);
    await shot('text-styling-bar');

    await element(by.id('format-bold')).tap();
    await element(by.id('format-color')).tap();
    await waitVisible('format-color-#da3242');
    await element(by.id('format-color-#da3242')).tap();
    await dismissKeyboard();
    await expectState('a styled text', s => count(s, 'styled') === 1 && count(s, 'texts') === 1);
    await shot('text-styled');
  });

  it('records audio', async () => {
    if (device.getPlatform() === 'android') {
      // the system's permission dialog is not part of the app: grant it ahead
      execSync(`adb -s ${device.id} shell pm grant org.issieshapiro.issiedocs android.permission.RECORD_AUDIO`);
    }
    const before = await readState();
    await extTool('toolbar-audio-btn', 'audio');
    await tapCanvas(0.6, 0.12);
    await waitVisible('audio-record-btn', 5000);
    await element(by.id('audio-record-btn')).tap(); // start
    await sleep(2000);
    await element(by.id('audio-record-btn')).tap(); // stop
    await expectState('a recording', s => count(s, 'audio') === count(before, 'audio') + 1, 10000);
    await shot('audio');
  });

  it('keeps everything after leaving and reopening the page', async () => {
    const before = await readState();
    await goHome();
    await openSheet(SHEET);
    const keys = ['strokes', 'erasers', 'texts', 'styled', 'lines', 'tables', 'images', 'fills', 'audio'];
    await expectState(`the same content as before (${keys.map(k => `${k}:${before[k]}`).join(' ')})`,
      s => keys.every(k => s[k] === before[k]));
    await shot('reopened');
  });

  it('adds a page', async () => {
    await element(by.id('editor-more-btn')).tap();
    await waitVisible('add-page-blank');
    // on Android the menu (in a scroll view) may take a few taps right after it opened
    for (let i = 0; i < 4 && !(await exists('save-photo-save-btn')); i++) {
      if (await exists('add-page-blank')) await fingerTap('add-page-blank');
      await sleep(1200);
    }
    await waitFor(element(by.id('save-photo-save-btn'))).toExist().withTimeout(5000);
    await element(by.id('save-photo-save-btn')).tap();
    await waitFor(element(by.id('editor-state'))).toExist().withTimeout(10000);
    await expectState('page 2 of 2', s => s.page === '2/2');
    // a new page starts empty
    await expectState('an empty page', s => count(s, 'strokes') === 0 && count(s, 'texts') === 0);
  });

  it('adds a table (on the new page: it covers most of it)', async () => {
    await extTool('toolbar-table-btn', 'table');
    await waitVisible('table-width-2');
    await element(by.id('table-width-2')).tap();
    await expectState('a table', s => count(s, 'tables') === 1);

    // a text in a table cell
    await textTool();
    await tapCanvas(0.3, 0.3);
    await waitFor(element(by.id('text-input-active'))).toExist().withTimeout(5000);
    await element(by.id('text-input-active')).typeText('Cell');
    await dismissKeyboard();
    await expectState('a text in the table', s => count(s, 'texts') === 1);
    await shot('table');
  });
});
