// Paper pieces: the model behind the cut (select) tool.
//
// A page is base paper plus pieces cut out of it. A piece is a crop of the paper (an image)
// plus the annotations that belong to it (pieceId): they move, copy and delete with it.
// Drawing order is by z (queue position): whatever was touched last is on top. Inside a
// piece: its paper, then its paint and ink. Texts and inserted images are drawn above the
// sketch layer, as before.
//
// Coordinates are normalized (background image pixels), as everywhere in the canvas.

import type { PathCommand } from "@shopify/react-native-skia";
import { SketchImage, SketchOverlay, SketchPath, SketchPoint, SketchText } from "./types";
import { isPointInPolygon, isPointOnImage } from "./utils";

const VERB_MOVE = 0; // PathVerb.Move
const VERB_LINE = 1; // PathVerb.Line

export const isEraserPath = (p: SketchPath) => p.color === "#00000000";
export const isPiece = (img: SketchImage) => !!img.isCutPiece;

/** The cut shape as a polygon: the lasso, or the rect's corners */
export function cutPolygon(rect: { x: number; y: number; width: number; height: number }, lasso?: SketchPoint[]): SketchPoint[] {
    if (lasso && lasso.length > 2) return lasso;
    const { x, y, width: w, height: h } = rect;
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
}

/** The piece's outline polygon in page coordinates, at position (x, y) */
export function pieceOutline(piece: SketchImage, x = piece.x, y = piece.y): SketchPoint[] {
    if (piece.outline && piece.outline.length > 2) {
        return piece.outline.map(([fx, fy]) => [x + fx * piece.width, y + fy * piece.height]);
    }
    return cutPolygon({ x, y, width: piece.width, height: piece.height });
}

/** The piece's holes (cut out by later cuts) in page coordinates, at position (x, y) */
export function pieceHoles(piece: SketchImage, x = piece.x, y = piece.y): SketchPoint[][] {
    return (piece.holes ?? []).map(hole => hole.map(([hx, hy]) => [x + hx, y + hy] as SketchPoint));
}

/** Whether a point is on the piece's paper: inside its outline, not in a hole */
export function isPointOnPiece(piece: SketchImage, x: number, y: number): boolean {
    return isPointOnImage(piece, x, y) && !pieceHoles(piece).some(hole => isPointInPolygon(x, y, hole));
}

/** The topmost piece at a point, if any */
export function topPieceAt(images: SketchImage[] | undefined, x: number, y: number): SketchImage | undefined {
    let top: SketchImage | undefined;
    for (const img of images ?? []) {
        if (isPiece(img) && isPointOnPiece(img, x, y) && (!top || (img.z ?? 0) >= (top.z ?? 0))) top = img;
    }
    return top;
}

// Whether two polygons overlap: a corner of one inside the other, or crossing edges
function polygonsOverlap(a: SketchPoint[], b: SketchPoint[]): boolean {
    if (a.some(([x, y]) => isPointInPolygon(x, y, b)) || b.some(([x, y]) => isPointInPolygon(x, y, a))) return true;
    return a.some((p, i) => edgeCrossings(p, a[(i + 1) % a.length], b).length > 0);
}

// Where segment a-b crosses the polygon's edges: the fractions (0..1) along it, in order
function edgeCrossings(a: SketchPoint, b: SketchPoint, polygon: SketchPoint[]): number[] {
    const ts: number[] = [];
    const rx = b[0] - a[0], ry = b[1] - a[1];
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [px, py] = polygon[j], [qx, qy] = polygon[i];
        const sx = qx - px, sy = qy - py;
        const denom = rx * sy - ry * sx;
        if (denom === 0) continue;
        const t = ((px - a[0]) * sy - (py - a[1]) * sx) / denom;
        const u = ((px - a[0]) * ry - (py - a[1]) * rx) / denom;
        if (t > 0 && t < 1 && u >= 0 && u <= 1) ts.push(t);
    }
    return ts.sort((x, y) => x - y);
}

