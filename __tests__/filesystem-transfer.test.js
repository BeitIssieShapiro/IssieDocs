import fs from 'fs';
import os from 'os';
import path from 'path';
import * as RNFS from 'react-native-fs';
import { unzip, zip } from 'react-native-zip-archive';
import { FileSystem } from '../src/filesystem';

jest.mock('react-native-fs', () => ({
  __esModule: true,
  DocumentDirectoryPath: '/documents',
  TemporaryDirectoryPath: '/temporary/',
  mkdir: jest.fn().mockResolvedValue(),
  readDir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  exists: jest.fn(),
  unlink: jest.fn(),
  moveFile: jest.fn(),
  copyFile: jest.fn(),
  stat: jest.fn(),
  touch: jest.fn(),
}));
jest.mock('react-native-zip-archive', () => ({ unzip: jest.fn(), zip: jest.fn() }));
jest.mock('@beitissieshapiro/issie-shared', () => ({ stampPackage: jest.fn(() => Promise.resolve()) }));
jest.mock('@bam.tech/react-native-image-resizer', () => ({}));
jest.mock('react-native-uuid', () => ({}));
jest.mock('../src/lang', () => ({
  translate: key => key,
  fTranslate: (key, name) => key + ' ' + name,
}));
jest.mock('../src/log', () => ({ trace: jest.fn(), assert: jest.fn() }));
jest.mock('../src/common/firebase', () => ({
  analyticEvent: jest.fn().mockResolvedValue(),
  LocalAnalyticEvent: {},
}));

