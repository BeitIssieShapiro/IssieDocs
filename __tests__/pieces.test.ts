import { buildDrawLayers, cutPolygon, planCut, splitStroke, splitStrokeByPieces, stackTexts, topPieceAt, visibleTextAt } from '../src/canvas/pieces';
import { replayPageQueue } from '../src/canvas/page-state';
import DoQueue from '../src/do-queue';

const M = 0, L = 1;
const stroke = (id: string, pts: [number, number][], extra: any = {}) => ({
    id, color: '#000000', strokeWidth: 2, isMarker: false,
    points: pts.map(([x, y], i) => [i ? L : M, x, y]), ...extra,
});
const square = cutPolygon({ x: 0, y: 0, width: 10, height: 10 });
let n = 0;
const newId = (p: string) => p + 'new' + (++n);

// replays a queue the way the editor builds it
function replay(entries: any[]) {
    return replayPageQueue(entries, '/base/');
}

describe('splitStroke', () => {
    it('splits a stroke at the edge, both parts ending at the crossing', () => {
        const { inside, outside } = splitStroke(stroke('s', [[5, 5], [15, 5]]).points as any, square);
        expect(inside).toEqual([[M, 5, 5], [L, 10, 5]]);
        expect(outside).toEqual([[M, 10, 5], [L, 15, 5]]);
    });

    it('splits a straight stroke passing through, with both ends outside', () => {
        const { inside, outside } = splitStroke(stroke('s', [[-5, 5], [15, 5]]).points as any, square);
        expect(inside).toEqual([[M, 0, 5], [L, 10, 5]]);
        expect(outside).toEqual([[M, -5, 5], [L, 0, 5], [M, 10, 5], [L, 15, 5]]);
    });

    it('keeps a stroke whole when it does not cross', () => {
        expect(splitStroke(stroke('s', [[1, 1], [2, 2]]).points as any, square)).toEqual({ inside: [[M, 1, 1], [L, 2, 2]], outside: undefined });
        expect(splitStroke(stroke('s', [[20, 1], [30, 2]]).points as any, square).inside).toBeUndefined();
    });
});

describe('splitStrokeByPieces', () => {
    const piece = (id: string, x: number, z: number, extra: any = {}) =>
        ({ id, x, y: 0, width: 10, height: 10, isCutPiece: true, z, ...extra }) as any;

    it('divides a stroke between the page and the pieces it crosses', () => {
        const parts = splitStrokeByPieces(stroke('s', [[-5, 5], [25, 5]]).points as any, [piece('A', 0, 1), piece('B', 20, 2)]);
        expect(parts).toEqual([
            { pieceId: 'B', points: [[M, 20, 5], [L, 25, 5]] },
            { pieceId: 'A', points: [[M, 0, 5], [L, 10, 5]] },
            { points: [[M, -5, 5], [L, 0, 5], [M, 10, 5], [L, 20, 5]] },
        ]);
    });

    it('gives an overlap to the top piece, and a hole to what is below it', () => {
        const top = piece('T', 5, 2, { holes: [[[2, 0], [4, 0], [4, 10], [2, 10]]] }); // hole at x 7..9
        const parts = splitStrokeByPieces(stroke('s', [[1, 5], [12, 5]]).points as any, [piece('U', 0, 1), top]);
        expect(parts.find(p => p.pieceId === 'T')!.points).toEqual([[M, 5, 5], [L, 7, 5], [M, 9, 5], [L, 12, 5]]);
        expect(parts.find(p => p.pieceId === 'U')!.points).toEqual([[M, 1, 5], [L, 5, 5], [M, 7, 5], [L, 9, 5]]);
        expect(parts.some(p => !p.pieceId)).toBe(false);
    });

    it('keeps a stroke whole without pieces, and a dot on its piece', () => {
        const pts = stroke('s', [[1, 1], [2, 2]]).points as any;
        expect(splitStrokeByPieces(pts, [])).toEqual([{ points: pts }]);
        expect(splitStrokeByPieces([[M, 3, 3]] as any, [piece('A', 0, 1)])).toEqual([{ pieceId: 'A', points: [[M, 3, 3]] }]);
    });
});

