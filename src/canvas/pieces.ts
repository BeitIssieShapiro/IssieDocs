// Paper pieces: the model behind the cut (select) tool.
//
// A page is base paper plus pieces cut out of it. A piece is a crop of the paper (an image)
// plus the annotations that belong to it (pieceId): they move, copy and delete with it.
// An imported image is a piece too: paper glued on the page. Drawing order is by z (queue
// position): whatever was touched last is on top. Inside a piece: its paper, then its paint
// and ink. Texts are drawn above the sketch layer, as before.
//
// Coordinates are normalized (background image pixels), as everywhere in the canvas.

import type { PathCommand } from "@shopify/react-native-skia";
import { SketchImage, SketchOverlay, SketchPath, SketchPoint, SketchText } from "./types";
import { isPointInPolygon, isPointOnImage } from "./utils";

const VERB_MOVE = 0; // PathVerb.Move
const VERB_LINE = 1; // PathVerb.Line

// Every image is a piece: cut out of the page (isCutPiece) or imported.

export const ERASER_COLOR = "#00000000";
export const isEraserPath = (p: SketchPath) => p.color === ERASER_COLOR;

/** Whether an element belongs to the piece (undefined/null: the page) */
export const ownedBy = (e: { pieceId?: string | null }, pieceId?: string | null) => (e.pieceId ?? undefined) === (pieceId ?? undefined);

/** Orders by drawing order (z) */
export const byZ = (a: { z?: number }, b: { z?: number }) => (a.z ?? 0) - (b.z ?? 0);