// Native I/O is backed by temporary directories so assertions cover the files
// that survive an operation, as well as the app's cached folder tree.
describe('folder moves and backup restoration', () => {
  let root;
  let filesystem;
  let originalMain;
  const diskPath = value => value.replace(/^file:\/\//, '');

  async function write(relativePath, contents = 'worksheet data') {
    const filename = path.join(root, relativePath);
    await fs.promises.mkdir(path.dirname(filename), { recursive: true });
    await fs.promises.writeFile(filename, contents);
    return filename;
  }

  async function load() {
    const folders = await filesystem.getRootFolders();
    await filesystem.getFoldersDeep(folders);
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'issie-transfer-'));
    RNFS.mkdir.mockImplementation(value => fs.promises.mkdir(diskPath(value), { recursive: true }));
    RNFS.mkdir.mockImplementationOnce(() => Promise.resolve());
    RNFS.exists.mockImplementation(value => fs.promises.access(diskPath(value)).then(() => true, () => false));
    RNFS.readFile.mockImplementation((value, encoding = 'utf8') => fs.promises.readFile(diskPath(value), encoding));
    RNFS.writeFile.mockImplementation((value, data) => fs.promises.writeFile(diskPath(value), data));
    RNFS.copyFile.mockImplementation((from, to) => fs.promises.copyFile(diskPath(from), diskPath(to)));
    RNFS.stat.mockImplementation(value => fs.promises.stat(diskPath(value)));
    RNFS.touch.mockImplementation((value, date) => fs.promises.utimes(diskPath(value), date, date));
    RNFS.unlink.mockImplementation(value => fs.promises.rm(diskPath(value), { recursive: true }));
    RNFS.readDir.mockImplementation(async value => {
      const folder = diskPath(value);
      const entries = await fs.promises.readdir(folder, { withFileTypes: true });
      return entries.map(entry => ({
        name: entry.name,
        path: path.join(folder, entry.name),
        isDirectory: () => entry.isDirectory(),
      }));
    });
    RNFS.moveFile.mockImplementation(async (from, to) => {
      if (fs.existsSync(diskPath(to))) throw new Error('Destination already exists');
      await fs.promises.rename(diskPath(from), diskPath(to));
    });
    // Represent each native ZIP fixture as an entry map. All application-level
    // extraction, folder creation, restoration and reload logic runs unchanged.
    unzip.mockImplementation(async (archive, destination) => {
      const entries = JSON.parse(await fs.promises.readFile(archive, 'utf8'));
      await fs.promises.mkdir(destination, { recursive: true });
      for (const [name, contents] of Object.entries(entries)) {
        await fs.promises.writeFile(path.join(destination, name), contents);
      }
      return destination;
    });
    zip.mockImplementation(async (files, destination) => {
      const entries = {};
      for (const filename of files) {
        entries[path.basename(filename)] = await fs.promises.readFile(diskPath(filename), 'utf8');
      }
      await fs.promises.writeFile(diskPath(destination), JSON.stringify(entries));
      return destination;
    });
    originalMain = FileSystem.main;
    filesystem = new FileSystem();
    filesystem._basePath = root + '/folders/';
    FileSystem.main = filesystem;
    RNFS.TemporaryDirectoryPath = root + '/tmp/';
    await fs.promises.mkdir(RNFS.TemporaryDirectoryPath);
    await write('folders/filesystem.version.6.23', '');
  });

  afterEach(async () => {
    FileSystem.main = originalMain;
    jest.restoreAllMocks();
    await fs.promises.rm(root, { recursive: true, force: true });
  });

  it('preserves all source files and the visible folder when a move fails', async () => {
    await write('folders/School/one.jpg');
    await write('folders/School/two.jpg');
    await load();
    const folder = filesystem.findFolderByID('School');
    RNFS.moveFile.mockRejectedValueOnce(new Error('Move failed'));
    await expect(filesystem.renameFolder('School', 'Renamed', '', 'blue')).rejects.toThrow('Move failed');
    expect(fs.existsSync(root + '/folders/School/one.jpg')).toBe(true);
    expect(fs.existsSync(root + '/folders/School/two.jpg')).toBe(true);
    expect(fs.existsSync(root + '/folders/Renamed')).toBe(false);
    expect(filesystem.findFolderByID('School')).toBe(folder);
    expect(RNFS.unlink).not.toHaveBeenCalled();
  });

  it('moves into a folder and back home with page data and cached references intact', async () => {
    await write('folders/School/Worksheet/0.jpg');
    await write('folders/School/Worksheet/1.jpg');
    await write('folders/School/Worksheet/0.jpg.json', '{"text":"hello"}');
    await write('folders/School/Worksheet/0.jpg.attach.audio', 'recording');
    await write('folders/School/Worksheet.preview.thumbnail.jpg', 'thumbnail');
    await write('folders/Other/.metadata', '{}');
    await load();
    const folder = filesystem.findFolderByID('School');
    const sheet = folder.items[0];
    await filesystem.renameFolder('School', 'Other/School', '', 'blue');
    expect(filesystem.findFolderByID('Other/School')).toBe(folder);
    expect(sheet.getPage(1)).toBe(root + '/folders/Other/folders/School/Worksheet/1.jpg');
    await filesystem.renameFolder('Other/School', 'School', '', 'blue');
    expect(filesystem.findFolderByID('School')).toBe(folder);
    expect(folder.items[0]).toBe(sheet);
    expect(sheet.path).toBe(root + '/folders/School/Worksheet');
    expect(sheet.thumbnail).toBe(root + '/folders/School/Worksheet.preview.thumbnail.jpg');
    expect(await fs.promises.readFile(sheet.getPage(0) + '.attach.audio', 'utf8')).toBe('recording');
    expect(RNFS.moveFile).toHaveBeenCalledTimes(2);
    expect(RNFS.unlink).not.toHaveBeenCalled();
  });

  it('keeps child folder and worksheet references valid when renaming a parent', async () => {
    await write('folders/School/folders/Math/one.jpg');
    await load();
    const child = filesystem.findFolderByID('School/Math');
    const sheet = child.items[0];
    await filesystem.renameFolder('School', 'Classes', '', 'green');
    expect(filesystem.findFolderByID('Classes/Math')).toBe(child);
    expect(child.path).toBe('Classes/folders/Math');
    expect(sheet.getPage(0)).toBe(root + '/folders/Classes/folders/Math/one.jpg');
    expect(fs.existsSync(sheet.getPage(0))).toBe(true);
  });

  it('rejects a destination collision without changing either folder', async () => {
    await write('folders/School/one.jpg', 'original');
    await write('folders/Other/one.jpg', 'other');
    await load();
    await expect(filesystem.renameFolder('School', 'Other', '', 'blue')).rejects.toBe('FolderAlreadyExists');
    expect(await fs.promises.readFile(root + '/folders/School/one.jpg', 'utf8')).toBe('original');
    expect(await fs.promises.readFile(root + '/folders/Other/one.jpg', 'utf8')).toBe('other');
    expect(RNFS.moveFile).not.toHaveBeenCalled();
  });

  it('surfaces metadata write failures before moving data', async () => {
    await write('folders/School/one.jpg');
    await load();
    RNFS.writeFile.mockRejectedValueOnce(new Error('Disk full'));
    await expect(filesystem.renameFolder('School', 'Renamed', '', 'blue')).rejects.toThrow('Disk full');
    expect(fs.existsSync(root + '/folders/School/one.jpg')).toBe(true);
    expect(RNFS.moveFile).not.toHaveBeenCalled();
  });

  it('restores multiple worksheets sharing a new folder and reports progress after each completes', async () => {
    for (const name of ['one', 'two', 'three']) {
      await write('backup/' + name + '.zip', JSON.stringify({
        'folder.metadata': JSON.stringify({ name: 'School', color: 'blue', icon: '' }),
        [name + '.jpg']: name,
      }));
    }
    // Native mkdir can complete on disk before its JavaScript promise resolves.
    // Concurrent imports used to see the directory without a registered folder.
    RNFS.mkdir.mockImplementation(async value => {
      await fs.promises.mkdir(diskPath(value), { recursive: true });
      if (value === root + '/folders/School') {
        await new Promise(resolve => setTimeout(resolve, 25));
      }
    });
    const progress = jest.fn();
    const report = await filesystem.RestoreFromBackup({ unzipPath: root + '/backup', metadata: { backup: true }, name: 'Backup' }, progress);
    expect(report.kind).toBe('backup');
    expect(report.imported.map(s => s.folder + '/' + s.name).sort()).toEqual(['School/one', 'School/three', 'School/two']);
    expect(report.failed).toEqual([]);
    const folder = filesystem.findFolderByID('School');
    expect(folder.items.map(sheet => sheet.name).sort()).toEqual(['one', 'three', 'two']);
    expect(filesystem._folders.filter(item => item.name === 'School')).toHaveLength(1);
    expect(progress.mock.calls.map(([value]) => Math.round(value))).toEqual([0, 33, 67, 100]);
  });

  it('reports a restore write failure and allows retrying a partial restore', async () => {
    const archive = await write('backup/one.zip', JSON.stringify({
      'folder.metadata': JSON.stringify({ name: 'School', color: 'blue', icon: '' }),
      'one.jpg': 'original',
      'two.jpg': 'second',
    }));
    const move = RNFS.moveFile.getMockImplementation();
    RNFS.moveFile.mockImplementation(async (from, to) => {
      if (to.endsWith('/two.jpg')) throw new Error('Disk full');
      return move(from, to);
    });
    const zipInfo = { unzipPath: root + '/backup', metadata: { backup: true }, name: 'Backup' };
    const failed = await filesystem.RestoreFromBackup(zipInfo, jest.fn());
    expect(failed.failed).toEqual([{ name: 'one', error: 'Disk full' }]);
    expect(failed.imported).toEqual([]);
    expect(fs.existsSync(archive)).toBe(true);
    expect(fs.existsSync(root + '/folders/School/one.jpg')).toBe(true);
    RNFS.moveFile.mockImplementation(move);
    const retried = await filesystem.RestoreFromBackup(zipInfo, jest.fn());
    expect(retried.failed).toEqual([]);
    expect(retried.imported).toEqual([{ folder: 'School', name: 'one' }]);
    expect(await fs.promises.readFile(root + '/folders/School/one.jpg', 'utf8')).toBe('original');
    expect(await fs.promises.readFile(root + '/folders/School/two.jpg', 'utf8')).toBe('second');
  });
  it('loads a worksheet through getItem without requiring the gallery to render it first', async () => {
    await write('folders/School/one.jpg');
    await filesystem.getRootFolders();
    const sheet = await filesystem.findFolderByID('School').getItem('one');
    expect(sheet.getPage(0)).toBe(root + '/folders/School/one.jpg');
  });

  it('registers an existing on-disk folder before updating its metadata', async () => {
    await write('folders/School/one.jpg');
    const folder = await filesystem.addFolder('School', 'book', 'blue', false, false, false);
    expect(folder.color).toBe('blue');
    expect(filesystem.findFolderByID('School')).toBe(folder);
    expect(fs.existsSync(root + '/folders/School/one.jpg')).toBe(true);
  });

  it.each(['.', '..', 'School/Math', 'School\\Math'])('rejects invalid folder name %s', async name => {
    await expect(filesystem.addFolder(name, '', 'blue', true)).rejects.toBe('IllegalCharacterInFolderName');
  });

  it('saves imported PDF pages without reloading the folder per page', async () => {
    await write('folders/School/existing.jpg');
    await load();
    const folder = filesystem.findFolderByID('School');
    await folder.reload();
    const reload = jest.spyOn(folder, 'reload');
    for (let i = 0; i < 5; i++) {
      const page = await write(`tmp/pdf-page-${i}.jpg`, `page ${i}`);
      await filesystem.saveFile(page, root + `/folders/School/Imported/${i}.jpg`, false, true);
    }
    expect(reload).not.toHaveBeenCalled();

    await folder.reload();
    const sheet = await folder.getItem('Imported');
    expect(sheet.count).toBe(5);
    expect(await fs.promises.readFile(sheet.getPage(4), 'utf8')).toBe('page 4');
  });

  it('copies all multipage worksheet files while retaining the original', async () => {
    await write('folders/School/Original/0.jpg', 'page zero');
    await write('folders/School/Original/1.jpg', 'page one');
    await write('folders/School/Original/0.jpg.json', '{"text":"hello"}');
    await write('folders/School/Original/0.jpg.attach.audio', 'recording');
    await write('folders/School/Original/istemplate', '');
    await load();
    await filesystem.saveFile(root + '/folders/School/Original', root + '/folders/School/Copy', true);
    const original = await filesystem.findFolderByID('School').getItem('Original');
    const copy = await filesystem.findFolderByID('School').getItem('Copy');
    expect(original.count).toBe(2);
    expect(copy.count).toBe(2);
    expect(copy.isTemplate).toBe(true);
    expect(await fs.promises.readFile(copy.getPage(0) + '.attach.audio', 'utf8')).toBe('recording');
  });

  it('moves a worksheet together with its annotations, template flag and attachments', async () => {
    await write('folders/School/one.jpg');
    await write('folders/School/one.jpg.json', '{"text":"hello"}');
    await write('folders/School/one.jpg.istemplate', '');
    await write('folders/School/one.jpg.attach.audio', 'recording');
    await write('folders/Other/.metadata', '{}');
    await load();
    const sheet = await filesystem.findFolderByID('School').getItem('one');
    await filesystem.movePage(sheet, 'Other');
    const moved = await filesystem.findFolderByID('Other').getItem('one');
    expect(moved.isTemplate).toBe(true);
    expect(await fs.promises.readFile(moved.path + '.json', 'utf8')).toBe('{"text":"hello"}');
    expect(await fs.promises.readFile(moved.path + '.attach.audio', 'utf8')).toBe('recording');
    expect(filesystem.findFolderByID('School').items).toHaveLength(0);
  });

  it('inserts and deletes a page while keeping annotations and attachments with their page', async () => {
    await write('folders/School/Sheet/0.jpg', 'first');
    await write('folders/School/Sheet/1.jpg', 'second');
    await write('folders/School/Sheet/1.jpg.json', '{"text":"second"}');
    await write('folders/School/Sheet/1.jpg.attach.audio', 'second audio');
    const incoming = await write('incoming.jpg', 'inserted');
    await load();
    let sheet = await filesystem.findFolderByID('School').getItem('Sheet');
    sheet = await filesystem.addPageToSheet(sheet, incoming, 1, '{"text":"inserted"}');
    expect(sheet.count).toBe(3);
    expect(await fs.promises.readFile(sheet.getPage(2) + '.attach.audio', 'utf8')).toBe('second audio');
    sheet = await filesystem.deletePageInSheet(sheet, 1);
    expect(sheet.count).toBe(2);
    expect(await fs.promises.readFile(sheet.getPage(1), 'utf8')).toBe('second');
    expect(await fs.promises.readFile(sheet.getPage(1) + '.json', 'utf8')).toBe('{"text":"second"}');
    expect(await fs.promises.readFile(sheet.getPage(1) + '.attach.audio', 'utf8')).toBe('second audio');
  });

  it('deletes the selected worksheet and its sidecars while keeping similarly named files', async () => {
    await write('folders/School/one.jpg');
    await write('folders/School/one.jpg.json', '{}');
    await write('folders/School/one.jpg.istemplate', '');
    await write('folders/School/one.jpg.attach.audio', 'recording');
    await write('folders/School/one-more.jpg', 'keep');
    await load();
    await filesystem.deleteFile(root + '/folders/School/one.jpg');
    expect(await fs.promises.readdir(root + '/folders/School')).toEqual(['one-more.jpg']);
    expect(filesystem.findFolderByID('School').items.map(sheet => sheet.name)).toEqual(['one-more']);
  });

  it('round-trips a full backup with single and multipage templates, subfolders and empty folders', async () => {
    await write('folders/School/.metadata', '{"color":"blue","icon":"book"}');
    await write('folders/School/single.jpg', 'single');
    await write('folders/School/single.jpg.istemplate', '');
    await write('folders/School/single.jpg.attach.audio', 'recording');
    await write('folders/School/folders/Math/Multi/0.jpg', 'first');
    await write('folders/School/folders/Math/Multi/1.jpg', 'second');
    await write('folders/School/folders/Math/Multi/istemplate', '');
    await write('folders/Empty/.metadata', '{"color":"red","icon":""}');
    const ids = await filesystem.getFoldersDeep(await filesystem.getRootFolders());
    const archive = await filesystem.exportAllWorksheets(ids, jest.fn());
    filesystem._basePath = root + '/restored/';
    filesystem._folders = [];
    filesystem._loaded = false;
    await write('restored/filesystem.version.6.23', '');
    const info = await filesystem.extractZipInfo(archive, root + '/extracted');
    await filesystem.RestoreFromBackup(info, jest.fn());
    await load();
    expect(filesystem.findFolderByID('School').color).toBe('blue');
    expect(filesystem.findFolderByID('School').icon).toBe('book');
    expect((await filesystem.findFolderByID('School').getItem('single')).isTemplate).toBe(true);
    expect((await filesystem.findFolderByID('School/Math').getItem('Multi')).isTemplate).toBe(true);
    expect(filesystem.findFolderByID('Empty').color).toBe('red');
    expect(await fs.promises.readFile(root + '/restored/School/single.jpg.attach.audio', 'utf8')).toBe('recording');
    expect(fs.existsSync(root + '/folders/School/single.jpg')).toBe(true);
  });

  it('restores a folder export containing a nested folder archive', async () => {
    await write('folders/School/one.jpg');
    await write('folders/School/folders/Math/two.jpg');
    await filesystem.getRootFolders();
    const archive = await filesystem.exportFolder(filesystem.findFolderByID('School'));
    filesystem._basePath = root + '/restored/';
    filesystem._folders = [];
    filesystem._loaded = false;
    await write('restored/filesystem.version.6.23', '');
    const info = await filesystem.extractZipInfo(archive, root + '/extracted');
    const report = await filesystem.RestoreFromBackup(info, jest.fn());
    expect(report).toMatchObject({ kind: 'folder', name: 'School', failed: [], skipped: [] });
    expect(report.imported).toEqual(expect.arrayContaining([
      { folder: 'School', name: 'one' }, { folder: 'School/Math', name: 'two' }]));
    // restoring the same folder again keeps the existing worksheets and says so
    const again = await filesystem.RestoreFromBackup(await filesystem.extractZipInfo(archive, root + '/extracted2'), jest.fn());
    expect(again.imported).toEqual([]);
    expect(again.skipped).toHaveLength(2);
    await load();
    expect((await filesystem.findFolderByID('School').getItem('one')).count).toBe(1);
    expect((await filesystem.findFolderByID('School/Math').getItem('two')).count).toBe(1);
  });

  it('rejects an existing save destination even when native file operations would overwrite it', async () => {
    const incoming = await write('incoming.jpg', 'new');
    await write('folders/School/one.jpg', 'keep');
    await load();
    RNFS.moveFile.mockImplementation((from, to) => fs.promises.rename(from, to));
    await expect(filesystem.saveFile(incoming, root + '/folders/School/one.jpg', false)).rejects.toBe('PageAlreadyExists');
    await expect(filesystem.saveFile(incoming, root + '/folders/School/one.jpg', true)).rejects.toBe('PageAlreadyExists');
    expect(await fs.promises.readFile(root + '/folders/School/one.jpg', 'utf8')).toBe('keep');
    expect(fs.existsSync(incoming)).toBe(true);
  });

  it('backs up worksheets whose folder and file names produce the same old archive name', async () => {
    await write('folders/A_B/C.jpg', 'first');
    await write('folders/A/B_C.jpg', 'second');
    const ids = await filesystem.getFoldersDeep(await filesystem.getRootFolders());
    const archive = await filesystem.exportAllWorksheets(ids, jest.fn());
    filesystem._basePath = root + '/restored/';
    filesystem._folders = [];
    filesystem._loaded = false;
    await write('restored/filesystem.version.6.23', '');
    const info = await filesystem.extractZipInfo(archive, root + '/extracted');
    await filesystem.RestoreFromBackup(info, jest.fn());
    expect(await fs.promises.readFile(root + '/restored/A_B/C.jpg', 'utf8')).toBe('first');
    expect(await fs.promises.readFile(root + '/restored/A/B_C.jpg', 'utf8')).toBe('second');
  });

  it.each([
    { name: '../Outside' },
    { name: 'School', subFolder: '../Outside' },
    { name: '' },
    {},
  ])('rejects invalid import metadata %j before creating files', async metadata => {
    const reads = RNFS.readDir.mock.calls.length;
    await expect(filesystem.importWorhsheetWithInfo({ metadata, unzipPath: root }, true)).rejects.toThrow('InvalidZipFile');
    expect(RNFS.readDir).toHaveBeenCalledTimes(reads);
    expect(RNFS.moveFile).not.toHaveBeenCalled();
  });

  it('keeps the folder visible if saving its new display order fails after a move', async () => {
    await write('folders/School/one.jpg');
    await load();
    const writeFile = RNFS.writeFile.getMockImplementation();
    RNFS.writeFile.mockImplementation((filename, data) => {
      if (filename.endsWith('/order.json')) throw new Error('Order write failed');
      return writeFile(filename, data);
    });
    const listener = jest.fn();
    filesystem.registerListener(listener);
    await expect(filesystem.renameFolder('School', 'Renamed', '', 'blue')).rejects.toThrow('Order write failed');
    expect(fs.existsSync(root + '/folders/Renamed/one.jpg')).toBe(true);
    expect(filesystem.findFolderByID('Renamed')).toBeDefined();
    expect(listener).toHaveBeenCalled();
  });

  it('keeps the cached folder and its files when deletion fails', async () => {
    await write('folders/School/one.jpg');
    await load();
    const folder = filesystem.findFolderByID('School');
    RNFS.unlink.mockRejectedValueOnce(new Error('Delete failed'));
    await expect(filesystem.deleteFolder('School')).rejects.toThrow('Delete failed');
    expect(filesystem.findFolderByID('School')).toBe(folder);
    expect(fs.existsSync(root + '/folders/School/one.jpg')).toBe(true);
  });

  it('loads folder contents before creating a backup from folder IDs', async () => {
    await write('folders/School/one.jpg', 'one');
    const archive = await filesystem.exportAllWorksheets(['School'], jest.fn());
    const info = await filesystem.extractZipInfo(archive, root + '/extracted');
    const archives = (await RNFS.readDir(info.unzipPath)).filter(item => item.name.endsWith('.zip'));
    const worksheet = await filesystem.extractZipInfo(archives[0].path, root + '/worksheet');
    expect(await fs.promises.readFile(worksheet.unzipPath + '/one.jpg', 'utf8')).toBe('one');
  });

  it('reports an unreadable folder instead of exporting it as empty', async () => {
    await write('folders/School/one.jpg');
    await filesystem.getRootFolders();
    const readDir = RNFS.readDir.getMockImplementation();
    RNFS.readDir.mockImplementation(value => {
      if (value === root + '/folders/School') throw new Error('Read failed');
      return readDir(value);
    });
    await expect(filesystem.exportAllWorksheets(['School'], jest.fn())).rejects.toThrow('Unable to read folder for backup');
    expect(zip).not.toHaveBeenCalled();
  });

});
