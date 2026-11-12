// Offscreen rendering of a page with Skia, used by the Fill and Cut tools.
// All element coordinates are normalized (bg image pixels); on screen they are
// multiplied by `ratio` (view points). Rasters are rendered at `scale` pixels per view point.

import {
    AlphaType, BlendMode, ClipOp, ColorType, ImageFormat, PaintStyle, PathVerb,
    Skia, SkCanvas, SkImage, SkPath, SkRect,
} from "@shopify/react-native-skia";
import { SketchImage, SketchLine, SketchOverlay, SketchPath, SketchPoint } from "./types";
import { computeFillRegion, gapConnectors } from "./flood-fill";

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
    includeFills: boolean;
    includeVectors: boolean; // rulers, tables, inserted images
    clip?: SketchPoint[]; // lasso polygon, normalized
    penOnly?: boolean; // only pen strokes (and erasers/cuts applied to them), on white - the fill boundaries
}

// Renders the page area `rect` (view points) into an offscreen image
async function renderPage(page: PageSnapshot, rect: SkRect, scale: number, opts: RenderOptions): Promise<SkImage | undefined> {
    const r = page.ratio;
    const w = Math.max(1, Math.round(rect.width * scale));
    const h = Math.max(1, Math.round(rect.height * scale));
    const surface = Skia.Surface.Make(w, h);
    if (!surface) return undefined;
    const canvas = surface.getCanvas();
    canvas.scale(scale, scale);
    canvas.translate(-rect.x, -rect.y);
    canvas.clear(Skia.Color("transparent"));
    if (opts.clip) canvas.clipPath(polygonPath(opts.clip, r), ClipOp.Intersect, true);
    if (opts.includeBg || opts.penOnly) canvas.drawColor(Skia.Color("white"));

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

    if (opts.includeVectors) {
        for (const image of page.images.filter(i => !i.isCutPiece)) {
            const img = image.src?.uri ? await loadImage(image.src.uri) : undefined;
            if (img) drawImageAt(canvas, img, Skia.XYWHRect(image.x * r, image.y * r, image.width * r, image.height * r));
        }
    }

    // Sketch layer - mirrors the on-screen Skia canvas (eraser/cut clear only this layer)
    const pieceImages = new Map<string, SkImage>();
    for (const o of page.overlays) {
        const img = o.kind === "piece" && o.src && !opts.penOnly ? await loadImage(o.src) : undefined;
        if (img) pieceImages.set(o.id, img);
    }
    canvas.saveLayer();
    const clear = Skia.Paint();
    clear.setBlendMode(BlendMode.DstOut);
    const drawOverlays = (afterPath: number) => {
        for (const o of page.overlays) {
            if (o.afterPath !== afterPath) continue;
            const dst = Skia.XYWHRect(o.x * r, o.y * r, o.width * r, o.height * r);
            if (o.kind === "cut") {
                canvas.drawPath(cutShapePath(o, r), clear);
            } else if (o.kind === "piece") {
                const img = pieceImages.get(o.id);
                if (img) drawImageAt(canvas, img, dst);
            } else if (opts.includeFills) {
                const img = getOverlayImage(o);
                if (img) drawImageAt(canvas, img, dst);
            }
        }
    };
    page.paths.forEach((p, i) => {
        drawOverlays(i);
        if (opts.penOnly && (p.isMarker || p.color.length > 7) && !isEraser(p.color)) return;
        const path = Skia.Path.Make();
        for (const [verb, x, y] of p.points) {
            if (verb == PathVerb.Move) path.moveTo(x * r, y * r);
            else if (verb == PathVerb.Line) path.lineTo(x * r, y * r);
        }
        const paint = Skia.Paint();
        paint.setAntiAlias(true);
        paint.setStyle(PaintStyle.Stroke);
        paint.setStrokeWidth(p.strokeWidth);
        paint.setColor(Skia.Color(isEraser(p.color) ? "black" : p.color));
        if (isEraser(p.color)) paint.setBlendMode(BlendMode.DstOut);
        canvas.drawPath(path, paint);
    });
    drawOverlays(page.paths.length);
    canvas.restore();

    if (opts.penOnly) {
        // close almost-closed drawings with invisible connectors between stroke ends and nearby strokes
        const strokes: [number, number][][] = [];
        for (const p of page.paths) {
            if (p.isMarker || p.color.length > 7) continue; // markers and erasers
            p.points.forEach(([verb, x, y], i) => {
                if (verb == PathVerb.Move || i == 0) strokes.push([]);
                strokes[strokes.length - 1].push([x * r, y * r]);
            });
        }
        const paint = Skia.Paint();
        paint.setAntiAlias(true);
        paint.setStyle(PaintStyle.Stroke);
        paint.setStrokeWidth(3);
        paint.setColor(Skia.Color("black"));
        for (const [a, b] of gapConnectors(strokes, FILL_STROKE_END_GAP_POINTS)) {
            canvas.drawLine(a[0], a[1], b[0], b[1], paint);
        }
    }

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
 * Computes a paint-bucket fill at `point` (normalized coords), bounded by pen strokes only.
 * Returns the fill element (normalized coords) or undefined if the area is not enclosed.
 */
export async function computeFill(page: PageSnapshot, point: [number, number], color: string, pixelRatio: number)
    : Promise<Omit<SketchOverlay, "id" | "kind" | "afterPath"> | undefined> {
    const area = page.canvasWidth * page.canvasHeight;
    const scale = Math.min(pixelRatio, 2, Math.sqrt(FILL_MAX_PIXELS / area));
    const snapshot = await renderPage(page, Skia.XYWHRect(0, 0, page.canvasWidth, page.canvasHeight), scale,
        { includeBg: false, includeFills: false, includeVectors: false, penOnly: true });
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
        scale, { includeBg: true, includeFills: true, includeVectors: true });
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
 * Captures the background and sketch content inside `rect` (normalized coords), clipped to the
 * lasso polygon if given. Rectangles on a photo background yield an opaque jpeg, others a transparent png.
 */
export async function capturePiece(page: PageSnapshot, rect: NormRect, pixelRatio: number, lasso?: SketchPoint[])
    : Promise<{ base64: string; ext: string } | undefined> {
    const r = page.ratio;
    const scale = Math.min(pixelRatio, 3);
    const image = await renderPage(page, Skia.XYWHRect(rect.x * r, rect.y * r, rect.width * r, rect.height * r),
        scale, { includeBg: page.hasPhotoBg, includeFills: true, includeVectors: false, clip: lasso });
    if (!image) return undefined;

    // Nothing to cut: no pixel that is both opaque and not white (blank page area / plain white paper)
    const pixels = readRGBA(image);
    if (pixels) {
        let content = 0;
        for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] > 32 && differs(pixels, i, 255, 255, 255)) content++;
        }
        if (content < MIN_VISIBLE_CHANGE_POINTS * scale * scale) return undefined;
    }
    return page.hasPhotoBg && !lasso ?
        { base64: image.encodeToBase64(ImageFormat.JPEG, 90), ext: "jpg" } :
        { base64: image.encodeToBase64(ImageFormat.PNG), ext: "png" };
}
