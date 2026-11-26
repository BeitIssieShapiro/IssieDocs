/**
 * The worksheet editor's undo/redo queue (src/do-queue.js): locks, undo-all,
 * grouped steps, cuts, discarding the last entry and moving table cell ranges.
 */
import DoQueue from '../src/do-queue';

const flush = () => new Promise(r => setTimeout(r, 0));
const ids = (q) => q.getAll().map(e => e.elem?.id ?? e.type);

test('undo/redo and grouped (withPrevious) steps', () => {
    const q = new DoQueue(jest.fn());
    q.pushText({ id: 't1' });
    q.pushMany([{ type: 'line', elem: { id: 'l1' } }, { type: 'line', elem: { id: 'l2' } }]);
    q.undo();
    expect(ids(q)).toEqual(['t1']);
    q.redo();
    expect(ids(q)).toEqual(['t1', 'l1', 'l2']);
});

test('a move that carries a cut selection is undone together with it', () => {
    const q = new DoQueue(jest.fn());
    q.pushCut({ id: 'cut1' });
    q.pushImagePosition({ id: 'piece1', x: 5 }, true);
    q.undo();
    expect(q.getAll()).toEqual([]);
});

test('the page background and lock markers stop undo; unlock re-enables it', () => {
    const q = new DoQueue(jest.fn());
    q.add({ type: 'background', elem: { type: 'blank' } });
    expect(q.canUndo()).toBe(false);
    q.pushPath({ id: 'p1' });
    q.lock();
    q.lock(); // only one lock is added
    expect(q.getAll().filter(e => e.type === 'lock')).toHaveLength(1);
    expect(q.hasLock()).toBe(true);
    expect(q.canUndo()).toBe(false);
    expect(q.undo()).toBe(false);

    q.pushPath({ id: 'p2' });
    q.pushPath({ id: 'p3' });
    expect(q.undoAll()).toBe(2); // stops at the lock
    expect(q.canRedo()).toBe(true);

    expect(q.unlock()).toBe(true);
    expect(q.hasLock()).toBe(false);
    expect(q.undoAll()).toBe(1); // p1, then the background stays
    expect(ids(q)).toEqual(['background']);
    expect(q.unlock()).toBe(false);
});

test('a provisional cut keeps the redo history; a confirmed one clears it', async () => {
    const removed = [];
    const q = new DoQueue(async (f) => { removed.push(f); });
    q.pushImage({ id: 'img', file: 'img.jpg' });
    q.undo();
    q.pushCut({ id: 'sel', piece: { file: 'piece.png' } }, true);
    expect(q.canRedo()).toBe(true);

    q.pushCut({ id: 'sel2' });
    await flush();
    expect(q.canRedo()).toBe(false);
    expect(removed).toEqual(['img.jpg']); // the undone image's file is deleted with the redo history
});

test('discardLast drops the last entry only if it matches, optionally deleting its file', () => {
    const remove = jest.fn();
    const q = new DoQueue(remove);
    q.pushCut({ id: 'c', piece: { file: 'piece.png' } }, true);
    expect(q.discardLast('other')).toBeUndefined();
    expect(q.discardLast('c', true).elem.id).toBe('c');
    expect(remove).toHaveBeenCalledWith('piece.png');
    expect(q.getAll()).toEqual([]);
    expect(q.canRedo()).toBe(false); // discarded, not undoable
});

test('popDraft removes only a trailing draft', () => {
    const q = new DoQueue(jest.fn());
    q.pushText({ id: 't' });
    expect(q.popDraft()).toBeUndefined();
    q.pushText({ id: 't', draft: true });
    expect(q.popDraft().elem.draft).toBe(true);
});

describe('pushTableRangeMove', () => {
    const cell = (id, col, row, text = 'x') => ({ type: 'tableCellText', elem: { id, text, tableCell: { tableID: 'T', col, row } } });

    test('moves the latest non-empty text of each source cell as one undo step', () => {
        const q = new DoQueue(jest.fn());
        q.add(cell('a', 0, 0, 'old'));
        q.add(cell('a', 0, 0, 'new'));
        q.add(cell('b', 1, 0));
        q.add(cell('e', 2, 0, '')); // empty cells are not moved
        q.pushTableRangeMove('T', [{ from: [0, 0], to: [0, 1] }, { from: [1, 0], to: [1, 1] }, { from: [2, 0], to: [2, 1] }]);

        const moved = q.getAll().slice(4);
        expect(moved.map(m => [m.elem.id, m.elem.text, m.elem.tableCell.col, m.elem.tableCell.row])).toEqual([
            ['a', 'new', 0, 1], ['b', 'x', 1, 1],
        ]);
        q.undo();
        expect(q.getAll()).toHaveLength(4);
    });

    test('a cell whose text already moved away is not moved again; other tables are ignored', () => {
        const q = new DoQueue(jest.fn());
        q.add(cell('a', 0, 0));
        q.add({ type: 'tableCellText', elem: { id: 'a', text: 'x', tableCell: { tableID: 'T', col: 3, row: 3 } } });
        q.add({ type: 'tableCellText', elem: { id: 'z', text: 'x', tableCell: { tableID: 'OTHER', col: 0, row: 0 } } });
        q.pushTableRangeMove('T', [{ from: [0, 0], to: [1, 1] }]);
        expect(q.getAll()).toHaveLength(3);
    });
});

test('pushTable strips render-only fields; background metadata is a v2 page', () => {
    const q = new DoQueue(jest.fn());
    q.pushTable({ id: 'tb', minHeights: [1], clone: {} });
    expect(q.getAll()[0].elem).toEqual({ id: 'tb' });
    expect(JSON.parse(DoQueue.getBackgroundMetadata('math'))).toEqual({ version: '2.0', elements: [{ type: 'background', elem: { type: 'math' } }] });
});

// Fixed in master: clearUndo now skips files still referenced in the done queue.
test('undoing an audio move and editing again keeps the recording file', async () => {
    const removed = [];
    const q = new DoQueue(async (f) => { removed.push(f); });
    q.pushAudio({ id: 'a1', file: 'rec.m4a', x: 0, y: 0 });
    q.pushAudioPosition({ id: 'a1', file: 'rec.m4a', x: 50, y: 50 });
    q.undo();
    q.pushPath({ id: 'p1' });
    await flush();
    expect(removed).toEqual([]);
});
