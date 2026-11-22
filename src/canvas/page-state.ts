import { SketchElement, SketchImage, SketchLine, SketchOverlay, SketchPath, SketchTable, SketchText } from './types';
import { cloneElem } from './utils';
import { EditModes } from '../types';

/**
 * Replays a page's saved change queue into the elements to draw, plus the
 * last-used tool attributes. Shared by the editor and the page navigator.
 *
 * @param q the queue entries ({type, elem}) as stored in the page's .json
 * @param attachmentBase path prefix for the page's attached files (images)
 * @param activePieceId id of a cut piece currently being moved, if any
 */
export function replayPageQueue(q: any[], attachmentBase: string, activePieceId?: string) {
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
                        _texts[j] = txtElem;
                    }
                    found = true;
                    break;
                }
            }
            if (!found) {
                _texts.push(txtElem);
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
            _paths.push(sketchElem);
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
            let elem = cloneElem(q[i].elem);
            if (elem.file) {
                elem = {
                    ...elem,
                    ...(elem.file ? { src: { uri: attachmentBase + elem.file } } : {})
                }
            }
            if (elem.isCutPiece) {
                _overlays.push({
                    id: elem.id, kind: "piece", x: elem.x, y: elem.y, width: elem.width, height: elem.height,
                    src: elem.src?.uri, afterPath: _paths.length,
                });
                if (elem.id === activePieceId) _images.push(elem);
            } else {
                _images.push(elem);
            }
            //latestMode = EditModes.Image;
        } else if (q[i].type === 'imagePosition') {
            const piece = _overlays.find(o => o.kind === "piece" && o.id === q[i].elem.id);
            if (piece) {
                Object.assign(piece, { x: q[i].elem.x, y: q[i].elem.y, width: q[i].elem.width, height: q[i].elem.height });
            }
            const elemIndex = _images.findIndex(ci => ci.id === q[i].elem.id);
            if (elemIndex >= 0) {
                const updatedImage = {
                    ..._images[elemIndex],
                    width: q[i].elem.width,
                    height: q[i].elem.height,
                    x: q[i].elem.x,
                    y: q[i].elem.y,
                }
                _images[elemIndex] = updatedImage;
                //latestMode = EditModes.Image;
            }
        } else if (q[i].type === 'imageDelete') {
            _overlays = _overlays.filter(o => !(o.kind === "piece" && o.id === q[i].elem.id));
            const elemIndex = _images.findIndex(ci => ci.id === q[i].elem.id);
            if (elemIndex >= 0) {
                _images.splice(elemIndex, 1);
                //latestMode = EditModes.Image;
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
        } else if (q[i].type === 'fill' || q[i].type === 'cut') {
            _overlays.push({ ...q[i].elem, kind: q[i].type, afterPath: _paths.length });
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