/**
 * Splits a stroke at the polygon's edge. Returns the commands inside and outside
 * (each may hold several sub-strokes, started with a move), or undefined when empty.
 * A segment is cut at every crossing, also when both its ends are outside.
 */
export function splitStroke(points: PathCommand[], polygon: SketchPoint[]): { inside?: PathCommand[]; outside?: PathCommand[] } {
    const sides = { inside: [] as PathCommand[], outside: [] as PathCommand[] };
    // the side the pen is currently drawing on, if any
    let current: "inside" | "outside" | undefined;
    let prev: SketchPoint | undefined;

    const lineTo = (side: "inside" | "outside", from: SketchPoint, to: SketchPoint) => {
        if (current !== side) sides[side].push([VERB_MOVE, from[0], from[1]] as any);
        sides[side].push([VERB_LINE, to[0], to[1]] as any);
        current = side;
    };

    for (const cmd of points) {
        const [verb, x, y] = cmd as unknown as [number, number, number];
        const pt: SketchPoint = [x, y];
        if (verb === VERB_MOVE || !prev) {
            // a new sub-stroke: starts where it is (a dot stays a dot)
            current = isPointInPolygon(x, y, polygon) ? "inside" : "outside";
            sides[current].push([VERB_MOVE, x, y] as any);
        } else {
            const ts = [0, ...edgeCrossings(prev, pt, polygon), 1];
            for (let k = 1; k < ts.length; k++) {
                const at = (t: number): SketchPoint => [prev![0] + (pt[0] - prev![0]) * t, prev![1] + (pt[1] - prev![1]) * t];
                const from = at(ts[k - 1]), to = at(ts[k]);
                const mid = at((ts[k - 1] + ts[k]) / 2);
                lineTo(isPointInPolygon(mid[0], mid[1], polygon) ? "inside" : "outside", from, to);
            }
        }
        prev = pt;
    }
    // a sub-stroke start that never drew a line on its side is a lone move: drop it
    const verbAt = (cmds: PathCommand[], i: number) => cmds[i][0] as unknown as number;
    const clean = (cmds: PathCommand[]) => cmds.filter((_, i) =>
        verbAt(cmds, i) !== VERB_MOVE || (i + 1 < cmds.length && verbAt(cmds, i + 1) === VERB_LINE));
    const inside = clean(sides.inside), outside = clean(sides.outside);
    return {
        inside: inside.length ? inside : undefined,
        outside: outside.length ? outside : undefined,
    };
}

export function textCenter(t: SketchText): SketchPoint {
    const w = t.width ?? 0;
    const h = t.height ?? t.fontSize ?? 0;
    return [t.rtl ? t.x - w / 2 : t.x + w / 2, t.y + h / 2];
}

export interface CutPlan {
    // annotations that move into the piece, as they are
    takePaths: string[];
    takeTexts: string[];
    takeImages: string[];
    // strokes crossing the edge: replaced by their parts outside (where they were) and inside (the new piece)
    splitPaths: { from: string; outside?: SketchPath; inside?: SketchPath }[];
    // pieces under the cut: they get a hole (relative to the piece), or are taken whole when fully inside
    cutPieces: { id: string; hole: SketchPoint[] }[];
    absorbPieces: string[];
}

/**
 * What a cut takes - everything seen inside it, on the page and on pieces. Strokes fully
 * inside are taken, crossing strokes are split at the edge, texts and inserted images go
 * with the new piece when their center is inside. Pieces under the cut get a hole; a piece
 * fully inside is taken whole (its paper is in the new piece's image).
 */
