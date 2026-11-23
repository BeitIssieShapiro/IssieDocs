// Offscreen rendering of a page with Skia, used by the Fill and Cut tools.
// All element coordinates are normalized (bg image pixels); on screen they are
// multiplied by `ratio` (view points). Rasters are rendered at `scale` pixels per view point.

import {
    AlphaType, BlendMode, ClipOp, ColorType, ImageFormat, PaintStyle, PathOp, PathVerb,
    Skia, SkCanvas, SkImage, SkPath, SkRect,
} from "@shopify/react-native-skia";
import { SketchImage, SketchLine, SketchOverlay, SketchPath, SketchPoint } from "./types";
import { computeFillRegion, gapConnectors } from "./flood-fill";
import { buildDrawLayers, DrawItem, isEraserPath, isPiece, pieceHoles, pieceOutline } from "./pieces";

const FILL_GAP_POINTS = 8; // shapes with openings up to ~2x this are considered closed
const FILL_STROKE_END_GAP_POINTS = 30; // a pen stroke ending this close to a stroke is treated as connected
const FILL_TOLERANCE = 70;
const FILL_MAX_PIXELS = 2_500_000;
const MIN_VISIBLE_CHANGE_POINTS = 16; // area (pt^2) a fill/cut must visibly change to be kept
const COLOR_DIFF = 24;

export interface PageSnapshot {
    bgUri?: string;
    hasPhotoBg: boolean;
    canvasWidth: number; // view points
    canvasHeight: number;
    bgHeight: number;
    ratio: number;
    paths: SketchPath[];
    overlays: SketchOverlay[];
    lines: SketchLine[];
    tables: { color: string; strokeWidth: number; verticalLines: number[]; horizontalLines: number[] }[];
    images: SketchImage[];
}

export interface NormRect { x: number; y: number; width: number; height: number }

const isEraser = (color: string) => color === "#00000000";

// Closed polygon through normalized points, multiplied by `scale`
export function polygonPath(points: SketchPoint[], scale: number): SkPath {
    const path = Skia.Path.Make();
    points.forEach(([x, y], i) => i == 0 ? path.moveTo(x * scale, y * scale) : path.lineTo(x * scale, y * scale));
    path.close();
    return path;
}

/** A piece's paper: its outline minus its holes, at position (x, y), multiplied by `scale` */
export function pieceClipPath(piece: SketchImage, scale: number, x = piece.x, y = piece.y): SkPath {
    const path = polygonPath(pieceOutline(piece, x, y), scale);
    for (const hole of pieceHoles(piece, x, y)) {
        path.op(polygonPath(hole, scale), PathOp.Difference);
    }
    return path;
}

export function cutShapePath(cut: SketchOverlay, ratio: number): SkPath {
    if (cut.points && cut.points.length > 2) return polygonPath(cut.points, ratio);
    const path = Skia.Path.Make();
    path.addRect(Skia.XYWHRect(cut.x * ratio, cut.y * ratio, cut.width * ratio, cut.height * ratio));
    return path;
}

function toFileUri(uri: string) {
    return uri.startsWith("/") ? "file://" + uri : uri;
}

const uriImageCache = new Map<string, SkImage>();
const uriImageLoading = new Set<string>();

// Returns the image if already loaded, otherwise starts loading it and calls onLoaded when ready
export function getUriImage(uri: string, onLoaded: () => void): SkImage | null {
    const img = uriImageCache.get(toFileUri(uri));
    if (img) return img;
    if (!uriImageLoading.has(uri)) {
        uriImageLoading.add(uri);
        loadImage(uri).then(loaded => loaded && onLoaded()).finally(() => uriImageLoading.delete(uri));
    }
    return null;
}

async function loadImage(uri: string): Promise<SkImage | undefined> {
    const key = toFileUri(uri);
    let img = uriImageCache.get(key);
    if (!img) {
        const data = await Skia.Data.fromURI(key).catch(() => undefined);
        img = data && Skia.Image.MakeImageFromEncoded(data) || undefined;
        if (!img) return undefined;
        if (uriImageCache.size > 50) uriImageCache.clear();
        uriImageCache.set(key, img);
    }
    return img;
}

const overlayImageCache = new Map<string, SkImage>();
export function getOverlayImage(overlay: SketchOverlay): SkImage | null {
    if (!overlay.imageData) return null;
    let img = overlayImageCache.get(overlay.id);
    if (!img) {
        img = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBase64(overlay.imageData)) || undefined;
        if (!img) return null;
        overlayImageCache.set(overlay.id, img);
    }
    return img;
}

