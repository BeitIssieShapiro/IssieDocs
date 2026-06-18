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
    await waitFor(element(by.text('Blank')))
      .toBeVisible()
      .withTimeout(3000);
    await element(by.text('Blank')).tap();

    // Name it and save
    await element(by.id('worksheet-name-input')).clearText();
    await element(by.id('worksheet-name-input')).typeText('E2E Test Sheet');
    await element(by.text('Save')).tap();

    // ── Tap worksheet tile to open editor ─────────────────────────────────
    await waitFor(element(by.id('worksheet-item-E2E Test Sheet')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('worksheet-item-E2E Test Sheet')).tap();

    // ── Assert editor opened ───────────────────────────────────────────────
    await waitFor(element(by.id('editor-more-btn')))
      .toBeVisible()
      .withTimeout(10000);

    // ── Page 1: sketch a stroke ────────────────────────────────────────────
    await element(by.id('toolbar-brush-btn')).tap();
    // Simulate a stroke across the canvas — swipe down avoids back-nav gesture conflict
    await element(by.id('editor-canvas')).swipe('down', 'slow', 0.15, 0.4, 0.3);
    await waitFor(element(by.id('editor-more-btn')))
      .toBeVisible()
      .withTimeout(5000);

    // ── Open context menu and add blank page ───────────────────────────────
    await element(by.id('editor-more-btn')).tap();

    await waitFor(element(by.text('Add Page:')))
      .toBeVisible()
      .withTimeout(3000);
    await element(by.text('Blank')).tap();

    // ── Orientation screen → tap Save (Portrait default is fine) ──────────
    await waitFor(element(by.text('Save')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.text('Save')).tap();

    // ── Key assertion: page 2 of 2 in nav title ───────────────────────────
    await waitFor(element(by.text('E2E Test Sheet - 2/2')))
      .toBeVisible()
      .withTimeout(8000);

    // ── Page 2: add text element ───────────────────────────────────────────
    await element(by.id('toolbar-text-btn')).tap();
    // Tap canvas center to place a text box
    await element(by.id('editor-canvas')).tapAtPoint({ x: 400, y: 400 });

    await waitFor(element(by.id('text-element-edit')))
      .toBeVisible()
      .withTimeout(5000);

    // Type into the focused text input (it auto-focuses)
    await waitFor(element(by.id('text-input-active')))
      .toBeVisible()
      .withTimeout(3000);
    await element(by.id('text-input-active')).typeText('Hello');

    // ── Move the text element ──────────────────────────────────────────────
    await waitFor(element(by.id('text-element-edit')))
      .toBeVisible()
      .withTimeout(3000);
    await element(by.id('text-element-edit')).swipe('right', 'slow', 0.3);

    // ── Change text size ───────────────────────────────────────────────────
    await waitFor(element(by.id('text-size-btn-40')))
      .toBeVisible()
      .withTimeout(3000);
    await element(by.id('text-size-btn-40')).tap();

    // ── Change text color ──────────────────────────────────────────────────
    await element(by.id('toolbar-color-btn')).tap();
    await waitFor(element(by.id('color-btn-#da3242')))
      .toBeVisible()
      .withTimeout(3000);
    await element(by.id('color-btn-#da3242')).tap();

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
