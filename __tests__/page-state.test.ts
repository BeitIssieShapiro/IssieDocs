import { replayPageQueue } from '../src/canvas/page-state';

const text = (id: string, t: string, extra: any = {}) => ({ type: 'text', elem: { id, text: t, x: 0, y: 0, fontSize: 20, ...extra } });
const line = (id: string) => ({ type: 'line', elem: { id, from: [0, 0], to: [10, 10], color: '#000000', strokeWidth: 2 } });

describe('replayPageQueue', () => {
    it('keeps the latest version of a text and drops emptied texts', () => {
        const s = replayPageQueue([text('a', 'one'), text('b', 'two'), text('a', 'uno'), text('b', '')], '/base/');
        expect(s.texts.map(t => [t.id, t.text])).toEqual([['a', 'uno']]);
    });

    it('applies line deletes and table deletes (with their cell texts)', () => {
        const s = replayPageQueue([
            line('l1'), line('l2'), { type: 'lineDelete', elem: { id: 'l1' } },
            { type: 'table', elem: { id: 't1', strokeDash: '2,3' } },
            text('c', 'cell', { tableId: 't1' }),
            text('d', 'free'),
        ], '/base/');
        expect(s.rulers.map(l => l.id)).toEqual(['l2']);
        expect(s.tables[0].strokeDash).toEqual([2, 3]);

        const s2 = replayPageQueue([
            { type: 'table', elem: { id: 't1' } },
            text('c', 'cell', { tableId: 't1' }),
            { type: 'tableDelete', elem: { id: 't1' }, elemID: 't1' },
        ], '/base/');
        expect(s2.tables).toEqual([]);
        expect(s2.texts).toEqual([]);
    });

    it('resolves image files against the attachment base', () => {
        const s = replayPageQueue([{ type: 'image', elem: { id: 'i1', file: 'img.jpg', x: 0, y: 0, width: 5, height: 5 } }], '/base/0.jpg$$');
        expect(s.images[0].src).toEqual({ uri: '/base/0.jpg$$img.jpg' });
    });

    it('reports background, page extension and does not mutate input', () => {
        const q = [{ type: 'background', elem: { type: 2 } }, { type: 'changePageHeightAddition', elem: { height: 300 } }, text('a', 'x')];
        const before = JSON.stringify(q);
        const s = replayPageQueue(q, '/base/');
        expect(s.background).toBe(2);
        expect(s.pageHeightAddition).toBe(300);
        expect(JSON.stringify(q)).toBe(before);
    });
});