function drawImageAt(canvas: SkCanvas, img: SkImage, dst: SkRect) {
    canvas.drawImageRect(img, Skia.XYWHRect(0, 0, img.width(), img.height()), dst, Skia.Paint());
}

function readRGBA(image: SkImage): Uint8Array | undefined {
    const pixels = image.readPixels(0, 0, {
        width: image.width(), height: image.height(),
        colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul,
    });
    return pixels instanceof Uint8Array ? pixels : undefined;
}

const differs = (px: Uint8Array, i: number, r: number, g: number, b: number) =>
    Math.abs(px[i] - r) > COLOR_DIFF || Math.abs(px[i + 1] - g) > COLOR_DIFF || Math.abs(px[i + 2] - b) > COLOR_DIFF;

interface RenderOptions {
    includeBg: boolean;
    includeVectors: boolean; // rulers, tables, inserted images
    // all: ink, paint and pieces as on screen. paper: the base paper's paint and holes only (what a cut takes)
    sketch: "all" | "paper";
    clip?: SketchPoint[]; // lasso polygon, normalized
}

const isPenStroke = (p: SketchPath) => !p.isMarker && p.color.length <= 7;

function strokePaint(p: SketchPath) {
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(p.strokeWidth);
    paint.setColor(Skia.Color(isEraserPath(p) ? "black" : p.color));
    if (isEraserPath(p)) paint.setBlendMode(BlendMode.DstOut);
    return paint;
}

function strokePath(p: SketchPath, r: number) {
    const path = Skia.Path.Make();
    for (const [verb, x, y] of p.points) {
        if (verb == PathVerb.Move) path.moveTo(x * r, y * r);
        else if (verb == PathVerb.Line) path.lineTo(x * r, y * r);
    }
    return path;
}

// One item of the sketch layer. `ink: false` skips strokes but keeps erasers (they clear paint too)
function drawItem(canvas: SkCanvas, it: DrawItem, r: number, ink: boolean) {
    if (it.path) {
        if (!ink && !isEraserPath(it.path)) return;
        canvas.drawPath(strokePath(it.path, r), strokePaint(it.path));
        return;
    }
    const o = it.overlay!;
    if (o.kind === "cut") {
        const clear = Skia.Paint();
        clear.setBlendMode(BlendMode.DstOut);
        canvas.drawPath(cutShapePath(o, r), clear);
    } else {
        const img = getOverlayImage(o);
        if (img) drawImageAt(canvas, img, Skia.XYWHRect(o.x * r, o.y * r, o.width * r, o.height * r));
    }
}

// The sketch layer as the on-screen canvas draws it (see buildDrawLayers).
// paperOnly: what a cut takes as its image - paper and paint, of the page and of pieces, without ink
async function drawSketch(canvas: SkCanvas, page: PageSnapshot, r: number, paperOnly: boolean) {
    for (const layer of buildDrawLayers(page.paths, page.overlays, page.images)) {
        if (layer.piece) {
            const piece = layer.piece;
            const clip = pieceClipPath(piece, r);
            const img = piece.src?.uri ? await loadImage(piece.src.uri) : undefined;
            if (img) {
                canvas.save();
                canvas.clipPath(clip, ClipOp.Intersect, true);
                drawImageAt(canvas, img, Skia.XYWHRect(piece.x * r, piece.y * r, piece.width * r, piece.height * r));
                canvas.restore();
            }
            canvas.saveLayer();
            for (const it of layer.items) {
                const isFill = it.overlay?.kind === "fill";
                if (isFill) {
                    canvas.save();
                    canvas.clipPath(clip, ClipOp.Intersect, true);
                }
                drawItem(canvas, it, r, !paperOnly);
                if (isFill) canvas.restore();
            }
            canvas.restore();
        } else {
            canvas.saveLayer();
            [...layer.items, ...layer.erasers].forEach(it => drawItem(canvas, it, r, !paperOnly));
            canvas.restore();
        }
    }
}

function makeSurface(rect: SkRect, scale: number) {
    const w = Math.max(1, Math.round(rect.width * scale));
    const h = Math.max(1, Math.round(rect.height * scale));
    const surface = Skia.Surface.Make(w, h);
    if (!surface) return undefined;
    const canvas = surface.getCanvas();
    canvas.scale(scale, scale);
    canvas.translate(-rect.x, -rect.y);
    canvas.clear(Skia.Color("transparent"));
    return { surface, canvas };
}

