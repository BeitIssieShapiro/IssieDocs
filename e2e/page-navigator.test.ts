import { by, device, element, expect, waitFor } from 'detox';
import * as fs from 'fs';
import * as path from 'path';

const SHEET = 'E2E Navigator Sheet';
const SCREENSHOT_DIR = process.env.E2E_SCREENSHOT_DIR;

async function shot(name: string) {
  const file = await device.takeScreenshot(name);
  if (SCREENSHOT_DIR) fs.copyFileSync(file, path.join(SCREENSHOT_DIR, `${name}.png`));
}

async function stroke(start: number) {
  await element(by.id('toolbar-brush-btn')).tap();
  await element(by.id('editor-canvas')).swipe('down', 'slow', 0.3, start, 0.2);
}

async function addBlankPage(expectedTitle: string) {
  await element(by.id('editor-more-btn')).tap();
  await waitFor(element(by.text('Add Page:'))).toBeVisible().withTimeout(3000);
  await element(by.text('Blank')).tap();
  await waitFor(element(by.text('Save'))).toBeVisible().withTimeout(5000);
  await element(by.text('Save')).tap();
  await waitFor(element(by.text(expectedTitle))).toBeVisible().withTimeout(8000);
}

async function deleteSheet() {
  try {
    await waitFor(element(by.id(`worksheet-more-btn-${SHEET}`))).toBeVisible().withTimeout(3000);
    await element(by.id(`worksheet-more-btn-${SHEET}`)).tap();
    await element(by.text('Delete')).tap();
    await element(by.text('Delete')).tap();
  } catch { /* already gone */ }
}

describe('page navigator', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: false });
    await deleteSheet();
  });

  afterAll(async () => {
    try { await element(by.id('header-home-button')).tap(); } catch { }
    await deleteSheet();
  });

  it('jumps to a page from the thumbnail strip', async () => {
    await element(by.id('new-page-btn')).tap();
    await waitFor(element(by.text('Blank'))).toBeVisible().withTimeout(3000);
    await element(by.text('Blank')).tap();
    await element(by.id('worksheet-name-input')).clearText();
    await element(by.id('worksheet-name-input')).typeText(SHEET);
    await element(by.text('Save')).tap();
    await waitFor(element(by.id(`worksheet-item-${SHEET}`))).toBeVisible().withTimeout(5000);
    await element(by.id(`worksheet-item-${SHEET}`)).tap();
    await waitFor(element(by.id('editor-more-btn'))).toBeVisible().withTimeout(10000);

    // single page: no navigator button
    await expect(element(by.id('nav-page-navigator'))).not.toExist();

    await stroke(0.2);
    await addBlankPage(`${SHEET} - 2/2`);
    await stroke(0.5);
    await addBlankPage(`${SHEET} - 3/3`);
    await addBlankPage(`${SHEET} - 4/4`);

    // open from the bottom button
    await element(by.id('nav-page-navigator')).tap();
    await waitFor(element(by.id('page-navigator'))).toBeVisible().withTimeout(3000);
    await shot('navigator-open');
    // writing is drawn ~1.5s after the list settles
    await new Promise(r => setTimeout(r, 2500));
    await shot('navigator-settled');

    await element(by.id('page-thumb-0')).tap();
    await waitFor(element(by.text(`${SHEET} - 1/4`))).toBeVisible().withTimeout(5000);
    await expect(element(by.id('page-navigator'))).not.toExist();

    // open from the context menu, then close
    await element(by.id('editor-more-btn')).tap();
    await waitFor(element(by.text('Go to page'))).toBeVisible().withTimeout(3000);
    await element(by.text('Go to page')).tap();
    await waitFor(element(by.id('page-navigator'))).toBeVisible().withTimeout(3000);
    await element(by.id('page-thumb-2')).tap();
    await waitFor(element(by.text(`${SHEET} - 3/4`))).toBeVisible().withTimeout(5000);

    await element(by.id('nav-page-navigator')).tap();
    await element(by.id('page-navigator-close')).tap();
    await expect(element(by.id('page-navigator'))).not.toExist();
  });
});
