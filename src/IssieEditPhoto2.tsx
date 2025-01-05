import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    ImageSize,
    SafeAreaView,
    StyleSheet,
    View,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { CurrentEdited, ElementBase, ElementTypes, MoveTypes, Offset, SketchElement, SketchImage, SketchLine, SketchPath, SketchPoint, SketchTable, SketchText, TableContext } from './canvas/types';
import { Canvas } from './canvas/canvas';
import DoQueue from './do-queue';
import { FileSystem } from './filesystem';
import { trace } from './log';
import { arrLast, pageTitleAddition, setNavParam } from './utils';
import { colors, dimensions, getImageDimensions, semanticColors } from './elements';
import EditorToolbar from './editor-toolbar';
import { getNewPage, SRC_CAMERA, SRC_GALLERY } from './newPage';
import { EditModes, RootStackParamList } from './types';
import { backupElement, cloneElem, getId, restoreElement } from './canvas/utils';
import { MARKER_TRANSPARENCY_CONSTANT } from './svg-icons';
import { isRTL } from './lang';

type EditPhotoScreenProps = StackScreenProps<RootStackParamList, 'EditPhoto'>;

export function IssieEditPhoto2({ route, navigation }: EditPhotoScreenProps) {
    const { page, folder, share, goHome, pageIndex } = route.params;

    // -------------------------------------------------------------------------
    //                          STATE & REFS
    // -------------------------------------------------------------------------
    const [paths, setPaths] = useState<SketchPath[]>([]);
    const [lines, setLines] = useState<SketchLine[]>([]);
    const [texts, setTexts] = useState<SketchText[]>([]);
    const [images, setImages] = useState<SketchImage[]>([]);
    const [tables, setTables] = useState<SketchTable[]>([]);
    const [currentEdited, setCurrentEdited] = useState<CurrentEdited>({});

    const [windowSize, setWindowSize] = useState<ImageSize>({ width: 500, height: 500 });
    const [canvasSize, setCanvasSize] = useState<ImageSize>({ width: 1000, height: 1000 })
    const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
    const [zoom, setZoom] = useState<number>(1);
    const [status, setStatus] = useState<string>("");
    const [moveCanvas, setMoveCanvas] = useState<Offset>({ x: 0, y: 0 });
    const [mode, setMode] = useState<EditModes>(EditModes.Brush);
    const [eraseMode, setEraseMode] = useState<boolean>(false);
    const [openContextMenu, setOpenContextMenu] = useState<boolean>(false);
    const [currentFile, setCurrentFile] = useState<string>(page.defaultSrc);
    const [busy, setBusy] = useState<boolean>(false);

    const pageRef = useRef(page);
    const metaDataUri = useRef("");
    const currPageIndexRef = useRef(pageIndex ?? 0);
    const queue = useRef(new DoQueue(async (attachName: string) => {
        console.log("File Evicted from queue");
        await FileSystem.main.deleteAttachedFile(pageRef.current, currPageIndexRef.current, attachName);
    }));

    const modeRef = useRef<EditModes>(EditModes.Brush);

    const [fontSize, setFontSize] = useState<number>(35);
    const [textAlignment, setTextAlignment] = useState<string>("left");
    const [strokeWidth, setStrokeWidth] = useState<number>(2);
    const [markerWidth, setMarkerWidth] = useState<number>(20);
    const [sideMargin, setSideMargin] = useState<number>(dimensions.minSideMargin);
    const [brushColor, setBrushColor] = useState<string>(colors.black);
    const [rulerColor, setRulerColor] = useState<string>(colors.black);
    const [markerColor, setMarkerColor] = useState<string>(colors.yellow);
    const [textColor, setTextColor] = useState<string>(colors.black);
    const [tableColor, setTableColor] = useState<string>(colors.blue);


    // Corresponding Refs
    const linesRef = useRef(lines);
    const pathsRef = useRef(paths);
    const textsRef = useRef(texts);
    const imagesRef = useRef(images);
    const tablesRef = useRef(tables);
    const currentEditedRef = useRef<CurrentEdited>(currentEdited);
    const canvasSizeRef = useRef<ImageSize>(canvasSize);


    const fontSizeRef = useRef(fontSize);
    const textAlignmentRef = useRef(textAlignment);
    const strokeWidthRef = useRef(strokeWidth);
    const markerWidthRef = useRef(markerWidth);
    const sideMarginRef = useRef(sideMargin);
    const brushColorRef = useRef(brushColor);
    const rulerColorRef = useRef(rulerColor);
    const markerColorRef = useRef(markerColor);
    const textColorRef = useRef(textColor);
    const tableColorRef = useRef(tableColor);


    // -------------------------------------------------------------------------
    //                          EFFECTS
    // -------------------------------------------------------------------------

    useEffect(() => {
        //trace("Refs change", mode)
        modeRef.current = mode;
        fontSizeRef.current = fontSize;
        textAlignmentRef.current = textAlignment;
        strokeWidthRef.current = strokeWidth;
        markerWidthRef.current = markerWidth;
        sideMarginRef.current = sideMargin;
        brushColorRef.current = brushColor;
        rulerColorRef.current = rulerColor;
        markerColorRef.current = markerColor;
        textColorRef.current = textColor;
        tableColorRef.current = tableColor;
        canvasSizeRef.current = canvasSize;

        updateCurrentEditedElements();
    }, [mode, fontSize, textAlignment, strokeWidth, markerWidth, sideMargin,
        brushColor, rulerColor, markerColor, textColor, tableColor, canvasSize]);

    useEffect(() => {
        currentEditedRef.current = currentEdited;
    }, [currentEdited])


    useEffect(() => {
        trace("EditPhoto CurrentFile: ", currentFile);
        if (page.count > 0) {
            setNavParam(navigation, 'pageTitleAddition', pageTitleAddition(page.count, 0));
        }
        setNavParam(navigation, 'onMoreMenu', () => setOpenContextMenu(true));

        metaDataUri.current = currentFile + ".json";
        loadMetadata().then(() => queue2state());

        return () => {
            // Cleanup if needed
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function loadMetadata() {
        queue.current.clear();
        const value = await FileSystem.main.loadFile(metaDataUri.current);
        const sketchState = JSON.parse(value);
        for (let i = 0; i < sketchState.length; i++) {
            queue.current.add(sketchState[i]);
        }
        trace("load metadata - end", new Date().toISOString());
    }

    const save = async () => {
        let sketchState = queue.current.getAll();
        const content = JSON.stringify(sketchState, undefined, " ");
        await FileSystem.main.writeFile(metaDataUri.current, content)
            .catch((e) => Alert.alert("File Save Failed" + e))

        // TODO Save thumbnail
    }

    const queue2state = () => {
        let q = queue.current.getAll();

        //console.log("Queue:", q.map(elem=>`${elem.type}: ${elem.elem.from+","+elem.elem.to}\n`))

        let _texts = [] as SketchText[];
        let _images = [] as SketchImage[];
        let _tables = [] as SketchTable[]
        let _paths = [] as SketchPath[];
        let _rulers = [] as SketchLine[];
        let _audio = [] as SketchElement[];

        for (let i = 0; i < q.length; i++) {
            if (q[i].type === 'text') {
                const txtElem = cloneElem(q[i].elem);

                //first try to find same ID and replace, or add it
                let found = false;

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
                _paths.push(q[i].elem);
            } else if (q[i].type === 'line') {
                _rulers = _rulers.filter(l => l.id !== q[i].elem.id);
                _rulers.push(cloneElem(q[i].elem));
            } else if (q[i].type === 'lineDelete') {
                _rulers = _rulers.filter(l => l.id !== q[i].elemID);
            } else if (q[i].type === 'image') {
                // translate the relative path to full path:
                let elem = cloneElem(q[i].elem);
                if (elem.file) {
                    elem = {
                        ...elem, src: { uri: FileSystem.main.getAttachmentBase(pageRef.current, currPageIndexRef.current) + elem.file }
                    }
                    _images.push(elem);
                }
            } else if (q[i].type === 'imagePosition') {
                const elemIndex = _images.findIndex(ci => ci.id === q[i].elem.id);
                if (elemIndex >= 0) {
                    const updatedImage = { ..._images[elemIndex], ...q[i].elem }
                    _images[elemIndex] = updatedImage;
                }
            } else if (q[i].type === 'imageDelete') {
                const elemIndex = _images.findIndex(ci => ci.id === q[i].elem.id);
                if (elemIndex >= 0) {
                    _images.splice(elemIndex, 1);
                }
            } else if (q[i].type === 'table') {
                _tables = _tables.filter(t => t.id !== q[i].elem.id);
                _tables.push(cloneElem(q[i].elem));
            } else if (q[i].type === 'tableDelete') {
                _tables = _tables.filter(t => t.id !== q[i].elemID);
                // delete all cell text related
                _texts = _texts.filter(tct => tct.tableId !== q[i].elemID)
            } else if (q[i].type === 'audio') {
                _audio.push(cloneElem(q[i].elem));
            } else if (q[i].type === 'audioDelete') {
                _audio = _audio.filter(t => t.id !== q[i].elem.id);
            } else if (q[i].type === 'audioPosition') {
                const elemIndex = _audio.findIndex(ci => ci.id === q[i].elem.id);
                if (elemIndex >= 0) {
                    _audio[elemIndex] = { ..._audio[elemIndex], ...q[i].elem }
                }
            }
        }

        pathsRef.current = _paths;
        textsRef.current = _texts;
        linesRef.current = _rulers;
        imagesRef.current = _images;
        tablesRef.current = _tables;

        setPaths(_paths);
        setTexts(_texts);
        setLines(_rulers);
        setImages(_images);
        setTables(_tables);
    }

    function beforeModeChange() {
        saveText();
    }

    // -------------------------------------------------------------------------
    //                          SKETCH HANDLERS
    // -------------------------------------------------------------------------
    function handleSketchStart(p: SketchPoint) {
        //console.log("Sketch Start", modeRef.current, p);
        if (isBrushMode() || isMarkerMode()) {
            let color = isMarkerMode() ? markerColorRef.current + MARKER_TRANSPARENCY_CONSTANT : brushColorRef.current;
            let strokeWidth = isMarkerMode() ? markerWidthRef.current : strokeWidthRef.current;
            if (eraseMode) {
                color = '#00000000';
                strokeWidth = strokeWidthRef.current * 3;
            }

            const newPath: SketchPath = {
                id: getId("S"),
                points: [p],
                color,
                strokeWidth,
            };

            pathsRef.current.push(newPath);
            setPaths([...pathsRef.current]);

        } else if (modeRef.current === EditModes.Ruler) {
            const newLine: SketchLine = {
                id: getId("L"),
                from: p,
                to: p,
                color: rulerColorRef.current,
                strokeWidth: strokeWidthRef.current,
            };
            linesRef.current.push(newLine);
            setLines([...linesRef.current]);
        }
    }

    function handleSketchStep(p: SketchPoint) {
        if (isBrushMode() || isMarkerMode()) {

            const lastPath = arrLast(pathsRef.current);
            if (lastPath) {
                lastPath.points.push(p);
                setPaths([...pathsRef.current]);
                trace("Sketch Step update", pathsRef.current.map(p => p.id));
            }
        } else if (isRulerMode()) {
            const lastLine = arrLast(linesRef.current);
            if (lastLine) {
                lastLine.to = p;
                setLines([...linesRef.current]);
            }
        }
    }

    function handleSketchEnd() {
        if (isBrushMode() || isMarkerMode()) {
            const elem = arrLast(pathsRef.current);
            if (!elem) return;
            queue.current.pushPath(elem)
        } else if (isRulerMode()) {
            const elem = arrLast(linesRef.current);
            if (!elem) return;
            queue.current.pushLine(elem);
            setCurrentEdited(prev => ({ ...prev, lineId: elem.id }))
        }

        save();
        queue2state();
    }

    // -------------------------------------------------------------------------
    //                          TEXT HANDLERS
    // -------------------------------------------------------------------------

    function saveText() {
        if (modeRef.current != EditModes.Text) return;
        const textElem = textsRef.current.find(t => t.id == currentEditedRef.current.textId);
        if (textElem) {
            // todo verify text elem has changed
            if (textElem.backup) {
                const changedElem = restoreElement(textElem) as SketchText;
                const origElem = textElem as SketchText;
                // compare the text elements
                if (changedElem.text != origElem.text ||
                    changedElem.color != origElem.color ||
                    changedElem.fontSize != origElem.fontSize ||
                    changedElem.rtl != origElem.rtl ||
                    changedElem.x != origElem.x ||
                    changedElem.y != origElem.y) {

                    queue.current.pushText(changedElem);
                    queue2state();
                    save();
                    return;
                }
            } else {
                // new text element
                if (textElem.text != "") {
                    queue.current.pushText(textElem);
                    queue2state();
                    save();
                    return;
                }
            }
        }
    }

    function handleCanvasClick(p: SketchPoint, elem: ElementBase | TableContext | undefined) {
        if (isTextMode()) {
            saveText();

            if (elem && 'id' in elem) {
                // click on existing
                const textElem = textsRef.current.find(t => t.id == elem.id);
                if (textElem) {
                    backupElement(textElem);
                    setCurrentEdited(prev => ({ ...prev, textId: elem.id }))

                    // Update the font and color based on the selected text
                    setFontSize(textElem.fontSize);
                    setTextColor(textElem.color);
                    setTextAlignment(textElem.rtl ? 'Right' : 'Left')
                }
            } else {
                const newTextElem: SketchText = {
                    id: getId("T"),
                    text: "",
                    color: brushColorRef.current,
                    rtl: textAlignmentRef.current == 'Right',
                    fontSize: fontSizeRef.current,
                    x: p[0],
                    y: p[1],
                };
                setCurrentEdited(prev => ({ ...prev, textId: newTextElem.id }));
                textsRef.current.push(newTextElem);
            }

            setTexts([...textsRef.current]);
        } else if (modeRef.current === EditModes.Ruler && elem && "id" in elem) {
            const lineElem = linesRef.current.find(line => line.id == elem.id);
            if (lineElem) {
                setCurrentEdited(prev => ({ ...prev, lineId: elem.id }));
                setLines([...linesRef.current]);
            }
        } else if (modeRef.current === EditModes.Image && elem && "id" in elem) {
            trace("set current image")
            setCurrentEdited(prev => ({ ...prev, imageId: elem.id }));
        }
    }

    function handleTextChanged(id: string, newText: string) {
        const textElem = textsRef.current.find(t => t.id == id);
        if (textElem) {
            textElem.text = newText;
        }
        setTexts([...textsRef.current]);
    }

    // -------------------------------------------------------------------------
    //                          MOVE / DRAG HANDLERS
    // -------------------------------------------------------------------------
    function handleMove(type: MoveTypes, id: string, p: SketchPoint) {
        trace("Move elem", type, id, p)
        if (type === MoveTypes.Text) {
            const textElem = textsRef.current.find(t => t.id === id);
            trace("Move text", textElem, textsRef.current)
            if (textElem) {
                textElem.x = p[0];
                textElem.y = p[1];
                setTexts([...textsRef.current]);
            }
        } else if (type === MoveTypes.LineStart || type === MoveTypes.LineEnd || type === MoveTypes.LineMove) {
            const line = linesRef.current.find(line => line.id == id);
            if (line) {
                if (!line.backup) {
                    backupElement(line)
                }
                if (type === MoveTypes.LineStart) {
                    line.from = [p[0], p[1]];
                } else if (type === MoveTypes.LineEnd) {
                    line.to = [p[0], p[1]];
                } else {
                    const dx = line.to[0] - line.from[0];
                    const dy = line.to[1] - line.from[1];
                    line.from = [p[0], p[1]];
                    line.to = [p[0] + dx, p[1] + dy];
                }
                setLines([...linesRef.current]);
            }

        } else if (type === MoveTypes.ImageMove || type === MoveTypes.ImageResize) {
            const imgElem = imagesRef.current.find(image => image.id == id);
            if (imgElem) {
                if (!imgElem.backup) {
                    backupElement(imgElem)
                }
                if (type === MoveTypes.ImageMove) {
                    imgElem.x = p[0];
                    imgElem.y = p[1];
                } else {
                    imgElem.width = p[0] - imgElem.x;
                    imgElem.height = p[1] - imgElem.y;
                }
                setImages([...imagesRef.current]);
            }
        }
    }

    function handleMoveEnd(type: MoveTypes, id: string) {
        if (type === MoveTypes.LineStart || type === MoveTypes.LineEnd || type === MoveTypes.LineMove) {
            console.log("Move end", linesRef.current);
            const line = linesRef.current.find(line => line.id == id);
            if (line) {
                queue.current.pushLine(restoreElement(line));
                save();
                queue2state();
            }
        } else if (type === MoveTypes.ImageMove || type === MoveTypes.ImageResize) {
            const imgElem = imagesRef.current.find(image => image.id == id);
            if (imgElem) {
                const changed = restoreElement(imgElem);
                queue.current.pushImagePosition(changed);
                save();
                queue2state();
            }
        }
    }

    function handleMoveTablePart(p: SketchPoint, tableContext: TableContext) {
        console.log("Table Part move", tableContext, p);
        // Handle table line dragging if needed
    }

    function handleMoveTablePartEnd(tableContext: TableContext) {
        console.log("Table Part move end", tableContext);
    }

    // -------------------------------------------------------------------------
    //                          DELETE HANDLER
    // -------------------------------------------------------------------------
    function handleDelete(type: ElementTypes, id: string) {
        if (type === ElementTypes.Line) {
            queue.current.pushDeleteLine(id);
            save();
            queue2state();
        } else if (type == ElementTypes.Image) {
            queue.current.pushDeleteImage({ id });
            save();
            queue2state();
        }
    }

    // -------------------------------------------------------------------------
    //                          TEXT OVERFLOW
    // -------------------------------------------------------------------------
    function handleTextYOverflow(elemId: string) {
        console.log("End of page reached", elemId);
    }

    // -------------------------------------------------------------------------
    //                          TOOLBAR OR MODE HANDLERS
    // -------------------------------------------------------------------------
    function afterUndoRedo() {
        queue2state()
        save();
    }

    // NEW OR UPDATED: placeholders or stubs for these missing handlers
    function handleEraserPressed() {
        trace("Eraser pressed");
        if (modeRef.current === EditModes.Image || modeRef.current === EditModes.Table) {
            setMode(EditModes.Brush);
        }
        setEraseMode((prev) => !prev);
    }

    function handleRulerMode() {
        beforeModeChange();
        setMode(EditModes.Ruler);
    }
    function handleTextMode() {
        beforeModeChange();
        setMode(EditModes.Text);
    }
    function handleImageMode() {
        setMode(EditModes.Image);
    }
    function handleAudioMode() {
        beforeModeChange();
        setMode(EditModes.Audio);
    }
    function handleAddAudio() {
        console.log("Add audio not implemented yet");
    }

    function addImage(srcType: string) {
        getNewPage(srcType, (uri: string) => {
            setBusy(true);
            getImageDimensions(uri).then((imgSize) => {
                const ratio = imgSize.w / imgSize.h;
                FileSystem.main.resizeImage(uri, Math.round(canvasSize.width / 1.5), canvasSize.height / 1.5)
                    .then(uri2 => FileSystem.main.attachedFileToPage(uri2, pageRef.current, currPageIndexRef.current, "jpeg"))
                    .then(imageAttachmentFile => {
                        const img = {
                            id: getId("I"),
                            x: canvasSize.width / 2,
                            y: canvasSize.height / 2,
                            file: imageAttachmentFile,
                            width: Math.round(120 * ratio),
                            height: 120,
                        };

                        queue.current.pushImage(img)
                        currentEdited.imageId = img.id;
                        queue2state();
                        save();
                    })
            }).finally(() => setBusy(false));
        },
            //cancel
            () => setBusy(false),
            (err: any) => Alert.alert("Error", err.description),
            navigation,
            {
                selectionLimit: 1,
                //  quality: 0.8 
            });
    }

    // Brush Mode
    function onBrushMode() {
        beforeModeChange();
        setMode(EditModes.Brush);
    }

    // Marker Mode
    function onMarkerMode() {
        beforeModeChange();
        setMode(EditModes.Marker);
    }

    // Voice Mode
    function onVoiceMode() {
        console.log("Not implemented yet");
    }

    // Table Mode
    function onTableMode() {
        beforeModeChange();
        setMode(EditModes.Table);
    }

    // Checking if we are in a particular mode
    function isTableMode() {
        return modeRef.current === EditModes.Table;
    }
    function isMarkerMode() {
        return modeRef.current === EditModes.Marker;
    }
    function isRulerMode() {
        return modeRef.current === EditModes.Ruler;
    }
    function isTextMode() {
        return modeRef.current === EditModes.Text;
    }
    function isAudioMode() {
        return modeRef.current === EditModes.Audio;
    }
    function isImageMode() {
        return modeRef.current === EditModes.Image;
    }
    function isVoiceMode() {
        return modeRef.current === EditModes.Voice;
    }
    function isBrushMode() {
        return modeRef.current === EditModes.Brush;
    }

    const TableActions = {
        delete: (id: string) => {
            trace("Delete table", id)
            queue.current.pushDeleteTable(id);
            queue2state()
            save();
        },
        addTable: (cols: number, rows: number, color: string, borderWidth: number, style: any) => {
            if (tablesRef.current.length > 0) return;

            const newTable = {
                id: getId("TL"),
                color,
                strokeWidth: borderWidth,
                verticalLines: [],
                horizontalLines: [],
            } as SketchTable;

            const bottomMargin = dimensions.toolbarHeight * 2;
            const topMargin = dimensions.toolbarHeight * 1.2;
            const sideMargin = 50;
            const colWidth = Math.floor((canvasSizeRef.current.width - sideMargin * 2) / cols);
            const rowHeight = Math.floor((canvasSizeRef.current.height - topMargin - bottomMargin) / rows);

            for (let i = 0; i <= cols; i++) {
                newTable.verticalLines.push(sideMargin + i * colWidth);
            }
            for (let i = 0; i <= rows; i++) {
                newTable.horizontalLines.push(topMargin + i * rowHeight);
            }
            trace("Add Table")
            queue.current.pushTable(newTable);
            queue2state();
            save();
        },
        setRowsOrColumns: (newVal: number, isCols: boolean) => {
            if (newVal < 1) return;
            if (tablesRef.current.length > 0 &&
                (isCols && tablesRef.current[0].verticalLines.length + 1 != newVal ||
                    !isCols && tablesRef.current[0].horizontalLines.length + 1 != newVal)) {

                const changed = cloneElem(tablesRef.current[0]);
                const changeAtBegining = isCols && isRTL();

                const array = isCols ? changed.verticalLines : changed.horizontalLines;
                const newArray = [];
                const lastElemSize = changeAtBegining ? array[1] - array[0] : arrLast(array) - array[array.length - 2];
                let isGrowing = true;
                let begin = 0, end = -2;
                if (newVal < array.length - 1) {

                    if (changeAtBegining) {
                        newArray.push(array[0]);
                        begin = 2, end = array.length;
                    }

                    newArray.push(...array.slice(begin, end));

                    if (!changeAtBegining) {
                        newArray.push(arrLast(array));
                    }
                    isGrowing = false;

                } else if (newVal >= array.length) {
                    if (changeAtBegining) {
                        newArray.push(array[0]);
                    }
                    newArray.push(...array);

                    if (!changeAtBegining) {
                        newArray.push(arrLast(array));
                    }
                }

                // Adjust the other elements
                let accDelta = 0;
                if (changeAtBegining) {
                    for (let i = newArray.length - 1; i > 1; i--) {
                        const elemSize = newArray[i] - newArray[i - 1];
                        accDelta = isGrowing ?
                            accDelta + (elemSize / newArray.length) :
                            accDelta - (lastElemSize / (newArray.length - 1))
                        trace("change ", i, accDelta)
                        newArray[i - 1] += accDelta;
                    }
                } else {
                    for (let i = 1; i < newArray.length - 1; i++) {
                        const elemSize = newArray[i] - newArray[i - 1];
                        accDelta = isGrowing ?
                            accDelta - (elemSize / (newArray.length)) :
                            accDelta + (lastElemSize / (newArray.length - 1))
                        newArray[i] += accDelta;
                    }
                }

                queue.current.pushTable(changed);
                queue2state();
                save();
            }
        },
        setBorderWidth: (borderWidth: number) => {
            if (tablesRef.current.length > 0 && tablesRef.current[0].strokeWidth != borderWidth) {
                const changed = cloneElem(tablesRef.current[0]);
                changed.strokeWidth = borderWidth;
                queue.current.pushTable(changed);
                queue2state();
                save();
            }
        },
        setBorderStyle: (borderStyle: string) => {
            const strokeDash = borderStyle == "0,0" ? undefined : borderStyle.split(",");
            if (tablesRef.current.length > 0 && tablesRef.current[0].strokeDash != strokeDash) {
                const changed = cloneElem(tablesRef.current[0]);
                changed.strokeDash = strokeDash;
                queue.current.pushTable(changed);
                queue2state();
                save();
            }
        } 
    };

    function updateCurrentEditedElements() {
        if (modeRef.current == EditModes.Text && currentEditedRef.current.textId) {
            const textElem = textsRef.current.find(t => t.id == currentEditedRef.current.textId);
            if (textElem) {
                textElem.color = textColorRef.current;
                textElem.fontSize = fontSizeRef.current;
                textElem.rtl = textAlignmentRef.current == 'Right';
                setTexts([...textsRef.current]);
            }
        }
    }

    function handleSelectColor(newColor: string) {
        if (isBrushMode()) {
            setBrushColor(newColor)
        } else if (isRulerMode()) {
            setRulerColor(newColor);
            if (currentEditedRef.current.lineId) {
                const lineElem = linesRef.current.find(line => line.id == currentEditedRef.current.lineId);
                if (lineElem) {
                    const cloned = cloneElem(lineElem);
                    cloned.color = newColor;
                    queue.current.pushLine(cloned);
                    queue2state();
                    save();
                }
            }
        } else if (isTextMode()) {
            setTextColor(newColor);
        } else if (isMarkerMode()) {
            setMarkerColor(newColor);

        } else if (isTableMode()) {
            setTableColor(newColor);
            if (tablesRef.current.length > 0) {
                const changed = cloneElem(tablesRef.current[0]);
                changed.color = newColor;
                queue.current.pushTable(changed);
                queue2state()
                save();
            }
        }
    }

    function onTextSize(size: number) {
        setFontSize(size);
    }
    function onTextAlignment(newTextAlignment: string) {
        setTextAlignment(newTextAlignment);
    }
    function onBrushSize(brushSize: number) {
        setStrokeWidth(brushSize);
        if (modeRef.current == EditModes.Ruler) {
            const lineElem = linesRef.current.find(line => line.id == currentEditedRef.current.lineId);
            if (lineElem) {
                const cloned = cloneElem(lineElem);
                cloned.strokeWidth = brushSize;
                queue.current.pushLine(cloned);
                queue2state();
                save();
            }
        }
    }
    function onMarkerSize(markerSize: number) {
        setMarkerWidth(markerSize);
    }

    // NEW OR UPDATED: stub for handleToolbarDimensionChange
    function handleToolbarDimensionChange(width: number, height: number) {
        console.log("Toolbar dimension changed:", { width, height });
    }

    // -------------------------------------------------------------------------
    //                          RENDER
    // -------------------------------------------------------------------------

    function colorByMode(mode: EditModes, brushColor: string, textColor: string,
        markerColor: string, rulerColor: string, tableColor: string) {
        if (mode == EditModes.Brush) return brushColor;
        if (mode == EditModes.Text) return textColor;
        if (mode == EditModes.Marker) return markerColor;
        if (mode == EditModes.Ruler) return rulerColor;
        if (mode == EditModes.Table) return tableColor;
    }

    function mode2ElementType(mode: EditModes): ElementTypes {
        if (mode == EditModes.Brush || mode == EditModes.Marker) {
            return ElementTypes.Sketch
        }
        return mode as unknown as ElementTypes;
    }

    return (
        <SafeAreaView
            style={styles.mainContainer}
            onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                setWindowSize({ width, height });
            }}
        >
            <EditorToolbar
                windowSize={windowSize}
                onGoBack={() => navigation.goBack()}
                onUndo={() => {
                    if (queue.current.undo()) {
                        afterUndoRedo();
                    }
                }}
                canRedo={queue.current.canRedo()}
                onRedo={() => {
                    if (queue.current.redo()) {
                        afterUndoRedo();
                    }
                }}
                Table={tables?.[0]} // example if you only use the first table
                fontSize4Toolbar={(size: number) => size}
                onZoomOut={() => setZoom((prev) => prev - 0.5)}
                onZoomIn={() => setZoom((prev) => prev + 0.5)}
                eraseMode={eraseMode}
                onEraser={handleEraserPressed}
                onRulerMode={handleRulerMode}
                onTextMode={handleTextMode}
                onImageMode={handleImageMode}
                onAudioMode={handleAudioMode}
                onAddImageFromGallery={() => addImage(SRC_GALLERY)}
                onAddImageFromCamera={() => addImage(SRC_CAMERA)}
                onAddAudio={handleAddAudio}
                onBrushMode={onBrushMode}
                onMarkerMode={onMarkerMode}
                onVoiceMode={onVoiceMode}
                onTableMode={onTableMode}
                TableActions={TableActions}
                isRulerMode={mode === EditModes.Ruler}
                isTableMode={mode === EditModes.Table}
                isMarkerMode={mode === EditModes.Marker}
                isTextMode={mode === EditModes.Text}
                isAudioMode={mode === EditModes.Audio} // todo
                isImageMode={mode === EditModes.Image}
                isVoiceMode={false}
                isBrushMode={mode === EditModes.Brush}
                fontSize={fontSize}
                textAlignment={textAlignment}
                showCenterTextAlignment={false} // or some logic
                strokeWidth={strokeWidth}
                markerWidth={markerWidth}
                sideMargin={sideMargin}
                onSelectColor={handleSelectColor}
                color={colorByMode(mode, brushColor, textColor, markerColor, rulerColor, tableColor)}
                onSelectTextSize={onTextSize}
                onSelectTextAlignment={onTextAlignment}
                onSelectBrushSize={onBrushSize}
                onSelectMarkerSize={onMarkerSize}
                onToolBarDimensionsChange={handleToolbarDimensionChange}
                maxFloatingHeight={windowSize.height - keyboardHeight}
            />
            <View style={styles.topMargin} />

            <Canvas
                style={{ overflow: 'hidden', backgroundColor: 'gray' }}
                offset={moveCanvas}
                canvasWidth={windowSize.width}
                canvasHeight={windowSize.height}
                onActualCanvasSize={(actualSize => setCanvasSize(actualSize))}
                zoom={zoom}
                minSideMargin={sideMargin}
                paths={paths}
                texts={texts}
                lines={lines}
                images={images}
                tables={tables}
                currentEdited={currentEdited}
                onTextChanged={handleTextChanged}
                onSketchStart={handleSketchStart}
                onSketchStep={handleSketchStep}
                onSketchEnd={handleSketchEnd}
                onCanvasClick={handleCanvasClick}
                onMoveElement={handleMove}
                onMoveEnd={handleMoveEnd}
                onMoveTablePart={handleMoveTablePart}
                onMoveTablePartEnd={handleMoveTablePartEnd}
                onDeleteElement={handleDelete}
                onTextYOverflow={handleTextYOverflow}
                imageSource={{ uri: currentFile }}
                currentElementType={mode2ElementType(mode)}
            />
        </SafeAreaView>
    );
}

// -------------------------------------------------------------------------
//                             STYLES
// -------------------------------------------------------------------------
const styles = StyleSheet.create({
    mainContainer: {
        zIndex: 10,
        backgroundColor: semanticColors.mainAreaBG,
        width: '100%',
        height: '100%',
    },
    topMargin: {
        height: dimensions.toolbarMargin,
        width: '100%',
        zIndex: 25,
        backgroundColor: semanticColors.mainAreaBG,
    },
});