export function planCut(polygon: SketchPoint[], paths: SketchPath[], texts: SketchText[], images: SketchImage[],
    newId: (prefix: string) => string): CutPlan {
    const plan: CutPlan = { takePaths: [], takeTexts: [], takeImages: [], splitPaths: [], cutPieces: [], absorbPieces: [] };
    for (const piece of images.filter(isPiece)) {
        const outline = pieceOutline(piece);
        if (outline.every(([x, y]) => isPointInPolygon(x, y, polygon))) {
            plan.absorbPieces.push(piece.id);
        } else if (polygonsOverlap(outline, polygon)) {
            plan.cutPieces.push({ id: piece.id, hole: polygon.map(([x, y]) => [x - piece.x, y - piece.y]) });
        }
    }
    for (const p of paths) {
        const { inside, outside } = splitStroke(p.points, polygon);
        if (!inside) continue;
        if (!outside) {
            plan.takePaths.push(p.id);
        } else {
            const base = { color: p.color, strokeWidth: p.strokeWidth, isMarker: p.isMarker };
            plan.splitPaths.push({
                from: p.id,
                outside: { ...base, id: newId("S"), points: outside },
                inside: { ...base, id: newId("S"), points: inside },
            });
        }
    }
    for (const t of texts) {
        if (t.tableId) continue;
        const [cx, cy] = textCenter(t);
        if (isPointInPolygon(cx, cy, polygon)) plan.takeTexts.push(t.id);
    }
    for (const img of images) {
        if (isPiece(img)) continue;
        if (isPointInPolygon(img.x + img.width / 2, img.y + img.height / 2, polygon)) plan.takeImages.push(img.id);
    }
    return plan;
}

export const cutPlanIsEmpty = (plan: CutPlan) =>
    !plan.takePaths.length && !plan.takeTexts.length && !plan.takeImages.length && !plan.splitPaths.length &&
    !plan.cutPieces.length && !plan.absorbPieces.length;

export function shiftPoints(points: PathCommand[], dx: number, dy: number): PathCommand[] {
    return points.map(c => [c[0], c[1] + dx, c[2] + dy] as any);
}

// ---------------------------------------------------------------------------------------
//                                  Drawing order
// ---------------------------------------------------------------------------------------

export type DrawItem = { path: SketchPath; overlay?: undefined } | { overlay: SketchOverlay; path?: undefined };

export type DrawLayer =
    // base paper ink and paint between two pieces; `erasers` are later erasers and cuts that also clear it
    | { piece?: undefined; items: DrawItem[]; erasers: DrawItem[] }
    // a piece: its paper image, then its own paint and ink (its erasers clear only these)
    | { piece: SketchImage; items: DrawItem[]; erasers?: undefined };

const itemZ = (it: DrawItem) => (it.path ?? it.overlay)!.z ?? 0;
const isClearing = (it: DrawItem) => it.overlay ? it.overlay.kind === "cut" : isEraserPath(it.path!);

/**
 * Orders the sketch layer: base items in z order, split by the pieces lying on top of them.
 * An eraser or cut clears base items drawn before it, also in earlier layers.
 */
export function buildDrawLayers(paths: SketchPath[] | undefined, overlays: SketchOverlay[] | undefined,
    images: SketchImage[] | undefined): DrawLayer[] {
    const items: DrawItem[] = [
        ...(paths ?? []).map(path => ({ path })),
        ...(overlays ?? []).map(overlay => ({ overlay })),
    ];
    // stable sort: equal z keeps paths before overlays, as listed
    const byZ = (a: DrawItem, b: DrawItem) => itemZ(a) - itemZ(b);
    const pieces = (images ?? []).filter(isPiece).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
    const ownerOf = (it: DrawItem) => (it.path ?? it.overlay)!.pieceId;
    const pieceIds = new Set(pieces.map(p => p.id));
    const base = items.filter(it => !ownerOf(it) || !pieceIds.has(ownerOf(it)!)).sort(byZ);

    const layers: DrawLayer[] = [];
    let start = 0;
    const pushBase = (end: number) => {
        const slice = base.slice(start, end);
        if (slice.length) {
            const maxZ = itemZ(slice[slice.length - 1]);
            layers.push({ items: slice, erasers: base.slice(end).filter(it => isClearing(it) && itemZ(it) > maxZ) });
        }
        start = end;
    };
    for (const piece of pieces) {
        let end = start;
        while (end < base.length && itemZ(base[end]) < (piece.z ?? 0)) end++;
        pushBase(end);
        layers.push({ piece, items: items.filter(it => ownerOf(it) === piece.id).sort(byZ) });
    }
    pushBase(base.length);
    return layers;
}