describe('planCut', () => {
    it('takes what is inside, splits what crosses, leaves the rest', () => {
        const plan = planCut(square,
            [stroke('in', [[1, 1], [2, 2]]), stroke('cross', [[5, 5], [15, 5]]), stroke('out', [[20, 20], [30, 30]])] as any,
            [{ id: 't-in', text: 'a', x: 2, y: 2, width: 2, height: 2, fontSize: 2, rtl: false } as any,
            { id: 't-out', text: 'b', x: 8, y: 8, width: 10, height: 2, fontSize: 2, rtl: false } as any],
            [{ id: 'img', x: 1, y: 1, width: 2, height: 2 } as any],
            newId);
        expect(plan.takePaths).toEqual(['in']);
        expect(plan.splitPaths.map(sp => sp.from)).toEqual(['cross']);
        expect(plan.takeTexts).toEqual(['t-in']); // t-out's center is outside
        // an imported image is a piece: fully inside, it is taken whole (into the new piece's paper)
        expect(plan.takeImages).toEqual([]);
        expect(plan.absorbPieces).toEqual(['img']);
    });

    it('cuts through pieces: their content inside is taken, they get a hole, or are taken whole', () => {
        const under = { id: 'U', isCutPiece: true, x: 5, y: 0, width: 10, height: 10, z: 1 } as any; // half inside
        const inner = { id: 'In', isCutPiece: true, x: 2, y: 2, width: 3, height: 3, z: 2 } as any; // fully inside
        const plan = planCut(square, [stroke('mine', [[6, 1], [7, 2]], { pieceId: 'U' })] as any, [], [under, inner], newId);
        expect(plan.takePaths).toEqual(['mine']);
        expect(plan.absorbPieces).toEqual(['In']);
        expect(plan.cutPieces).toEqual([{ id: 'U', hole: [[-5, 0], [5, 0], [5, 10], [-5, 10]] }]);
    });
});

describe('imported images are pieces', () => {
    const image = { type: 'image', elem: { id: 'I1', x: 10, y: 10, width: 20, height: 10, file: 'i.jpg', layered: true } };
    const onImage = { type: 'path', elem: stroke('ink', [[12, 12], [20, 15]], { pieceId: 'I1' }) };
    const onPage = { type: 'path', elem: stroke('page', [[50, 50], [60, 60]]) };

    it('carry their ink when moved, and come to the top', () => {
        const s = replay([image, onImage, onPage, { type: 'imagePosition', elem: { id: 'I1', x: 40, y: 10, width: 20, height: 10, layered: true } }]);
        expect(s.images[0]).toMatchObject({ x: 40, originX: 40, z: 3 });
        expect(s.paths.find(p => p.id === 'ink')!.points).toEqual([[M, 42, 12], [L, 50, 15]]);
        expect(s.paths.find(p => p.id === 'page')!.points[0]).toEqual([M, 50, 50]);
    });

    it('scale their content when resized', () => {
        const fill = { type: 'fill', elem: { id: 'F1', x: 10, y: 10, width: 4, height: 2, pieceId: 'I1', imageData: '' } };
        const text = { type: 'text', elem: { id: 't', text: 'a', x: 20, y: 12, fontSize: 4, pieceId: 'I1' } };
        const s = replay([image, onImage, fill, text, { type: 'imagePosition', elem: { id: 'I1', x: 10, y: 10, width: 40, height: 20 } }]);
        const ink = s.paths.find(p => p.id === 'ink')!;
        expect(ink.points).toEqual([[M, 14, 14], [L, 30, 20]]);
        expect(ink.strokeWidth).toBe(4);
        expect(s.overlays[0]).toMatchObject({ x: 10, y: 10, width: 8, height: 4 });
        expect(s.texts[0]).toMatchObject({ x: 30, y: 14, fontSize: 8 });
        expect(s.images[0]).toMatchObject({ width: 40, height: 20 });
    });

    it('from older worksheets stay under all ink until moved', () => {
        const legacy = { type: 'image', elem: { id: 'I0', x: 0, y: 0, width: 50, height: 50, file: 'o.jpg' } };
        const s = replay([onPage, legacy]);
        const layers = buildDrawLayers(s.paths, s.overlays, s.images);
        expect(layers.map(l => l.piece?.id ?? 'base')).toEqual(['I0', 'base']);
        const s2 = replay([onPage, legacy, { type: 'imagePosition', elem: { id: 'I0', x: 1, y: 0, width: 50, height: 50 } }]);
        expect(s2.images[0].z).toBe(s.images[0].z); // an old move does not bring it up
        const s3 = replay([onPage, legacy, { type: 'imagePosition', elem: { id: 'I0', x: 1, y: 0, width: 50, height: 50, layered: true } }]);
        expect(s3.images[0].z).toBe(2);
    });

    it('delete with their content, and are selected on top', () => {
        const s = replay([image, onImage, onPage, { type: 'imageDelete', elem: { id: 'I1' } }]);
        expect(s.images).toEqual([]);
        expect(s.paths.map(p => p.id)).toEqual(['page']);
        const s2 = replay([image, { type: 'image', elem: { id: 'I2', x: 15, y: 12, width: 5, height: 5, file: 'j.jpg', layered: true } }]);
        expect(topPieceAt(s2.images, 16, 13)!.id).toBe('I2');
        expect(topPieceAt(s2.images, 11, 11)!.id).toBe('I1');
    });
});

