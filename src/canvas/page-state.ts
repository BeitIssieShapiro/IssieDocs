import { SketchElement, SketchImage, SketchLine, SketchOverlay, SketchPath, SketchPoint, SketchTable, SketchText } from './types';
import { cloneElem } from './utils';
import { EditModes } from '../types';
import { ownedBy, scalePoints, shiftPoints } from './pieces';
import { scaleSpanSizes } from './text-spans';

// below everything drawn: images from before images were pieces (entries without `layered`)
const LEGACY_IMAGE_Z = 1e9;

// an element moved by (dx, dy): by its position, or a path (no position) by its points
function shifted<T extends { x?: number; y?: number; points?: any }>(e: T, dx: number, dy: number): T {
    return e.x === undefined ? { ...e, points: shiftPoints(e.points, dx, dy) } : { ...e, x: e.x + dx, y: e.y! + dy };
}

// a piece laid out where it is: its content is drawn relative to this until it moves or resizes again
const laidOut = (img: SketchImage, z: number): SketchImage =>
    ({ ...img, z, originX: img.x, originY: img.y, originWidth: img.width, originHeight: img.height });

/**
 * Replays a page's saved change queue into the elements to draw, plus the
 * last-used tool attributes. Shared by the editor and the page navigator.
 *
 * @param q the queue entries ({type, elem}) as stored in the page's .json
 * @param attachmentBase path prefix for the page's attached files (images)
 *
 * Every element gets a z (the queue position it was created at; pieces: last moved at)
 * that orders the sketch layer. Elements with a pieceId move, copy and delete with that piece.
 */
