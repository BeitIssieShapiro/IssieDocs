import { allHave, applySpanStyle, scaleSpanSizes, textSegments, updateSpansForEdit } from '../src/canvas/text-spans';

describe('text spans', () => {
    it('styles a range, merges equal neighbours, and can clear back to the text style', () => {
        let spans = applySpanStyle(undefined, 10, 2, 5, { bold: true });
        expect(spans).toEqual([{ start: 2, end: 5, bold: true }]);
        spans = applySpanStyle(spans, 10, 5, 7, { bold: true });
        expect(spans).toEqual([{ start: 2, end: 7, bold: true }]);
        spans = applySpanStyle(spans, 10, 4, 6, { color: '#ff0000' });
        expect(spans).toEqual([
            { start: 2, end: 4, bold: true },
            { start: 4, end: 6, bold: true, color: '#ff0000' },
            { start: 6, end: 7, bold: true }]);
        expect(applySpanStyle(spans, 10, 0, 10, { bold: undefined, color: undefined })).toBeUndefined();
    });

    it('keeps spans on their characters while typing and deleting', () => {
        const spans = [{ start: 2, end: 5, bold: true }]; // "ab[cde]fg"
        // typing inside the bold word extends it
        expect(updateSpansForEdit(spans, 'abcdefg', 'abcdXefg')).toEqual([{ start: 2, end: 6, bold: true }]);
        // typing before it moves it
        expect(updateSpansForEdit(spans, 'abcdefg', 'XXabcdefg')).toEqual([{ start: 4, end: 7, bold: true }]);
        // typing right after it continues the style
        expect(updateSpansForEdit(spans, 'abcdefg', 'abcdeXfg')).toEqual([{ start: 2, end: 6, bold: true }]);
        // deleting into it shrinks it; deleting all of it removes it
        expect(updateSpansForEdit(spans, 'abcdefg', 'abefg')).toEqual([{ start: 2, end: 3, bold: true }]);
        expect(updateSpansForEdit(spans, 'abcdefg', 'abfg')).toBeUndefined();
    });

    it('splits text into styled segments', () => {
        expect(textSegments('hello world', [{ start: 6, end: 11, italic: true }])).toEqual([
            { text: 'hello ', start: 0, style: {} },
            { text: 'world', start: 6, style: { italic: true } }]);
        expect(textSegments('plain', undefined)).toEqual([{ text: 'plain', start: 0, style: {} }]);
    });

    it('tells whether a range is all bold (toggle)', () => {
        const spans = [{ start: 0, end: 3, bold: true }];
        expect(allHave(spans, 0, 3, 'bold', false)).toBe(true);
        expect(allHave(spans, 0, 4, 'bold', false)).toBe(false);
        expect(allHave(undefined, 0, 4, 'bold', true)).toBe(true);
    });

    it('scales range sizes with the text size, leaving other styles', () => {
        expect(scaleSpanSizes([{ start: 0, end: 2, fontSize: 20 }, { start: 3, end: 4, bold: true }], 1.5)).toEqual([
            { start: 0, end: 2, fontSize: 30 }, { start: 3, end: 4, bold: true }]);
    });

    it('uses the edited range when given: repeated characters keep their styles', () => {
        // "a" + bold "a"; a plain "a" typed at the start
        expect(updateSpansForEdit([{ start: 1, end: 2, bold: true }], 'aa', 'aaa', { start: 0, end: 0 }))
            .toEqual([{ start: 2, end: 3, bold: true }]);
        // a space typed before a bold space
        expect(updateSpansForEdit([{ start: 2, end: 3, bold: true }], 'a  b', 'a   b', { start: 1, end: 1 }))
            .toEqual([{ start: 3, end: 4, bold: true }]);
        // replacing a selection: the typed text takes the style of the first replaced character
        expect(updateSpansForEdit([{ start: 2, end: 4, bold: true }], 'abcdef', 'abXef', { start: 2, end: 4 }))
            .toEqual([{ start: 2, end: 3, bold: true }]);
        // a range that does not match the change is ignored (e.g. autocorrect): inferred as before
        expect(updateSpansForEdit([{ start: 2, end: 5, bold: true }], 'abcdefg', 'abcdXefg', { start: 0, end: 0 }))
            .toEqual([{ start: 2, end: 6, bold: true }]);
    });

    it('backspace and forward delete with a cursor remove the right character', () => {
        // bold "a" + plain "a", the cursor between them
        const spans = [{ start: 0, end: 1, bold: true }];
        expect(updateSpansForEdit(spans, 'aa', 'a', { start: 1, end: 1 })).toBeUndefined(); // backspace: the bold one goes
        expect(updateSpansForEdit(spans, 'aa', 'a', { start: 0, end: 0 })).toBeUndefined(); // forward delete at 0: the bold one goes
        // plain "a" + bold "a", forward delete at 0: the plain one goes
        expect(updateSpansForEdit([{ start: 1, end: 2, bold: true }], 'aa', 'a', { start: 0, end: 0 })).toEqual([{ start: 0, end: 1, bold: true }]);
        // plain "a" + bold "a", cursor at the end, backspace: the bold one goes
        expect(updateSpansForEdit([{ start: 1, end: 2, bold: true }], 'aa', 'a', { start: 2, end: 2 })).toBeUndefined();
    });

    it('format bar cut and paste over repeated characters (the selection is the range)', () => {
        // paste "a" before plain "a" + bold "a"
        expect(updateSpansForEdit([{ start: 1, end: 2, bold: true }], 'aa', 'aaa', { start: 0, end: 0 }))
            .toEqual([{ start: 2, end: 3, bold: true }]);
        // cut the plain first "a" of "a" + bold "a" + plain "a"
        expect(updateSpansForEdit([{ start: 1, end: 2, bold: true }], 'aaa', 'aa', { start: 0, end: 1 }))
            .toEqual([{ start: 0, end: 1, bold: true }]);
    });
});