describe('pieces in the page queue', () => {
    const cutEntry = (extra: any = {}) => ({
        type: 'cut', elem: {
            id: 'C1', x: 0, y: 0, width: 10, height: 10,
            piece: { id: 'P1', x: 0, y: 0, width: 10, height: 10, file: 'p.png' },
            takePaths: ['in'], takeTexts: ['t'], takeImages: [], splitPaths: [{
                from: 'cross',
                outside: stroke('cross-o', [[10, 5], [15, 5]]),
                inside: stroke('cross-i', [[5, 5], [10, 5]]),
            }],
            ...extra,
        },
    });
    const base = [
        { type: 'path', elem: stroke('in', [[1, 1], [2, 2]]) },
        { type: 'path', elem: stroke('cross', [[5, 5], [15, 5]]) },
        { type: 'text', elem: { id: 't', text: 'hi', x: 2, y: 2, fontSize: 2 } },
    ];

    it('a cut makes a hole, a piece, and gives it what was inside', () => {
        const s = replay([...base, cutEntry()]);
        const piece = s.images.find(i => i.isCutPiece)!;
        expect(piece).toMatchObject({ id: 'P1', z: 3, src: { uri: '/base/p.png' } });
        expect(s.overlays).toEqual([expect.objectContaining({ id: 'C1', kind: 'cut' })]);
        expect(s.paths.map(p => [p.id, p.pieceId])).toEqual([['in', 'P1'], ['cross-o', undefined], ['cross-i', 'P1']]);
        // the parts keep the stroke's drawing order
        expect(s.paths.find(p => p.id === 'cross-o')!.z).toBe(1);
        expect(s.texts[0].pieceId).toBe('P1');
    });

    it('moving a piece moves its content and brings it to the top', () => {
        const s = replay([...base, cutEntry(),
            { type: 'path', elem: stroke('later', [[30, 30], [40, 40]]) },
            { type: 'imagePosition', elem: { id: 'P1', x: 100, y: 50, width: 10, height: 10 } }]);
        const piece = s.images.find(i => i.id === 'P1')!;
        expect(piece).toMatchObject({ x: 100, y: 50, originX: 100, originY: 50, z: 5 });
        expect(s.paths.find(p => p.id === 'in')!.points[0]).toEqual([M, 101, 51]);
        expect(s.paths.find(p => p.id === 'cross-o')!.points[0]).toEqual([M, 10, 5]); // base part stays
        expect(s.texts[0]).toMatchObject({ x: 102, y: 52 });
        // an edit of a piece's text keeps it in the piece
        const s2 = replay([...base, cutEntry(), { type: 'text', elem: { id: 't', text: 'hello', x: 2, y: 2, fontSize: 2 } }]);
        expect(s2.texts[0]).toMatchObject({ text: 'hello', pieceId: 'P1', z: 2 });
    });

    it('a copy duplicates the piece with its content; delete removes a piece with its content', () => {
        const s = replay([...base, cutEntry(), { type: 'pieceCopy', elem: { id: 'P2', from: 'P1', x: 20, y: 0 } }]);
        const copy = s.images.find(i => i.id === 'P2')!;
        expect(copy).toMatchObject({ isCutPiece: true, x: 20, z: 4, src: { uri: '/base/p.png' } });
        expect(s.paths.filter(p => p.pieceId === 'P2').map(p => p.points[0])).toEqual([[M, 21, 1], [M, 25, 5]]);
        expect(s.texts.filter(t => t.pieceId === 'P2')).toHaveLength(1);

        const d = replay([...base, cutEntry(), { type: 'imageDelete', elem: { id: 'P1' } }]);
        expect(d.images).toEqual([]);
        expect(d.paths.map(p => p.id)).toEqual(['cross-o']);
        expect(d.texts).toEqual([]);
        expect(d.overlays.map(o => o.kind)).toEqual(['cut']); // the hole stays
    });

    it('a cut over a copy takes the copy\'s content and leaves a hole in the copy', () => {
        const s = replay([...base, cutEntry(), { type: 'pieceCopy', elem: { id: 'P2', from: 'P1', x: 20, y: 0 } },
            {
                type: 'cut', elem: {
                    id: 'C2', x: 18, y: 0, width: 6, height: 10,
                    piece: { id: 'P3', x: 18, y: 0, width: 6, height: 10, file: 'p3.png' },
                    takePaths: ['in~P2'], takeTexts: ['t~P2'], takeImages: [], splitPaths: [],
                    cutPieces: [{ id: 'P2', hole: [[-2, 0], [4, 0], [4, 10], [-2, 10]] }], absorbPieces: [],
                },
            }]);
        expect(s.paths.find(p => p.id === 'in~P2')!.pieceId).toBe('P3');
        expect(s.texts.find(t => t.id === 't~P2')!.pieceId).toBe('P3');
        const copy = s.images.find(i => i.id === 'P2')!;
        expect(copy.holes).toEqual([[[-2, 0], [4, 0], [4, 10], [-2, 10]]]);
        // the hole is not paper: touching there does not find the copy
        expect(topPieceAt(s.images, 21, 5)!.id).toBe('P3');
        expect(topPieceAt([copy], 21, 5)).toBeUndefined();
        expect(topPieceAt([copy], 27, 5)!.id).toBe('P2');
    });

    it('a piece taken whole by a cut is removed; its content outside goes to the page', () => {
        const s = replay([...base, cutEntry(),
            { type: 'path', elem: stroke('long', [[1, 1], [50, 50]], { pieceId: 'P1' }) },
            {
                type: 'cut', elem: {
                    id: 'C2', x: -1, y: -1, width: 12, height: 12,
                    piece: { id: 'P3', x: -1, y: -1, width: 12, height: 12, file: 'p3.png' },
                    takePaths: ['in'], takeTexts: ['t'], takeImages: [], splitPaths: [],
                    cutPieces: [], absorbPieces: ['P1'],
                },
            }]);
        expect(s.images.map(i => i.id)).toEqual(['P3']);
        expect(s.paths.find(p => p.id === 'long')!.pieceId).toBeUndefined();
    });

    it('a text moved off its piece goes to the page, and onto another piece joins it', () => {
        const moved = (pieceId: any) => ({ type: 'text', elem: { id: 't', text: 'hi', x: 80, y: 80, fontSize: 2, pieceId } });
        expect(replay([...base, cutEntry(), moved(null)]).texts[0].pieceId).toBeUndefined();
        expect(replay([...base, cutEntry(), moved('P9')]).texts[0].pieceId).toBe('P9');
        // a piece move after that no longer takes the text along
        const s = replay([...base, cutEntry(), moved(null), { type: 'imagePosition', elem: { id: 'P1', x: 40, y: 40, width: 10, height: 10 } }]);
        expect(s.texts[0]).toMatchObject({ x: 80, y: 80 });
    });

    it('copying a selection leaves the page as it was, and makes a piece with copies of its content', () => {
        const before = replay(base);
        const s = replay([...base, { type: 'cut', elem: { ...cutEntry().elem, copy: { dx: 30, dy: 0 }, piece: { id: 'P1', x: 30, y: 0, width: 10, height: 10, file: 'p.png' } } }]);
        // the page: unchanged
        expect(s.overlays).toEqual([]);
        expect(s.paths.filter(p => !p.pieceId)).toEqual(before.paths);
        expect(s.texts.filter(t => !t.pieceId)).toEqual(before.texts);
        // the copy: the stroke inside, the inside part of the crossing stroke, the text - moved by the offset
        expect(s.paths.filter(p => p.pieceId === 'P1').map(p => [p.id, p.points[0]])).toEqual([
            ['in~P1', [M, 31, 1]], ['cross-i~P1', [M, 35, 5]]]);
        expect(s.texts.find(t => t.pieceId === 'P1')).toMatchObject({ id: 't~P1', x: 32 });
        expect(s.images).toEqual([expect.objectContaining({ id: 'P1', isCutPiece: true, x: 30 })]);
    });

    it('a selection that is dropped leaves no trace; acting on it is one undo step with it', () => {
        const removed: string[] = [];
        const q = new DoQueue(async (f: string) => { removed.push(f); });
        base.forEach(e => q.add(e));
        q.pushCut(cutEntry().elem);
        expect(q.discardLast('C1', true)).toBeTruthy();
        expect(q.getAll()).toEqual(base);
        expect(q.canRedo()).toBe(false);
        expect(removed).toEqual(['p.png']);

        q.pushCut(cutEntry().elem);
        q.pushImagePosition({ id: 'P1', x: 50, y: 50, width: 10, height: 10 }, true);
        q.undo();
        expect(q.getAll()).toEqual(base);
    });

    it('a cut is a single undo step, and undo restores the page as before', () => {
        const q = new DoQueue(async () => { });
        base.forEach(e => q.add(e));
        const before = replay(q.getAll());
        q.pushCut(cutEntry().elem);
        q.pushPieceCopy({ id: 'P2', from: 'P1', x: 20, y: 0 });
        expect(q.undo()).toBe(true);
        expect(q.undo()).toBe(true);
        expect(replay(q.getAll())).toEqual(before);
        q.redo();
        expect(replay(q.getAll()).images.map(i => i.id)).toEqual(['P1']);
    });

    it('discarding an undone cut removes its piece file', async () => {
        const removed: string[] = [];
        const q = new DoQueue(async (f: string) => { removed.push(f); });
        q.pushCut(cutEntry().elem);
        q.undo();
        q.pushPath(stroke('x', [[1, 1], [2, 2]]));
        await Promise.resolve();
        expect(removed).toEqual(['p.png']);
    });
});

