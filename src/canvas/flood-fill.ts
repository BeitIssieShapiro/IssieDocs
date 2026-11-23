// Paint-bucket region detection on an RGBA raster.
//
// A pixel is a "barrier" if it is a wall, or its color is far from the color at the seed point.
// A closed area is filled exactly. To treat almost-closed shapes as closed, barriers are
// dilated by `gap` pixels before flooding, and the resulting region is grown back so it
// reaches the shape outline. If the region reaches the raster edge, the shape is considered
// open and no region is returned.

export interface FillRegion {
    mask: Uint8Array; // width * height, 1 = fill, cropped to the bounding box
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface FloodFillOptions {
    gap: number; // max half-gap (pixels) to bridge
    tolerance: number; // max per-channel distance from seed color
}

// Sets out[i] = 1 if any src pixel within `r` (Chebyshev distance) is set.
export function dilate(src: Uint8Array, w: number, h: number, r: number): Uint8Array {
    if (r <= 0) return src.slice();
    const tmp = new Uint8Array(w * h);
    const out = new Uint8Array(w * h);
    const prefix = new Int32Array(Math.max(w, h) + 1);

    for (let y = 0; y < h; y++) {
        const row = y * w;
        for (let x = 0; x < w; x++) prefix[x + 1] = prefix[x] + src[row + x];
        for (let x = 0; x < w; x++) {
            const a = Math.max(0, x - r), b = Math.min(w, x + r + 1);
            tmp[row + x] = prefix[b] - prefix[a] > 0 ? 1 : 0;
        }
    }
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) prefix[y + 1] = prefix[y] + tmp[y * w + x];
        for (let y = 0; y < h; y++) {
            const a = Math.max(0, y - r), b = Math.min(h, y + r + 1);
            out[y * w + x] = prefix[b] - prefix[a] > 0 ? 1 : 0;
        }
    }
    return out;
}

// 4-connected scanline flood over cells where blocked == 0.
// Returns undefined if the region touches the raster border.
function flood(blocked: Uint8Array, w: number, h: number, sx: number, sy: number): Uint8Array | undefined {
    const region = new Uint8Array(w * h);
    const stack: number[] = [sx, sy];
    while (stack.length) {
        const y = stack.pop()!;
        let x = stack.pop()!;
        const row = y * w;
        if (region[row + x] || blocked[row + x]) continue;

        while (x > 0 && !blocked[row + x - 1] && !region[row + x - 1]) x--;
        let spanAbove = false, spanBelow = false;
        for (; x < w && !blocked[row + x] && !region[row + x]; x++) {
            region[row + x] = 1;
            if (x === 0 || x === w - 1 || y === 0 || y === h - 1) return undefined;

            const up = row - w + x, down = row + w + x;
            const upOpen = !blocked[up] && !region[up];
            if (upOpen && !spanAbove) stack.push(x, y - 1);
            spanAbove = upOpen;
            const downOpen = !blocked[down] && !region[down];
            if (downOpen && !spanBelow) stack.push(x, y + 1);
            spanBelow = downOpen;
        }
    }
    return region;
}

// BFS from `start` over non-barrier pixels (within maxDist steps) to the closest pixel that is not blocked
function nearestUnblocked(barrier: Uint8Array, blocked: Uint8Array, w: number, h: number, start: number, maxDist: number)
    : number | undefined {
    const visited = new Set<number>([start]);
    let frontier = [start];
    for (let d = 0; d < maxDist && frontier.length; d++) {
        const next: number[] = [];
        for (const i of frontier) {
            const x = i % w, y = Math.floor(i / w);
            for (const n of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
                if (n < 0 || visited.has(n) || barrier[n]) continue;
                if (!blocked[n]) return n;
                visited.add(n);
                next.push(n);
            }
        }
        frontier = next;
    }
    return undefined;
}

export function computeFillRegion(
    pixels: Uint8Array, w: number, h: number,
    seedX: number, seedY: number,
    { gap, tolerance }: FloodFillOptions,
    walls?: Uint8Array, // w * h, 1 = always a barrier (e.g. ink), regardless of color
): FillRegion | undefined {
    seedX = Math.round(seedX);
    seedY = Math.round(seedY);
    if (seedX <= 0 || seedY <= 0 || seedX >= w - 1 || seedY >= h - 1) return undefined;

    const s = (seedY * w + seedX) * 4;
    const sr = pixels[s], sg = pixels[s + 1], sb = pixels[s + 2];

    const barrier = new Uint8Array(w * h);
    for (let i = 0, p = 0; i < barrier.length; i++, p += 4) {
        if ((walls && walls[i]) ||
            Math.abs(pixels[p] - sr) > tolerance ||
            Math.abs(pixels[p + 1] - sg) > tolerance ||
            Math.abs(pixels[p + 2] - sb) > tolerance) {
            barrier[i] = 1;
        }
    }

    let seed = seedY * w + seedX;
    if (barrier[seed]) return undefined;

    // A truly closed area is filled exactly, into every corner
    const exact = flood(barrier, w, h, seedX, seedY);
    if (exact) return isThin(exact, w, h) ? undefined : crop(exact, w, h); // thin: tapped on a line itself

    // Almost closed: close openings by thickening the outlines, flood, then grow back to the outline
    const blocked = dilate(barrier, w, h, gap);
    if (blocked[seed]) {
        // Tapped close to an outline: start from the nearest point clear of the thickened outlines
        const nearest = nearestUnblocked(barrier, blocked, w, h, seed, 3 * gap);
        if (nearest === undefined) return undefined;
        seed = nearest;
    }

    const core = flood(blocked, w, h, seed % w, Math.floor(seed / w));
    if (!core) return undefined;
    return crop(growBack(barrier, blocked, core, w, h, 4 * gap + 2), w, h);
}

