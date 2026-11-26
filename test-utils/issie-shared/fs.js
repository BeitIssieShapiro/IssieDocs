/**
 * In-memory file system with the react-native-fs API, for Jest. Works for both
 * `react-native-fs` (default import) and `@dr.pogodin/react-native-fs`
 * (`import * as RNFS`), which share the API used by the Issie apps.
 *
 *   jest.mock('react-native-fs', () => require('<path>/testing/jest/fs').createFsMock());
 *   const RNFS = require('react-native-fs');
 *   beforeEach(() => RNFS.__reset());
 *
 * - "file://" prefixes are ignored, so Android-style paths hit the same file.
 * - Content is kept as given; a 'base64' write of text written as utf8 is not
 *   decoded (tests rarely need it). Use `__files` to seed or inspect.
 * - Missing files reject with an ENOENT error, like the native module.
 */
function createFsMock(options = {}) {
    const roots = {
        DocumentDirectoryPath: '/docs',
        CachesDirectoryPath: '/caches',
        TemporaryDirectoryPath: '/tmp',
        MainBundlePath: '/bundle',
        LibraryDirectoryPath: '/library',
        ExternalDirectoryPath: '/external',
        DownloadDirectoryPath: '/downloads',
        ...(options.roots || {}),
    };
    const files = new Map(); // path -> { content, mtime }
    const dirs = new Set();

    const norm = (p) => {
        let s = String(p).replace(/^file:\/\//, '');
        try { s = decodeURI(s); } catch { /* keep as is */ }
        s = s.replace(/\/+/g, '/');
        return s.length > 1 ? s.replace(/\/$/, '') : s;
    };
    const parent = (p) => p.substring(0, p.lastIndexOf('/')) || '/';
    const enoent = (p) => Promise.reject(Object.assign(new Error(`ENOENT: no such file or directory, open '${p}'`), { code: 'ENOENT' }));
    const addDir = (d) => { d = norm(d); while (d && d !== '/' && !dirs.has(d)) { dirs.add(d); d = parent(d); } };
    const reset = () => { files.clear(); dirs.clear(); Object.values(roots).forEach(addDir); };
    reset();

    const putFile = (p, content) => {
        p = norm(p);
        addDir(parent(p));
        files.set(p, { content: String(content), mtime: new Date() });
    };
    const isDir = (p) => dirs.has(norm(p));
    const childrenOf = (d) => {
        d = norm(d);
        const out = new Set();
        for (const p of [...files.keys(), ...dirs]) {
            if (parent(p) === d && p !== d) out.add(p);
        }
        return [...out];
    };
    const statOf = (p) => {
        p = norm(p);
        const f = files.get(p);
        const dir = dirs.has(p);
        return {
            name: p.substring(p.lastIndexOf('/') + 1),
            path: p,
            size: f ? f.content.length : 0,
            mtime: f ? f.mtime : new Date(0),
            ctime: f ? f.mtime : new Date(0),
            isFile: () => !!f,
            isDirectory: () => dir,
        };
    };
    const removeTree = (p) => {
        p = norm(p);
        for (const k of [...files.keys()]) if (k === p || k.startsWith(p + '/')) files.delete(k);
        for (const k of [...dirs]) if (k === p || k.startsWith(p + '/')) dirs.delete(k);
    };
    const moveTree = (from, to, keep) => {
        from = norm(from); to = norm(to);
        for (const [k, v] of [...files]) {
            if (k === from || k.startsWith(from + '/')) {
                putFile(to + k.substring(from.length), v.content);
                if (!keep) files.delete(k);
            }
        }
        for (const k of [...dirs]) {
            if (k === from || k.startsWith(from + '/')) {
                addDir(to + k.substring(from.length));
                if (!keep) dirs.delete(k);
            }
        }
    };

    const fs = {
        ...roots,
        exists: jest.fn(async (p) => files.has(norm(p)) || isDir(p)),
        mkdir: jest.fn(async (p) => { addDir(p); }),
        writeFile: jest.fn(async (p, content) => { putFile(p, content); }),
        appendFile: jest.fn(async (p, content) => {
            const prev = files.get(norm(p));
            putFile(p, (prev ? prev.content : '') + content);
        }),
        readFile: jest.fn(async (p) => files.has(norm(p)) ? files.get(norm(p)).content : enoent(p)),
        unlink: jest.fn(async (p) => {
            if (!files.has(norm(p)) && !isDir(p)) return enoent(p);
            removeTree(p);
        }),
        moveFile: jest.fn(async (from, to) => {
            if (!files.has(norm(from)) && !isDir(from)) return enoent(from);
            moveTree(from, to, false);
        }),
        copyFile: jest.fn(async (from, to) => {
            if (!files.has(norm(from)) && !isDir(from)) return enoent(from);
            moveTree(from, to, true);
        }),
        readDir: jest.fn(async (d) => isDir(d) ? childrenOf(d).map(statOf) : enoent(d)),
        readdir: jest.fn(async (d) => isDir(d) ? childrenOf(d).map(p => p.substring(p.lastIndexOf('/') + 1)) : enoent(d)),
        stat: jest.fn(async (p) => (files.has(norm(p)) || isDir(p)) ? statOf(p) : enoent(p)),
        hash: jest.fn(async (p) => files.has(norm(p)) ? String(files.get(norm(p)).content.length) : enoent(p)),
        copyAssetsFileIOS: jest.fn(async (_uri, to) => { putFile(to, 'asset'); return to; }),
        downloadFile: jest.fn(() => ({ jobId: 1, promise: Promise.resolve({ statusCode: 200, bytesWritten: 0 }) })),
        scanFile: jest.fn(async () => []),

        /** test helpers */
        __files: files,
        __dirs: dirs,
        __reset: reset,
        __put: putFile,
        __read: (p) => files.get(norm(p))?.content,
    };
    return { __esModule: true, default: fs, ...fs };
}

module.exports = { createFsMock };
