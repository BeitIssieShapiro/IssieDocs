import { computeFillRegion } from '../src/canvas/flood-fill';

const W = 100, H = 100;

function whiteRaster() {
    return new Uint8Array(W * H * 4).fill(255);
}

function setBlack(px: Uint8Array, x: number, y: number) {
    const i = (y * W + x) * 4;
    px[i] = px[i + 1] = px[i + 2] = 0;
}

// Square outline from (20,20) to (80,80), 2px thick, with an optional gap in the top edge
function square(gapWidth = 0) {
    const px = whiteRaster();
    for (let i = 20; i <= 80; i++) {
        for (let t = 0; t < 2; t++) {
            const inGap = i >= 50 && i < 50 + gapWidth;
            if (!inGap) setBlack(px, i, 20 + t);
            setBlack(px, i, 79 + t);
            setBlack(px, 20 + t, i);
            setBlack(px, 79 + t, i);
        }
    }
    return px;
}

const opts = { gap: 3, tolerance: 60 };

describe('computeFillRegion', () => {
    it('fills the inside of a closed shape up to its outline', () => {
        const r = computeFillRegion(square(), W, H, 50, 50, opts);
        expect(r).toBeDefined();
        expect(r!.x).toBe(22);
        expect(r!.y).toBe(22);
        expect(r!.width).toBe(57);
        expect(r!.height).toBe(57);
        expect(r!.mask.every(v => v === 1)).toBe(true);
    });

    it('treats an almost-closed shape as closed', () => {
        const r = computeFillRegion(square(5), W, H, 50, 50, opts);
        expect(r).toBeDefined();
        // does not spill far outside the shape through the gap
        expect(r!.y).toBeGreaterThan(14);
    });

    it('does nothing for a shape with a wide opening', () => {
        expect(computeFillRegion(square(20), W, H, 50, 50, opts)).toBeUndefined();
    });

    it('does nothing for a plain line', () => {
        const px = whiteRaster();
        for (let x = 10; x < 90; x++) setBlack(px, x, 50);
        expect(computeFillRegion(px, W, H, 50, 30, opts)).toBeUndefined();
    });

    it('fills when tapping right next to the outline', () => {
        const r = computeFillRegion(square(), W, H, 23, 50, opts);
        expect(r).toBeDefined();
        expect(r!.width).toBe(57);
    });

    it('fills a shape narrower than the gap tolerance', () => {
        const px = whiteRaster();
        // closed 4px-high strip
        for (let x = 20; x <= 80; x++) { setBlack(px, x, 48); setBlack(px, x, 53); }
        for (let y = 48; y <= 53; y++) { setBlack(px, 20, y); setBlack(px, 80, y); }
        const r = computeFillRegion(px, W, H, 50, 50, opts);
        expect(r).toBeDefined();
        expect(r!.height).toBe(4);
    });

    it('fills into the sharp corners of an almost-closed shape', () => {
        // a thin wedge: the bottom edge and a steep diagonal meet at (20,80); a gap in the right side
        const px = whiteRaster();
        for (let x = 20; x <= 80; x++) { setBlack(px, x, 80); setBlack(px, x, 80 - Math.round((x - 20) * 0.5)); }
        for (let y = 50; y <= 80; y++) if (y < 60 || y > 64) setBlack(px, 80, y);
        const r = computeFillRegion(px, W, H, 65, 75, opts);
        expect(r).toBeDefined();
        // reaches close to the tip of the wedge, not stopping a gap's width (or more) away
        expect(r!.x).toBeLessThanOrEqual(27);
        // does not spill out through the gap
        expect(r!.x + r!.width).toBeLessThanOrEqual(84);
    });

    it('stops at walls whatever their color', () => {
        const px = whiteRaster();
        const walls = new Uint8Array(W * H);
        for (let i = 20; i <= 80; i++) {
            walls[20 * W + i] = walls[80 * W + i] = walls[i * W + 20] = walls[i * W + 80] = 1;
        }
        const r = computeFillRegion(px, W, H, 50, 50, opts, walls);
        expect(r).toBeDefined();
        expect(r!.x).toBe(21);
        expect(r!.width).toBe(59);
    });

    it('does not jump across a thin outline into the area beside it', () => {
        // two squares sharing a 1px wall; the left one has a gap
        const px = whiteRaster();
        for (let i = 10; i <= 90; i++) { setBlack(px, i, 30); setBlack(px, i, 70); }
        for (let y = 30; y <= 70; y++) { setBlack(px, 10, y); setBlack(px, 50, y); setBlack(px, 90, y); }
        for (let x = 25; x < 30; x++) px.fill(255, (30 * W + x) * 4, (30 * W + x) * 4 + 3);
        const r = computeFillRegion(px, W, H, 30, 50, opts);
        expect(r).toBeDefined();
        expect(r!.x + r!.width).toBeLessThanOrEqual(50);
    });

    it('does nothing when tapping on the outline itself', () => {
        expect(computeFillRegion(square(), W, H, 50, 20, opts)).toBeUndefined();
    });
});

describe('gapConnectors', () => {
    const { gapConnectors } = require('../src/canvas/flood-fill');
    // square outline drawn as one stroke, starting/ending `gap` apart on the top edge
    const openSquare = (gap: number) => [[[50 + gap, 0], [100, 0], [100, 100], [0, 100], [0, 0], [50, 0]]];

    it('joins the two ends of an almost-closed stroke', () => {
        const c = gapConnectors(openSquare(20), 30);
        expect(c.length).toBeGreaterThan(0);
        expect(c[0][0]).toEqual([70, 0]);
        expect(c[0][1][1]).toBeCloseTo(0);
    });

    it('does not join ends that are far apart', () => {
        expect(gapConnectors(openSquare(60), 30)).toEqual([]);
    });

    it('joins a stroke end to a nearby separate stroke', () => {
        const c = gapConnectors([[[0, 0], [100, 0]], [[50, 10], [50, 80]]], 30);
        expect(c).toContainEqual([[50, 10], [50, 0]]);
    });

    it('does not join a straight line to itself', () => {
        expect(gapConnectors([[[0, 0], [50, 0], [100, 0]]], 30)).toEqual([]);
    });
});