// Renders the page area `rect` (view points) into an offscreen image
async function renderPage(page: PageSnapshot, rect: SkRect, scale: number, opts: RenderOptions): Promise<SkImage | undefined> {
    const r = page.ratio;
    const made = makeSurface(rect, scale);
    if (!made) return undefined;
    const { surface, canvas } = made;
    if (opts.clip) canvas.clipPath(polygonPath(opts.clip, r), ClipOp.Intersect, true);
    if (opts.includeBg) canvas.drawColor(Skia.Color("white"));

    const white = Skia.Paint();
    white.setColor(Skia.Color("white"));

    if (opts.includeBg) {
        if (page.bgUri) {
            const bg = await loadImage(page.bgUri);
            if (bg) drawImageAt(canvas, bg, Skia.XYWHRect(0, 0, page.canvasWidth, page.bgHeight));
        }
        if (page.hasPhotoBg) {
            page.overlays.filter(o => o.kind === "cut").forEach(c => canvas.drawPath(cutShapePath(c, r), white));
        }
    }

    await drawSketch(canvas, page, r, opts.sketch === "paper");

    if (opts.includeVectors) {
        const stroke = (color: string, width: number) => {
            const paint = Skia.Paint();
            paint.setAntiAlias(true);
            paint.setStyle(PaintStyle.Stroke);
            paint.setStrokeWidth(width);
            paint.setColor(Skia.Color(color));
            return paint;
        };
        for (const line of page.lines) {
            canvas.drawLine(line.from[0] * r, line.from[1] * r, line.to[0] * r, line.to[1] * r, stroke(line.color, line.strokeWidth));
        }
        for (const t of page.tables) {
            const paint = stroke(t.color, t.strokeWidth);
            const left = t.verticalLines[0] * r, right = t.verticalLines[t.verticalLines.length - 1] * r;
            const top = t.horizontalLines[0] * r, bottom = t.horizontalLines[t.horizontalLines.length - 1] * r;
            t.horizontalLines.forEach(y => canvas.drawLine(left, y * r, right, y * r, paint));
            t.verticalLines.forEach(x => canvas.drawLine(x * r, top, x * r, bottom, paint));
        }
    }

    surface.flush();
    return surface.makeImageSnapshot();
}

/**
 * The boundaries a fill stops at, black on white: the pen strokes of the paper being filled
 * (the base page, or one piece). Filling the base page, pieces are walls; filling a piece,
 * everything outside its outline is.
 */
async function renderFillBoundary(page: PageSnapshot, pieceId: string | undefined, scale: number): Promise<SkImage | undefined> {
    const r = page.ratio;
    const made = makeSurface(Skia.XYWHRect(0, 0, page.canvasWidth, page.canvasHeight), scale);
    if (!made) return undefined;
    const { surface, canvas } = made;
    canvas.drawColor(Skia.Color("white"));
    const black = Skia.Paint();
    black.setColor(Skia.Color("black"));
    const pieces = page.images.filter(isPiece);
    const target = pieceId ? pieces.find(p => p.id === pieceId) : undefined;

    if (target) {
        const outside = Skia.Path.Make();
        outside.addRect(Skia.XYWHRect(0, 0, page.canvasWidth, page.canvasHeight));
        outside.op(pieceClipPath(target, r), PathOp.Difference); // the page minus the piece's paper
        canvas.drawPath(outside, black);
    }

    const owned = (e: { pieceId?: string | null }) => (e.pieceId ?? undefined) === (target?.id ?? undefined);
    const paths = page.paths.filter(owned).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
    canvas.saveLayer();
    for (const p of paths) {
        if (!isPenStroke(p) && !isEraserPath(p)) continue;
        canvas.drawPath(strokePath(p, r), strokePaint(p));
    }
    canvas.restore();

    // close almost-closed drawings with invisible connectors between stroke ends and nearby strokes

    const strokes: [number, number][][] = [];
    for (const p of paths) {
        if (!isPenStroke(p)) continue;
        p.points.forEach(([verb, x, y], i) => {
            if (verb == PathVerb.Move || i == 0) strokes.push([]);
            strokes[strokes.length - 1].push([x * r, y * r]);
        });
    }
    const connector = Skia.Paint();
    connector.setAntiAlias(true);
    connector.setStyle(PaintStyle.Stroke);
    connector.setStrokeWidth(3);
    connector.setColor(Skia.Color("black"));
    for (const [a, b] of gapConnectors(strokes, FILL_STROKE_END_GAP_POINTS)) {
        canvas.drawLine(a[0], a[1], b[0], b[1], connector);
    }

    if (!target) {
        // pieces lie on the base paper: its paint does not flow under them
        pieces.forEach(p => canvas.drawPath(pieceClipPath(p, r), black));
    }

    surface.flush();
    return surface.makeImageSnapshot();
}

