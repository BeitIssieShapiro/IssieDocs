/**
 * Table cell-range math (select/move a block of cells) and editor geometry helpers.
 */
import { Platform } from 'react-native';
import {
    calculateTargetBox, isCellInBox, isSameCell, isTooWhite, nearPoint, normalizeBox, offsetTablePoints,
    pageTitleAddition, pointOnContinuationOfLine, PromiseAllProgress, tableBoxToPoints,
} from '../src/utils';
import {
    calcEffectiveHorizontalLines, calculateLineAngle, findLast, IIF, inBox, isPointOnLineSegment, joinPath,
    normalizeFoAndroid, restoreElement, backupElement, tableHeight, tableWidth,
} from '../src/canvas/utils';

// 3 columns x 3 rows, 100px cells
const table: any = { id: 'T', verticalLines: [0, 100, 200, 300], horizontalLines: [0, 100, 200, 300], strokeWidth: 2 };

describe('cell ranges', () => {
    test('normalizeBox / isCellInBox work for boxes dragged in any direction', () => {
        expect(normalizeBox({ from: [2, 2], to: [0, 1] })).toEqual({ from: [0, 1], to: [2, 2] });
        expect(isCellInBox([1, 1], { from: [2, 2], to: [0, 1] })).toBe(true);
        expect(isCellInBox([1, 0], { from: [2, 2], to: [0, 1] })).toBe(false);
        expect(isSameCell([1, 2], [1, 2])).toBe(true);
    });

    test('calculateTargetBox moves a block but keeps it inside the table', () => {
        const box = { from: [0, 0], to: [1, 1] }; // 2x2 block
        expect(calculateTargetBox(table, box, [1, 1])).toEqual({ from: [1, 1], to: [2, 2] });
        expect(calculateTargetBox(table, box, [2, 2])).toEqual({ from: [1, 1], to: [2, 2] }); // capped at the edge
        expect(calculateTargetBox(table, { from: [1, 1], to: [2, 2] }, [-3, -1])).toEqual({ from: [0, 0], to: [1, 1] });
    });

    test('tableBoxToPoints covers the block with a margin, and can be offset', () => {
        const pts = tableBoxToPoints(table, { from: [1, 0], to: [1, 1] }, 5);
        expect(pts).toEqual({ x1: 95, y1: -5, x2: 205, y2: 205 });
        expect(offsetTablePoints(pts, [10, -5])).toEqual({ x1: 105, y1: -10, x2: 215, y2: 200 });
    });

    test('table size and auto-grown rows for tall text', () => {
        expect(tableWidth(table)).toBe(300);
        expect(tableHeight(table)).toBe(300);
        const lines = calcEffectiveHorizontalLines(table, 10000, [{ tableId: 'T', y: 0, height: 150 } as any]);
        expect(lines).toEqual([0, 151, 251, 351]); // row 0 grows by 50 + half the stroke
        // never pushed below the page: each line keeps MIN_LINE_HEIGHT room for the next
        const capped = calcEffectiveHorizontalLines(table, 200);
        expect(capped[capped.length - 1]).toBeLessThanOrEqual(200);
    });
});

describe('geometry', () => {
    test('isPointOnLineSegment uses the distance to the segment, not the infinite line', () => {
        expect(isPointOnLineSegment([0, 0], [10, 0], 5, 2, 3)).toBe(true);
        expect(isPointOnLineSegment([0, 0], [10, 0], 15, 0, 3)).toBe(false); // beyond the end
        expect(isPointOnLineSegment([5, 5], [5, 5], 6, 6, 2)).toBe(true); // a dot
    });

    test('line angle is folded into 0..180', () => {
        expect(calculateLineAngle([0, 0], [10, 0])).toBe(0);
        expect(calculateLineAngle([0, 0], [0, 10])).toBe(90);
        expect(calculateLineAngle([0, 0], [0, -10])).toBe(90);
    });

    test('pointOnContinuationOfLine extends a ruler beyond either end', () => {
        expect(pointOnContinuationOfLine(0, 0, 10, 0, 5, false)).toEqual({ x: 15, y: 0 });
        const start = pointOnContinuationOfLine(0, 0, 10, 0, 5, true);
        expect(start.x).toBeCloseTo(-5);
        expect(pointOnContinuationOfLine(0, 0, 0, 10, 5, true)).toEqual({ x: 0, y: -5 });
    });

    test('inBox respects RTL text anchored at its right edge', () => {
        const ltr = { x: 100, y: 100, width: 50, height: 20 };
        expect(inBox(ltr, 120, 110, 0)).toBe(true);
        expect(inBox({ ...ltr, rtl: true }, 120, 110, 0)).toBe(false);
        expect(inBox({ ...ltr, rtl: true }, 80, 110, 0)).toBe(true);
        expect(inBox({ ...ltr, height: 0 }, 120, 100, 5)).toBeFalsy(); // no height yet = not hit
    });

    test('joinPath scales points into an SVG path', () => {
        expect(joinPath([], 2)).toBe('');
        expect(joinPath([[1, 2], [3, 4]], 2)).toBe('M2 4 L6 8');
    });
});

describe('misc helpers', () => {
    afterEach(() => { (Platform as any).OS = 'ios'; });

    test('backup/restore of an element being edited', () => {
        jest.spyOn(console, 'log').mockImplementation(() => { });
        const el: any = { id: 'e', x: 1 };
        backupElement(el);
        el.x = 99;
        const edited = restoreElement(el);
        expect(el).toEqual({ id: 'e', x: 1 });
        expect(edited.x).toBe(99);
        expect(restoreElement(el)).toBe(el); // nothing to restore
    });

    test('Android file uris go through the file provider', () => {
        const src = { uri: 'file:///data/user/0/org.issieshapiro.issiedocs/files/Default/a.jpg' };
        expect(normalizeFoAndroid(src)).toBe(src);
        (Platform as any).OS = 'android';
        expect(normalizeFoAndroid(src)!.uri).toBe('content://org.issieshapiro.issiedocs.provider/Default/a.jpg');
    });

    test('small helpers', async () => {
        expect(isTooWhite('#f0f0f0')).toBe(true);
        expect(isTooWhite('#ff0000')).toBe(false);
        expect(isTooWhite(undefined as any)).toBe(false);
        expect(pageTitleAddition(1, 0)).toBe('');
        expect(pageTitleAddition(3, 1)).toBe(' - 2/3');
        expect(nearPoint(10, 12, 2)).toBe(true);
        expect(IIF('def', [false, 'a'], [1, 'b'])).toBe('b');
        expect(IIF('def', [0, 'a'])).toBe('def');
        expect(findLast([1, 2, 3, 4], x => x % 2 === 1)).toBe(3);
        expect(findLast(undefined, () => true)).toBeUndefined();

        const progress: number[] = [];
        await expect(PromiseAllProgress([Promise.resolve(1), 2], p => progress.push(p))).resolves.toEqual([1, 2]);
        expect(progress).toEqual([0, 50, 100]);
    });
});
