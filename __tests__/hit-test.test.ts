import { isPointOnImage } from '../src/canvas/utils';

describe('isPointOnImage', () => {
    const rectPiece = { x: 100, y: 100, width: 50, height: 50 };
    // triangle covering the top-left half of the piece
    const lassoPiece = { ...rectPiece, outline: [[0, 0], [1, 0], [0, 1]] as [number, number][] };

    it('hits anywhere inside a rectangle piece', () => {
        expect(isPointOnImage(rectPiece, 145, 145)).toBe(true);
        expect(isPointOnImage(rectPiece, 99, 120)).toBe(false);
    });

    it('hits only inside the lasso outline', () => {
        expect(isPointOnImage(lassoPiece, 110, 110)).toBe(true);
        expect(isPointOnImage(lassoPiece, 145, 145)).toBe(false); // empty corner of the bounding box
    });
});