type Box = { x: number; y: number; width: number; height: number };
const boxesOverlap = (a: Box, b: Box) =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** The bounding box of a stroke's points */
function strokeBox(points: PathCommand[]): Box {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of points) {
        const x = c[1] as unknown as number, y = c[2] as unknown as number;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

function polygonBox(polygon: SketchPoint[]): Box {
    return strokeBox(polygon.map(([x, y]) => [VERB_LINE, x, y] as unknown as PathCommand));
}

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
        if (isPointOnPiece(img, x, y) && (!top || (img.z ?? 0) >= (top.z ?? 0))) top = img;
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

/**
 * A stroke drawn across pieces is divided like the paper under it: each part belongs to the
 * topmost piece it lies on (pieceId), the rest to the page (no pieceId). Holes show what is under them.
 */
export function splitStrokeByPieces(points: PathCommand[], images: SketchImage[] | undefined): { pieceId?: string; points: PathCommand[] }[] {
    const parts: { pieceId?: string; points: PathCommand[] }[] = [];
    let rest: PathCommand[] | undefined = points;
    // top first; only pieces the stroke can reach (touching boxes count: a stroke along an edge)
    const box = strokeBox(points);
    const reach = { x: box.x - 1, y: box.y - 1, width: box.width + 2, height: box.height + 2 };
    const pieces = (images ?? []).filter(img => boxesOverlap(reach, img)).sort((a, b) => byZ(b, a));
    for (const piece of pieces) {
        if (!rest) break;
        const split = splitStroke(rest, pieceOutline(piece));
        let onPiece = split.inside;
        const others: PathCommand[][] = split.outside ? [split.outside] : [];
        for (const hole of pieceHoles(piece)) {
            if (!onPiece) break;
            const h = splitStroke(onPiece, hole);
            if (h.inside) others.push(h.inside); // through the hole: what is below gets it
            onPiece = h.outside;
        }
        if (onPiece) parts.push({ pieceId: piece.id, points: onPiece });
        rest = others.length ? others.flat() : undefined;
    }
    if (rest) parts.push({ points: rest });
    if (!parts.length && points.length) {
        // a dot (nothing to divide): it belongs to the paper it is on
        const [, x, y] = points[0] as unknown as [number, number, number];
        const piece = topPieceAt(images, x, y);
        return [{ ...(piece ? { pieceId: piece.id } : {}), points }];
    }
    return parts;
}

/** The text's box (an rtl text's x is its right edge) */
export function textBox(t: SketchText) {
    const width = t.width ?? 0;
    return { x: t.rtl ? t.x - width : t.x, y: t.y, width, height: t.height ?? t.fontSize ?? 0 };
}

/**
 * The text seen at a point with the select tool: a text is hidden where a piece laid over it is
 * (a piece above the paper it is on).
 */
export function visibleTextAt(texts: SketchText[] | undefined, images: SketchImage[] | undefined, x: number, y: number,
    margin = 0): SketchText | undefined {
    const top = topPieceAt(images, x, y);
    const zOf = (t: SketchText) => t.pieceId ? (images?.find(i => i.id === t.pieceId)?.z ?? t.z ?? 0) : (t.z ?? 0);
    let found: SketchText | undefined;
    for (const t of texts ?? []) {
        if (t.tableId) continue;
        const b = textBox(t);
        if (x < b.x - margin || x > b.x + b.width + margin || y < b.y - margin || y > b.y + b.height + margin) continue;
        if (top && top.id !== t.pieceId && (top.z ?? 0) > zOf(t)) continue;
        found = t;
    }
    return found;
}

export function textCenter(t: SketchText): SketchPoint {
    const b = textBox(t);
    return [b.x + b.width / 2, b.y + b.height / 2];
}

export interface CutPlan {
    // annotations that move into the piece, as they are
    takePaths: string[];
    takeTexts: string[];
    // strokes crossing the edge: replaced by their parts outside (where they were) and inside (the new piece)
    splitPaths: { from: string; outside?: SketchPath; inside?: SketchPath }[];
    // pieces under the cut: they get a hole (relative to the piece), or are taken whole when fully inside
    cutPieces: { id: string; hole: SketchPoint[] }[];
    absorbPieces: string[];
}

/**
 * What a cut takes - everything seen inside it, on the page and on pieces. Strokes fully
 * inside are taken, crossing strokes are split at the edge, texts go with the new piece when
 * their center is inside. Pieces (and imported images) under the cut get a hole; a piece fully
 * inside is taken whole (its paper is in the new piece's image).
 */
export function planCut(polygon: SketchPoint[], paths: SketchPath[], texts: SketchText[], images: SketchImage[],
    newId: (prefix: string) => string): CutPlan {
    const plan: CutPlan = { takePaths: [], takeTexts: [], splitPaths: [], cutPieces: [], absorbPieces: [] };
    const area = polygonBox(polygon);
    for (const piece of images) {
        if (!boxesOverlap(area, piece)) continue;
        const outline = pieceOutline(piece);
        if (outline.every(([x, y]) => isPointInPolygon(x, y, polygon))) {
            plan.absorbPieces.push(piece.id);
        } else if (polygonsOverlap(outline, polygon)) {
            plan.cutPieces.push({ id: piece.id, hole: polygon.map(([x, y]) => [x - piece.x, y - piece.y]) });
        }
    }
    for (const p of paths) {
        const b = strokeBox(p.points);
        if (b.x > area.x + area.width || b.x + b.width < area.x || b.y > area.y + area.height || b.y + b.height < area.y) continue;
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
    return plan;
}

export const cutPlanIsEmpty = (plan: CutPlan) =>
    !plan.takePaths.length && !plan.takeTexts.length && !plan.splitPaths.length &&
    !plan.cutPieces.length && !plan.absorbPieces.length;

export function shiftPoints(points: PathCommand[], dx: number, dy: number): PathCommand[] {
    return points.map(c => [c[0], c[1] + dx, c[2] + dy] as any);
}

/** Points scaled around (ox, oy) */
export function scalePoints(points: PathCommand[], ox: number, oy: number, sx: number, sy: number): PathCommand[] {
    return points.map(c => [c[0], ox + (c[1] - ox) * sx, oy + (c[2] - oy) * sy] as any);
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
    const byItemZ = (a: DrawItem, b: DrawItem) => itemZ(a) - itemZ(b);
    const pieces = [...(images ?? [])].sort(byZ);
    // each piece's own items; the rest (no owner, or an owner that is gone) is the base paper's
    const owned = new Map<string, DrawItem[]>(pieces.map(p => [p.id, []]));
    const base: DrawItem[] = [];
    for (const it of items) {
        const owner = (it.path ?? it.overlay)!.pieceId;
        (owner && owned.get(owner) || base).push(it);
    }
    base.sort(byItemZ);

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
        layers.push({ piece, items: owned.get(piece.id)!.sort(byItemZ) });
    }
    pushBase(base.length);
    return layers;
}

// ---------------------------------------------------------------------------------------
//                          Texts between pieces
// ---------------------------------------------------------------------------------------

/** The most canvases the drawing is split into, to put texts under pieces laid over them */
export const MAX_CANVASES = 3;

export interface Stack {
    // the draw layers, split into canvases drawn bottom to top
    canvases: DrawLayer[][];
    // the canvas each text is drawn right under (canvases.length: above them all)
    textLevel: Map<string, number>;
}

/**
 * Like paper: a piece put down (or moved) after a text, over it, covers it. Ink stays under texts.
 * A text on a piece lies on it and is covered only by pieces laid over that piece.
 * `onTop`: texts drawn above everything (e.g. the one being edited).
 */
export function stackTexts(layers: DrawLayer[], texts: SketchText[] | undefined, onTop?: string): Stack {
    const pieceIndex = new Map<string, number>();
    layers.forEach((l, i) => l.piece && pieceIndex.set(l.piece.id, i));
    const layerZ = (l: DrawLayer) => l.piece ? (l.piece.z ?? 0) : itemZ(l.items[0]);

    // for each text: the first layer that covers it
    const cover = new Map<string, number>();
    for (const t of texts ?? []) {
        if (t.tableId || t.id === onTop) continue;
        const owner = t.pieceId ? pieceIndex.get(t.pieceId) : undefined;
        // where the text lies: on its piece, or among the layers by when it was written
        let at = owner ?? -1;
        if (owner === undefined) layers.forEach((l, i) => { if (layerZ(l) < (t.z ?? 0)) at = i; });
        const box = textBox(t);
        for (let i = at + 1; i < layers.length; i++) {
            const p = layers[i].piece;
            if (p && boxesOverlap(box, p)) { cover.set(t.id, i); break; }
        }
    }

    // split where texts get covered: the lowest few, a text covered later goes under the split before it
    const splits = [...new Set(cover.values())].sort((a, b) => a - b).slice(0, MAX_CANVASES - 1);
    const bounds = [0, ...splits, layers.length];
    const canvases = bounds.slice(1).map((end, k) => layers.slice(bounds[k], end));
    const textLevel = new Map<string, number>();
    for (const t of texts ?? []) {
        const c = cover.get(t.id);
        textLevel.set(t.id, c === undefined ? canvases.length : splits.filter(s => s <= c).length);
    }
    return { canvases, textLevel };
}