describe('drawing order', () => {
    const piece = (id: string, z: number) => ({ id, isCutPiece: true, x: 0, y: 0, width: 10, height: 10, z } as any);

    it('splits base ink around pieces by when they were touched', () => {
        const layers = buildDrawLayers(
            [stroke('a', [[0, 0], [1, 1]], { z: 1 }), stroke('b', [[0, 0], [1, 1]], { z: 5 }),
            stroke('own', [[0, 0], [1, 1]], { z: 2, pieceId: 'P' }), stroke('erase', [[0, 0], [1, 1]], { z: 6, color: '#00000000' })] as any,
            [], [piece('P', 3)]);
        expect(layers.map(l => l.piece ? 'piece:' + l.items.map(i => i.path!.id) : 'base:' + l.items.map(i => i.path!.id))).toEqual([
            'base:a', 'piece:own', 'base:b,erase']);
        // a later eraser also clears base ink under the piece
        expect((layers[0] as any).erasers.map((i: any) => i.path.id)).toEqual(['erase']);
    });

    it('finds the topmost piece at a point', () => {
        const images = [piece('low', 1), piece('high', 9), piece('mid', 5)];
        expect(topPieceAt(images, 5, 5)!.id).toBe('high');
        expect(topPieceAt(images, 50, 50)).toBeUndefined();
    });
});

