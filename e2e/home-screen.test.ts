import { by, device, element, expect, waitFor } from 'detox';

const E2E_SHEET = 'E2E Home Sheet';
const E2E_SHEET_RENAMED = 'E2E Home Sheet Renamed';
const E2E_FOLDER = 'E2E Home Folder';
const E2E_PARENT = 'E2E Parent Folder';
const E2E_CHILD = 'E2E Child Folder';
const E2E_MOVE_SHEET = 'E2E Move Sheet';
const E2E_MOVE_FOLDER = 'E2E Move Folder';
const E2E_SEARCH_ROOT = 'E2E Search Root';
const E2E_SEARCH_FOLDER = 'E2E Search Folder';
const E2E_SEARCH_NESTED = 'E2E Search Nested';

async function createBlankSheet(name: string) {
  await element(by.id('new-page-btn')).tap();
  await waitFor(element(by.text('Blank'))).toBeVisible().withTimeout(3000);
  await element(by.text('Blank')).tap();
  await element(by.id('worksheet-name-input')).clearText();
  await element(by.id('worksheet-name-input')).typeText(name);
  await element(by.text('Save')).tap();
  await waitFor(element(by.id(`worksheet-item-${name}`))).toBeVisible().withTimeout(5000);
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

async function deleteFolder(name: string) {
  try {
    await waitFor(element(by.id(`folder-more-btn-${name}`))).toBeVisible().withTimeout(3000);
    await element(by.id(`folder-more-btn-${name}`)).tap();
    await waitFor(element(by.text('Delete'))).toBeVisible().withTimeout(3000);
    await element(by.text('Delete')).tap();
    await element(by.text('Delete')).tap();
  } catch { /* already gone */ }
}

async function goHomeFromFolder() {
  await waitFor(element(by.id('folder-home-btn'))).toBeVisible().withTimeout(5000);
  await element(by.id('folder-home-btn')).tap();
  await waitFor(element(by.id('new-page-btn'))).toBeVisible().withTimeout(5000);
}

async function createFolder(name: string) {
  await element(by.id('new-folder-btn')).tap();
  await waitFor(element(by.id('folder-name-input'))).toBeVisible().withTimeout(3000);
  await element(by.id('folder-name-input')).clearText();
  await element(by.id('folder-name-input')).typeText(name);
  await element(by.id('folder-save-btn')).tap();
  await waitFor(element(by.id(`folder-item-${name}`))).toBeVisible().withTimeout(5000);
}

describe('home screen', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { camera: 'YES' } });
    // Sweep leftovers from any previous crashed run
    await deleteSheet(E2E_SHEET);
    await deleteSheet(E2E_SHEET_RENAMED);
    await deleteSheet(E2E_MOVE_SHEET);
    await deleteFolder(E2E_FOLDER);
    await deleteFolder(E2E_PARENT);
    await deleteFolder(E2E_CHILD);
    await deleteFolder(E2E_MOVE_FOLDER);
    await deleteFolder(E2E_SEARCH_FOLDER);
  });

  it('renames a worksheet', async () => {
    await createBlankSheet(E2E_SHEET);

    await element(by.id(`worksheet-more-btn-${E2E_SHEET}`)).tap();
    await waitFor(element(by.text('Rename'))).toBeVisible().withTimeout(3000);
    await element(by.text('Rename')).tap();

    await waitFor(element(by.id('worksheet-name-input'))).toBeVisible().withTimeout(5000);
    await element(by.id('worksheet-name-input')).clearText();
    await element(by.id('worksheet-name-input')).typeText(E2E_SHEET_RENAMED);
    await element(by.text('Save')).tap();

    await waitFor(element(by.id(`worksheet-item-${E2E_SHEET_RENAMED}`)))
      .toBeVisible().withTimeout(5000);
    await waitFor(element(by.id(`worksheet-item-${E2E_SHEET}`)))
      .not.toBeVisible().withTimeout(3000);

    await deleteSheet(E2E_SHEET_RENAMED);
  });

  it('creates a folder', async () => {
    await createFolder(E2E_FOLDER);

    await waitFor(element(by.id(`folder-item-${E2E_FOLDER}`)))
      .toBeVisible().withTimeout(3000);

    await deleteFolder(E2E_FOLDER);

    await waitFor(element(by.id(`folder-item-${E2E_FOLDER}`)))
      .not.toBeVisible().withTimeout(3000);
  });

  it('creates a nested folder inside a parent', async () => {
    await createFolder(E2E_PARENT);

    await element(by.id(`folder-item-${E2E_PARENT}`)).tap();
    await waitFor(element(by.id('folder-home-btn'))).toBeVisible().withTimeout(5000);

    await createFolder(E2E_CHILD);
    await waitFor(element(by.id(`folder-item-${E2E_CHILD}`)))
      .toBeVisible().withTimeout(3000);

    // Go back home, delete parent (cascades child)
    await goHomeFromFolder();
    await waitFor(element(by.id(`folder-item-${E2E_PARENT}`))).toBeVisible().withTimeout(5000);
    await deleteFolder(E2E_PARENT);

    await waitFor(element(by.id(`folder-item-${E2E_PARENT}`)))
      .not.toBeVisible().withTimeout(3000);
  });

  it('moves a worksheet into a folder', async () => {
    await createBlankSheet(E2E_MOVE_SHEET);
    await createFolder(E2E_MOVE_FOLDER);

    await element(by.id(`worksheet-more-btn-${E2E_MOVE_SHEET}`)).tap();
    await waitFor(element(by.text('Move'))).toBeVisible().withTimeout(3000);
    await element(by.text('Move')).tap();

    // Select target folder in the picker
    await waitFor(element(by.id(`move-target-${E2E_MOVE_FOLDER}`)))
      .toBeVisible().withTimeout(5000);
    await element(by.id(`move-target-${E2E_MOVE_FOLDER}`)).tap();
    await element(by.text('Save')).tap();

    // After save, app navigates back — ensure we're at root
    await waitFor(element(by.id('new-page-btn'))).toBeVisible().withTimeout(5000);
    try {
      await waitFor(element(by.id('folder-home-btn'))).toBeVisible().withTimeout(2000);
      await goHomeFromFolder();
    } catch { /* already at root */ }

    // Sheet is no longer at root
    await waitFor(element(by.id(`worksheet-item-${E2E_MOVE_SHEET}`)))
      .not.toBeVisible().withTimeout(5000);

    // Open folder — sheet is inside
    await element(by.id(`folder-item-${E2E_MOVE_FOLDER}`)).tap();
    await waitFor(element(by.id('folder-home-btn'))).toBeVisible().withTimeout(5000);
    await waitFor(element(by.id(`worksheet-item-${E2E_MOVE_SHEET}`)))
      .toBeVisible().withTimeout(5000);

    // Go home, delete folder (sheet inside gets deleted too)
    await goHomeFromFolder();
    await waitFor(element(by.id(`folder-item-${E2E_MOVE_FOLDER}`))).toBeVisible().withTimeout(5000);
    await deleteFolder(E2E_MOVE_FOLDER);
  });

  it('search finds sheets across folders', async () => {
    // Create two folders each with a matching sheet
    await createFolder(E2E_SEARCH_FOLDER);
    await element(by.id(`folder-item-${E2E_SEARCH_FOLDER}`)).tap();
    await waitFor(element(by.id('folder-home-btn'))).toBeVisible().withTimeout(5000);
    await createBlankSheet(E2E_SEARCH_ROOT);
    await createBlankSheet(E2E_SEARCH_NESTED);
    await goHomeFromFolder();
    await waitFor(element(by.id(`folder-item-${E2E_SEARCH_FOLDER}`))).toBeVisible().withTimeout(5000);

    // Search
    await element(by.id('search-input')).tap();
    await element(by.id('search-input')).typeText('E2E Search');

    // Wait for search results label to appear, then verify both sheets exist in results
    await waitFor(element(by.text('Search results:   ')))
      .toBeVisible().withTimeout(5000);
    await expect(element(by.id(`worksheet-item-${E2E_SEARCH_ROOT}`))).toExist();
    await expect(element(by.id(`worksheet-item-${E2E_SEARCH_NESTED}`))).toExist();

    // Clear search
    await element(by.id('search-input')).clearText();
    await waitFor(element(by.id(`folder-item-${E2E_SEARCH_FOLDER}`)))
      .toExist().withTimeout(3000);

    await deleteFolder(E2E_SEARCH_FOLDER);
  });

  it('search shows no-results message when nothing matches', async () => {
    await element(by.id('search-input')).tap();
    await element(by.id('search-input')).typeText('ZZZ_NO_MATCH_XYZ');

    // "Search results:   No worksheets or folders were found"
    await waitFor(element(by.text('Search results:   No worksheets or folders were found')))
      .toBeVisible().withTimeout(3000);

    await element(by.id('search-input')).clearText();
  });

  it('creates a worksheet from camera', async () => {
    const E2E_CAMERA_SHEET = 'E2E Camera Sheet';

    // Cleanup in case previous run left it
    await deleteSheet(E2E_CAMERA_SHEET);

    // Tap camera button → camera screen opens
    await element(by.id('new-camera-btn')).tap();
    // Camera is a native layer — use waitFor + toExist, not toBeVisible
    await waitFor(element(by.id('camera-capture-btn')))
      .toExist().withTimeout(10000);

    // Capture (simulator returns mock image)
    await element(by.id('camera-capture-btn')).tap();

    // "Save Worksheet" preview screen appears — tap Save to proceed to name dialog
    await waitFor(element(by.id('save-photo-save-btn')))
      .toBeVisible().withTimeout(15000);
    await element(by.id('save-photo-save-btn')).tap();

    // SavePhoto name dialog — name the worksheet and save
    await waitFor(element(by.id('worksheet-name-input')))
      .toBeVisible().withTimeout(10000);
    await element(by.id('worksheet-name-input')).clearText();
    await element(by.id('worksheet-name-input')).typeText(E2E_CAMERA_SHEET);
    await element(by.text('Save')).tap();

    // Assert worksheet tile appears on home screen
    await waitFor(element(by.id(`worksheet-item-${E2E_CAMERA_SHEET}`)))
      .toBeVisible().withTimeout(8000);

    // Cleanup
    await deleteSheet(E2E_CAMERA_SHEET);
    await waitFor(element(by.id(`worksheet-item-${E2E_CAMERA_SHEET}`)))
      .not.toBeVisible().withTimeout(3000);
  });
});