/**
 * Computes a paint-bucket fill at `point` (normalized coords), bounded by pen strokes only.
 * Returns the fill element (normalized coords) or undefined if the area is not enclosed.
 */
export async function computeFill(page: PageSnapshot, point: [number, number], color: string, pixelRatio: number,
    pieceId?: string): Promise<Omit<SketchOverlay, "id" | "kind"> | undefined> {
    const area = page.canvasWidth * page.canvasHeight;
    const scale = Math.min(pixelRatio, 2, Math.sqrt(FILL_MAX_PIXELS / area));
    const snapshot = await renderFillBoundary(page, pieceId, scale);
    if (!snapshot) return undefined;
    const pixels = readRGBA(snapshot);
    if (!pixels) return undefined;

    const w = snapshot.width(), h = snapshot.height();
    const region = computeFillRegion(pixels, w, h, point[0] * page.ratio * scale, point[1] * page.ratio * scale, {
        gap: Math.max(1, Math.round(FILL_GAP_POINTS * scale)),
        tolerance: FILL_TOLERANCE,
    });
    if (!region) return undefined;

    const c = Skia.Color(color); // Float32Array rgba 0..1
    const [cr, cg, cb] = [c[0], c[1], c[2]].map(v => Math.round(v * 255));

    // Skip fills that would not visibly change the page as currently shown (with existing fills),
    // e.g. re-filling a shape with the same color, or a tiny enclosed speck
    const current = await renderPage(page, Skia.XYWHRect(region.x / scale, region.y / scale, region.width / scale, region.height / scale),
        scale, { includeBg: true, includeVectors: true, sketch: "all" });
    const currentPixels = current && readRGBA(current);
    if (currentPixels && current.width() === region.width && current.height() === region.height) {
        let changed = 0;
        for (let i = 0; i < region.mask.length; i++) {
            if (region.mask[i] && differs(currentPixels, i * 4, cr, cg, cb)) changed++;
        }
        if (changed < MIN_VISIBLE_CHANGE_POINTS * scale * scale) return undefined;
    }

    const rgba = new Uint8Array(region.width * region.height * 4);
    for (let i = 0; i < region.mask.length; i++) {
        if (!region.mask[i]) continue;
        rgba[i * 4] = cr;
        rgba[i * 4 + 1] = cg;
        rgba[i * 4 + 2] = cb;
        rgba[i * 4 + 3] = 255;
    }
    const maskImage = Skia.Image.MakeImage(
        { width: region.width, height: region.height, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul },
        Skia.Data.fromBytes(rgba), region.width * 4);
    if (!maskImage) return undefined;

    const toNorm = scale * page.ratio;
    return {
        x: region.x / toNorm,
        y: region.y / toNorm,
        width: region.width / toNorm,
        height: region.height / toNorm,
        color,
        imageData: maskImage.encodeToBase64(ImageFormat.PNG),
    };
}

/**
 * Captures the base paper inside `rect` (normalized coords), clipped to the lasso polygon if given:
 * the background with its paint, without ink - ink moves into the piece as it is.
 * Rectangles on a photo background yield an opaque jpeg, others a transparent png.
 * `hasContent`: whether anything visible (not white) was captured.
 */
export async function capturePiece(page: PageSnapshot, rect: NormRect, pixelRatio: number, lasso?: SketchPoint[])
    : Promise<{ base64: string; ext: string; hasContent: boolean } | undefined> {
    const r = page.ratio;
    const scale = Math.min(pixelRatio, 3);
    const image = await renderPage(page, Skia.XYWHRect(rect.x * r, rect.y * r, rect.width * r, rect.height * r),
        scale, { includeBg: page.hasPhotoBg, includeVectors: false, sketch: "paper", clip: lasso });
    if (!image) return undefined;

    let hasContent = true;
    const pixels = readRGBA(image);
    if (pixels) {
        let content = 0;
        for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] > 32 && differs(pixels, i, 255, 255, 255)) content++;
        }
        hasContent = content >= MIN_VISIBLE_CHANGE_POINTS * scale * scale;
    }
    const encoded = page.hasPhotoBg && !lasso ?
        { base64: image.encodeToBase64(ImageFormat.JPEG, 90), ext: "jpg" } :
        { base64: image.encodeToBase64(ImageFormat.PNG), ext: "png" };
    return { ...encoded, hasContent };
}