export function replayPageQueue(q: any[], attachmentBase: string) {
    let _texts = [] as SketchText[];
    let _images = [] as SketchImage[];
    let _tables = [] as SketchTable[]
    let _paths = [] as SketchPath[];
    let _rulers = [] as SketchLine[];
    let _audio = [] as SketchElement[];
    let _overlays = [] as SketchOverlay[];

    let fontSize
    let fontName = undefined
    let textAlignment
    let textBold
    let textItalic
    let textUnderline
    let strokeWidth
    let markerStrokeWidth
    let markerColor
    let brushColor
    let rulerColor
    let rulerStrokeWidth
    let textColor
    let latestMode: EditModes | undefined
    let _pageHeightAddition = 0;
    let _background = undefined;

    // an entry that names a piece (or null: the page) sets the owner; otherwise it stays
    const ownerAfter = (entry: any, current: { pieceId?: string | null }) =>
        ("pieceId" in entry ? entry.pieceId : current.pieceId) ?? undefined;
    const attach = (elem: any) => elem.file ? { ...elem, src: { uri: attachmentBase + elem.file } } : elem;
    const findPiece = (id: string) => _images.find(img => img.id === id);

    // moves a piece's own elements along with it
    const shiftPieceContent = (pieceId: string, dx: number, dy: number) => {
        if (dx === 0 && dy === 0) return;
        const move = <T extends SketchPath | SketchText | SketchOverlay>(e: T) => ownedBy(e, pieceId) ? shifted(e, dx, dy) : e;
        _paths = _paths.map(move);
        _texts = _texts.map(move);
        _overlays = _overlays.map(move);
    };
    // a resized piece scales its own elements with it, around its corner
    const scalePieceContent = (pieceId: string, ox: number, oy: number, sx: number, sy: number) => {
        const mine = (e: { pieceId?: string | null }) => ownedBy(e, pieceId);
        const s = (sx + sy) / 2;
        _paths = _paths.map(p => mine(p) ? { ...p, points: scalePoints(p.points, ox, oy, sx, sy), strokeWidth: p.strokeWidth * s } : p);
        _texts = _texts.map(t => mine(t) ? {
            ...t, x: ox + (t.x - ox) * sx, y: oy + (t.y - oy) * sy, fontSize: t.fontSize * s,
            ...(t.width ? { width: t.width * s } : {}), ...(t.height ? { height: t.height * s } : {}),
            ...(t.spans ? { spans: scaleSpanSizes(t.spans, s) } : {}),
        } : t);
        _overlays = _overlays.map(o => mine(o) ? {
            ...o, x: ox + (o.x - ox) * sx, y: oy + (o.y - oy) * sy, width: o.width * sx, height: o.height * sy,
        } : o);
    };
    const removePieceContent = (pieceId: string) => {
        const notMine = (e: { pieceId?: string | null }) => !ownedBy(e, pieceId);
        _paths = _paths.filter(notMine);
        _texts = _texts.filter(notMine);
        _images = _images.filter(img => img.id !== pieceId);
        _overlays = _overlays.filter(notMine);
    };
    // copies of a piece's elements for its copy: moved by (dx, dy), ids "<id>~<copy id>"
    const copiesOf = <T extends SketchPath | SketchText | SketchOverlay>(elems: T[], copyId: string, dx: number, dy: number) =>
        elems.map(e => ({ ...shifted(e, dx, dy), id: e.id + "~" + copyId, pieceId: copyId }));

    for (let i = 0; i < q.length; i++) {
        if (q[i].type === "background") {
            _background = q[i].elem.type;
        } else if (q[i].type === 'text') {
            const txtElem = cloneElem(q[i].elem);

            //first try to find same ID and replace, or add it
            let found = false;

            fontSize = txtElem.fontSize;
            fontName = txtElem.fontFamily;

            if (!txtElem.alignment) {
                txtElem.alignment = txtElem.rtl ? "Right" : "Left";
            }
            textAlignment = txtElem.alignment;
            textColor = txtElem.color;
            textBold = txtElem.bold;
            textItalic = txtElem.italic;
            textUnderline = txtElem.underline;
            latestMode = EditModes.Text;

            for (let j = 0; j < _texts.length; j++) {
                if (_texts[j].id === txtElem.id) {
                    if (txtElem.text.length == 0) {
                        // remove text
                        _texts = _texts.filter(t => t.id !== txtElem.id);
                    } else {
                        // an edit keeps its place in the drawing order; it moves to/off a piece when it says so
                        // (a text moved with the select tool is put on top, like paper)
                        _texts[j] = { ...txtElem, z: txtElem.raise ? i : _texts[j].z, pieceId: ownerAfter(txtElem, _texts[j]) };
                    }
                    found = true;
                    break;
                }
            }
            if (!found) {
                _texts.push({ ...txtElem, z: i, pieceId: txtElem.pieceId ?? undefined });
            }
        } else if (q[i].type === 'path') {
            const sketchElem = q[i].elem as SketchPath;
            if (sketchElem.isMarker || sketchElem.color.length > 7) {
                markerStrokeWidth = sketchElem.strokeWidth;
                markerColor = sketchElem.color.substring(0, sketchElem.color.length - 2);
                //latestMode = EditModes.Marker;
                sketchElem.isMarker = true;

            } else {
                // for cases it is missing
                sketchElem.isMarker = false;
                strokeWidth = sketchElem.strokeWidth
                brushColor = sketchElem.color;
                latestMode = EditModes.Brush;
            }
            _paths.push({ ...sketchElem, z: i });
        } else if (q[i].type === 'line') {
            _rulers = _rulers.filter(l => l.id !== q[i].elem.id);
            const lineElem = q[i].elem as SketchLine;

            rulerColor = lineElem.color;
            rulerStrokeWidth = lineElem.strokeWidth;

            _rulers.push(cloneElem(lineElem));
            //latestMode = EditModes.Ruler;
        } else if (q[i].type === 'lineDelete') {
            _rulers = _rulers.filter(l => l.id !== q[i].elem.id);
            //latestMode = EditModes.Ruler;
        } else if (q[i].type === 'image') {
            // translate the relative path to full path:
            const elem = attach(cloneElem(q[i].elem));
            // images saved before images were pieces were drawn under all ink: they stay there
            _images.push(laidOut(elem, elem.layered || elem.isCutPiece ? i : i - LEGACY_IMAGE_Z));
            //latestMode = EditModes.Image;
        } else if (q[i].type === 'imagePosition') {
            const pos = q[i].elem;
            const piece = findPiece(pos.id);
            if (piece) {
                // moving a piece brings it (and its content) to the top; resizing scales its content
                const width = pos.width || piece.width, height = pos.height || piece.height;
                const sx = width / piece.width, sy = height / piece.height;
                if (sx !== 1 || sy !== 1) scalePieceContent(piece.id, piece.x, piece.y, sx, sy);
                shiftPieceContent(piece.id, pos.x - piece.x, pos.y - piece.y);
                _images = _images.map(img => img.id === piece.id ? laidOut({
                    ...img, x: pos.x, y: pos.y, width, height,
                    ...(img.holes && (sx !== 1 || sy !== 1) ?
                        { holes: img.holes.map(h => h.map(([hx, hy]) => [hx * sx, hy * sy] as SketchPoint)) } : {}),
                }, pos.layered || img.isCutPiece ? i : img.z!) : img);
            }
        } else if (q[i].type === 'imageDelete') {
            removePieceContent(q[i].elem.id);
        } else if (q[i].type === 'cut' && q[i].elem.copy) {
            // a copy of a selection: a new piece with copies of what was inside, the page untouched
            const cut = q[i].elem;
            const pieceId = cut.piece.id;
            const { dx, dy } = cut.copy;
            const paths = new Set<string>(cut.takePaths ?? []), texts = new Set<string>(cut.takeTexts ?? []);
            const insideParts = new Map<string, any>((cut.splitPaths ?? []).map((sp: any) => [sp.from, sp.inside]));
            // what is inside: whole strokes, and the inside parts of crossing ones (in the stroke's place)
            const inside = _paths.flatMap(p => paths.has(p.id) ? [p] : insideParts.has(p.id) ? [{ ...insideParts.get(p.id), z: p.z }] : []);
            _paths.push(...copiesOf(inside, pieceId, dx, dy));
            _texts.push(...copiesOf(_texts.filter(t => texts.has(t.id)), pieceId, dx, dy));
            _images.push(laidOut({ ...attach(cloneElem(cut.piece)), isCutPiece: true }, i));
        } else if (q[i].type === 'cut') {
            const cut = q[i].elem;
            // the hole in the base paper
            _overlays.push({ id: cut.id, kind: "cut", x: cut.x, y: cut.y, width: cut.width, height: cut.height, points: cut.points, z: i });
            if (cut.piece) {
                const pieceId = cut.piece.id;
                const take = (ids: string[] | undefined) => new Set(ids ?? []);
                const paths = take(cut.takePaths), texts = take(cut.takeTexts);
                // pieces fully inside are taken whole: what is left of their content goes to the page
                const absorbed = take(cut.absorbPieces);
                const keepOwner = (owner?: string | null) => owner && !absorbed.has(owner) ? owner : undefined;
                const split = new Map<string, any>((cut.splitPaths ?? []).map((sp: any) => [sp.from, sp]));
                const nextPaths: SketchPath[] = [];
                for (const p of _paths) {
                    const sp = split.get(p.id);
                    if (sp) {
                        // the parts keep the stroke's place in the drawing order; the outside part stays where it was
                        if (sp.outside) nextPaths.push({ ...sp.outside, z: p.z, pieceId: keepOwner(p.pieceId) });
                        if (sp.inside) nextPaths.push({ ...sp.inside, z: p.z, pieceId });
                    } else {
                        nextPaths.push({ ...p, pieceId: paths.has(p.id) ? pieceId : keepOwner(p.pieceId) });
                    }
                }
                _paths = nextPaths;
                _texts = _texts.map(t => ({ ...t, pieceId: texts.has(t.id) ? pieceId : keepOwner(t.pieceId) }));
                _overlays = _overlays.map(o => ({ ...o, pieceId: keepOwner(o.pieceId) }));
                _images = _images.filter(img => !absorbed.has(img.id));
                // pieces under the cut get a hole
                for (const { id, hole } of cut.cutPieces ?? []) {
                    _images = _images.map(img => img.id === id ? { ...img, holes: [...(img.holes ?? []), hole] } : img);
                }
                _images.push(laidOut({ ...attach(cloneElem(cut.piece)), isCutPiece: true }, i));
            }
        } else if (q[i].type === 'pieceCopy') {
            const { id, from, x, y } = q[i].elem;
            const source = findPiece(from);
            if (source) {
                const dx = x - source.x, dy = y - source.y;
                const mine = (e: { pieceId?: string | null }) => ownedBy(e, from);
                // the copy's content keeps its order within the piece
                _paths.push(...copiesOf(_paths.filter(mine), id, dx, dy));
                _texts.push(...copiesOf(_texts.filter(mine), id, dx, dy));
                _overlays.push(...copiesOf(_overlays.filter(mine), id, dx, dy));
                _images.push(laidOut({ ...source, id, x, y }, i));
            }
        } else if (q[i].type === 'table') {
            _tables = _tables.filter(t => t.id !== q[i].elem.id);
            const tableElem = cloneElem(q[i].elem) as SketchTable;
            if (tableElem.strokeDash && !Array.isArray(tableElem.strokeDash)) {
                tableElem.strokeDash = (tableElem.strokeDash as string).split(",").map((n: string) => parseInt(n)) as [number, number];
            }
            _tables.push(tableElem);
            //latestMode = EditModes.Table;
        } else if (q[i].type === 'tableDelete') {
            _tables = _tables.filter(t => t.id !== q[i].elem.id);
            // delete all cell text related
            _texts = _texts.filter(tct => tct.tableId !== q[i].elemID)
            //latestMode = EditModes.Table;
        } else if (q[i].type === 'audio') {
            _audio.push(cloneElem(q[i].elem));
            //latestMode = EditModes.Audio;
        } else if (q[i].type === 'audioDelete') {
            _audio = _audio.filter(t => t.id !== q[i].elem.id);
            //latestMode = EditModes.Audio;
        } else if (q[i].type === 'audioPosition') {
            const elemIndex = _audio.findIndex(ci => ci.id === q[i].elem.id);
            if (elemIndex >= 0) {
                _audio[elemIndex] = { ..._audio[elemIndex], ...q[i].elem }
            }
        } else if (q[i].type === 'fill') {
            _overlays.push({ ...q[i].elem, kind: "fill", z: i });
        } else if (q[i].type === 'changePageHeightAddition') {
            // Handle page height change from queue
            const newHeight = q[i].elem.height;
            if (newHeight && newHeight > 0) {
                _pageHeightAddition = newHeight;
            }
        }
    }

    return {
        texts: _texts,
        images: _images,
        tables: _tables,
        paths: _paths,
        rulers: _rulers,
        audio: _audio,
        overlays: _overlays,
        fontSize: fontSize,
        fontName: fontName,
        textAlignment: textAlignment,
        textBold: textBold,
        textItalic: textItalic,
        textUnderline: textUnderline,
        strokeWidth: strokeWidth,
        markerStrokeWidth: markerStrokeWidth,
        markerColor: markerColor,
        brushColor: brushColor,
        rulerColor: rulerColor,
        rulerStrokeWidth: rulerStrokeWidth,
        textColor: textColor,
        latestMode: latestMode,
        pageHeightAddition: _pageHeightAddition,
        background: _background,
    };
}

export type PageState = ReturnType<typeof replayPageQueue>;