describe('texts between pieces', () => {
    const piece = (id: string, x: number, z: number) => ({ id, x, y: 0, width: 10, height: 10, isCutPiece: true, z }) as any;
    const text = (id: string, x: number, z: number, extra: any = {}) =>
        ({ id, text: 'a', x, y: 2, width: 4, height: 2, fontSize: 2, z, ...extra }) as any;
    const ink = (z: number) => ({ ...stroke('ink' + z, [[0, 0], [5, 5]]), z }) as any;

    it('keeps texts above ink, and one canvas when nothing covers a text', () => {
        const layers = buildDrawLayers([ink(5)], [], [piece('A', 0, 1)]);
        const s = stackTexts(layers, [text('t', 2, 3), text('far', 50, 0)]);
        expect(s.canvases.length).toBe(1);
        expect(s.textLevel.get('t')).toBe(1);
        expect(s.textLevel.get('far')).toBe(1);
    });

    it('puts a text under a piece laid over it later', () => {
        const layers = buildDrawLayers([ink(0)], [], [piece('A', 0, 5)]);
        const s = stackTexts(layers, [text('t', 2, 3), text('later', 2, 7)]);
        expect(s.canvases.map(c => c.map(l => l.piece?.id ?? 'base'))).toEqual([['base'], ['A']]);
        expect(s.textLevel.get('t')).toBe(1); // between: above the ink, under A
        expect(s.textLevel.get('later')).toBe(2); // written after A: on top
    });

    it('a text on a piece is covered only by pieces over that piece; the edited text is on top', () => {
        const layers = buildDrawLayers([], [], [piece('A', 0, 1), piece('B', 5, 4)]);
        const s = stackTexts(layers, [text('onA', 6, 9, { pieceId: 'A' }), text('onB', 6, 2, { pieceId: 'B' })]);
        expect(s.textLevel.get('onA')).toBe(1); // under B
        expect(s.textLevel.get('onB')).toBe(2);
        expect(stackTexts(layers, [text('onA', 6, 9, { pieceId: 'A' })], 'onA').textLevel.get('onA')).toBe(1);
    });
});