/**
 * Grows `core` back over the thickened-outline zone, up to the real outline. Every other open
 * area grows at the same time, and each pixel goes to whichever reaches it first (walking around
 * outlines, never across them): the fill reaches deep into sharp corners, while at an opening it
 * meets the outside halfway instead of leaking out.
 */
function growBack(barrier: Uint8Array, blocked: Uint8Array, core: Uint8Array, w: number, h: number, maxDist: number)
    : Uint8Array {
    const OURS = 1, OTHER = 2;
    const label = new Uint8Array(w * h);
    const dist = new Uint16Array(w * h);
    const queue = new Int32Array(w * h);
    let head = 0, tail = 0;
    for (let i = 0; i < label.length; i++) {
        if (barrier[i]) continue;
        if (core[i]) label[i] = OURS;
        else if (!blocked[i]) label[i] = OTHER;
        else continue;
        queue[tail++] = i;
    }
    while (head < tail) {
        const i = queue[head++];
        const d = dist[i] + 1;
        if (d > maxDist) continue;
        const x = i % w;
        for (const n of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
            if (n < 0 || n >= label.length || label[n] || barrier[n]) continue;
            label[n] = label[i];
            dist[n] = d;
            queue[tail++] = n;
        }
    }
    const region = new Uint8Array(w * h);
    for (let i = 0; i < label.length; i++) region[i] = label[i] === OURS ? 1 : 0;
    return region;
}

// Whether no pixel of the region has its whole 3x3 neighbourhood in it (a line, not an area)
function isThin(region: Uint8Array, w: number, h: number): boolean {
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const i = y * w + x;
            if (region[i - w - 1] && region[i - w] && region[i - w + 1] && region[i - 1] && region[i] &&
                region[i + 1] && region[i + w - 1] && region[i + w] && region[i + w + 1]) return false;
        }
    }
    return true;
}

// Crops a full-raster mask to its bounding box
function crop(full: Uint8Array, w: number, h: number): FillRegion | undefined {
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (!full[y * w + x]) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }
    if (maxX < 0) return undefined;

    const width = maxX - minX + 1, height = maxY - minY + 1;
    const mask = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
        const srcRow = (y + minY) * w + minX;
        mask.set(full.subarray(srcRow, srcRow + width), y * width);
    }
    return { mask, x: minX, y: minY, width, height };
}

type Pt = [number, number];

/**
 * Finds invisible segments that close almost-closed pen drawings: each stroke end is joined to the
 * nearest point (within maxGap) of another stroke, or of a far part of its own stroke.
 * `strokes` are polylines; nearby points of the same stroke (arc length < 2 * maxGap) are ignored
 * so an end is not joined to its own neighbourhood.
 */
export function gapConnectors(strokes: Pt[][], maxGap: number): [Pt, Pt][] {
    const connectors: [Pt, Pt][] = [];
    const arcLengths = strokes.map(s => {
        const acc = [0];
        for (let i = 1; i < s.length; i++) acc.push(acc[i - 1] + Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]));
        return acc;
    });

    strokes.forEach((stroke, si) => {
        if (stroke.length < 2) return;
        const total = arcLengths[si][stroke.length - 1];
        for (const endIdx of [0, stroke.length - 1]) {
            const end = stroke[endIdx];
            const endArc = arcLengths[si][endIdx];
            let best: Pt | undefined, bestDist = maxGap;
            strokes.forEach((other, oi) => {
                for (let i = 0; i < Math.max(1, other.length - 1); i++) {
                    // closest point on segment i (or the single point)
                    const a = other[i], b = other[Math.min(i + 1, other.length - 1)];
                    const dx = b[0] - a[0], dy = b[1] - a[1];
                    const len2 = dx * dx + dy * dy;
                    const t = len2 ? Math.max(0, Math.min(1, ((end[0] - a[0]) * dx + (end[1] - a[1]) * dy) / len2)) : 0;
                    const p: Pt = [a[0] + t * dx, a[1] + t * dy];
                    if (oi === si) {
                        const arc = arcLengths[oi][i] + t * Math.sqrt(len2);
                        if (Math.abs(arc - endArc) < Math.min(2 * maxGap, total / 2)) continue;
                    }
                    const d = Math.hypot(p[0] - end[0], p[1] - end[1]);
                    if (d < bestDist) {
                        bestDist = d;
                        best = p;
                    }
                }
            });
            if (best) connectors.push([end, best]);
        }
    });
    return connectors;
}
