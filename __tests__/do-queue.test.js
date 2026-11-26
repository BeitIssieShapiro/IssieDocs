/**
 * The worksheet editor's undo/redo queue (src/do-queue.js).
 */
import DoQueue from '../src/do-queue';

const flush = () => new Promise(r => setTimeout(r, 0));

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