describe('texts with the select tool', () => {
    const piece = (id: string, x: number, z: number) => ({ id, x, y: 0, width: 10, height: 10, isCutPiece: true, z }) as any;
    const text = (id: string, x: number, z: number, extra: any = {}) =>
        ({ id, text: 'a', x, y: 2, width: 4, height: 2, fontSize: 2, z, ...extra }) as any;

    it('finds a text unless a piece laid over it hides it there', () => {
        const images = [piece('A', 0, 5)];
        expect(visibleTextAt([text('t', 2, 3)], images, 3, 3)).toBeUndefined(); // under A
        expect(visibleTextAt([text('t', 2, 7)], images, 3, 3)!.id).toBe('t'); // written after A
        expect(visibleTextAt([text('t', 2, 1, { pieceId: 'A' })], images, 3, 3)!.id).toBe('t'); // on A
        expect(visibleTextAt([text('r', 6, 9, { rtl: true })], images, 3, 3)!.id).toBe('r'); // rtl: x is the right edge
    });

    it('a moved text comes to the top', () => {
        const q = [
            { type: 'text', elem: { id: 't', text: 'a', x: 1, y: 1, fontSize: 2 } },
            { type: 'path', elem: stroke('s', [[0, 0], [1, 1]]) },
            { type: 'text', elem: { id: 't', text: 'a', x: 5, y: 1, fontSize: 2 } },
        ];
        expect(replay(q).texts[0].z).toBe(0);
        expect(replay([...q.slice(0, 2), { type: 'text', elem: { ...q[2].elem, raise: true } }]).texts[0].z).toBe(2);
    });

    it('a piece remembers the size its content was laid out at', () => {
        const s = replay([{ type: 'image', elem: { id: 'I1', x: 0, y: 0, width: 20, height: 10, file: 'i.jpg', layered: true } },
            { type: 'imagePosition', elem: { id: 'I1', x: 0, y: 0, width: 40, height: 20, layered: true } }]);
        expect(s.images[0]).toMatchObject({ originWidth: 40, originHeight: 20 });
    });
});
