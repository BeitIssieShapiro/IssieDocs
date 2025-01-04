import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    ImageSize,
    SafeAreaView,
    StyleSheet,
    View,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { ElementBase, ElementTypes, MoveTypes, Offset, SketchElement, SketchImage, SketchLine, SketchPath, SketchPoint, SketchTable, SketchText, TableContext } from './canvas/types';
import { Canvas } from './canvas/canvas';
import DoQueue from './do-queue';
import { FileSystem } from './filesystem';
import { trace } from './log';
import { arrLast, pageTitleAddition, setNavParam } from './utils';
import { colors, dimensions, semanticColors } from './elements';
import EditorToolbar from './editor-toolbar';
import { SRC_CAMERA, SRC_GALLERY } from './newPage';
import { EditModes, RootStackParamList } from './types';
import { backupElement, cloneElem, restoreElement } from './canvas/utils';
import { MARKER_TRANSPARENCY_CONSTANT } from './svg-icons';

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

    const [windowSize, setWindowSize] = useState<ImageSize>({ width: 500, height: 500 });
    const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
    const [zoom, setZoom] = useState<number>(1);
    const [status, setStatus] = useState<string>("");
    const [moveCanvas, setMoveCanvas] = useState<Offset>({ x: 0, y: 0 });
    const [mode, setMode] = useState<EditModes>(EditModes.Brush);
    const [eraseMode, setEraseMode] = useState<boolean>(false);
    const [openContextMenu, setOpenContextMenu] = useState<boolean>(false);
    const [currentFile, setCurrentFile] = useState<string>(page.defaultSrc);


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
    const [markerWidth, setMarkerWidth] = useState<number>(5);
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

        updateCurrentEditedText();
    }, [mode, fontSize, textAlignment, strokeWidth, markerWidth, sideMargin,
        brushColor, rulerColor, markerColor, textColor, tableColor]);


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
                    // } else if (q[i].type === 'imagePosition') {
                    //     const elemIndex = canvasImages.findIndex(ci => ci.id === q[i].elem.id);
                    //     if (elemIndex >= 0) {
                    //         const updatedImage = { ...canvasImages[elemIndex], ...q[i].elem }
                    //         canvasImages[elemIndex] = imageNorm2Scale(updatedImage)
                    //     }
                    // } else if (q[i].type === 'imageDelete') {
                    //     const elemIndex = canvasImages.findIndex(ci => ci.id === q[i].elem.id);
                    //     if (elemIndex >= 0) {
                    //         canvasImages.splice(elemIndex, 1);
                    //     }
                    // } else if (q[i].type === 'table') {
                    //     canvasTables = canvasTables.filter(t => t.id !== q[i].elem.id);
                    //     canvasTables.push(q[i].elem);
                    // } else if (q[i].type === 'tableDelete') {
                    //     canvasTables = canvasTables.filter(t => t.id !== q[i].elemID);
                    //     // delete all cell text related
                    //     tableCellTexts = tableCellTexts.filter(tct => tct.tableCell.tableID !== q[i].elemID)
                    // } else if (q[i].type === 'audio') {
                    //     canvasAudio.push(q[i].elem);
                    // } else if (q[i].type === 'audioDelete') {
                    //     canvasAudio = canvasAudio.filter(t => t.id !== q[i].elem.id);
                    // } else if (q[i].type === 'audioPosition') {
                    //     const elemIndex = canvasAudio.findIndex(ci => ci.id === q[i].elem.id);
                    //     if (elemIndex >= 0) {
                    //         const updatedAudio = { ...canvasAudio[elemIndex], ...q[i].elem }
                    //         canvasAudio[elemIndex] = updatedAudio;
                    //     }
                    // }
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
        saveText()
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
                id: "S" + Math.random() * 10000,
                points: [p],
                color,
                strokeWidth,
            };

            pathsRef.current.push(newPath);
            setPaths([...pathsRef.current]);

        } else if (modeRef.current === EditModes.Ruler) {
            const newLine: SketchLine = {
                id: "L" + Math.random() * 10000,
                from: p,
                to: p,
                color: rulerColorRef.current,
                strokeWidth: strokeWidthRef.current,
                editMode: false,
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
        }

        save();
        queue2state();
    }

    // -------------------------------------------------------------------------
    //                          TEXT HANDLERS
    // -------------------------------------------------------------------------

    function saveText() {
        if (modeRef.current != EditModes.Text) return;
        const textElem = textsRef.current.find(t => t.editMode);
        if (textElem) {
            // todo verify text elem has changed
            delete textElem.editMode;
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
                    textElem.editMode = true;

                    // Update the font and color based on the selected text
                    setFontSize(textElem.fontSize);
                    setTextColor(textElem.color);
                    setTextAlignment(textElem.rtl?'Right':'Left')
                }
            } else {
                const newTextElem: SketchText = {
                    id: "T" + Math.random() * 10000,
                    text: "",
                    color: brushColorRef.current,
                    rtl: textAlignmentRef.current == 'Right',
                    fontSize: fontSizeRef.current,
                    editMode: true,
                    x: p[0],
                    y: p[1],
                };
                textsRef.current.push(newTextElem);
            }

            setTexts([...textsRef.current]);
        } else if (modeRef.current === EditModes.Ruler && elem) {
            console.log("Line clicked", elem);
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

    // NEW OR UPDATED: addImage references
    function addImage(srcType: string) {
        console.log("Add image from", srcType);
        // Possibly open camera / gallery
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
            queue.current.pushDeleteTable(id);
            queue2state()
            save();
        },
        addTable: (cols: number, rows: number, color: string, borderWidth: number, style: any) => {
            trace("add table", style)
        },
        setRowsOrColumns: (newVal: number, isCols: boolean) => { },
        setColor: (newColor: string) => { },
        setBorderWidth: (borderWidth: number) => { },
        setBorderStyle: (borderStyle: string) => { } //"2,2", ..

    };

    function updateCurrentEditedText() {
        const textElem = textsRef.current.find(t => t.editMode);
        if (textElem) {
            textElem.color = textColorRef.current;
            textElem.fontSize = fontSizeRef.current;
            textElem.rtl = textAlignmentRef.current == 'Right';
            setTexts([...textsRef.current]);
        }
    }

    function handleSelectColor(newColor: string) {
        if (isBrushMode()) {
            setBrushColor(newColor)
        } else if (isRulerMode()) {
            setRulerColor(newColor);
        } else if (isTextMode()) {
            setTextColor(newColor);
        } else if (isMarkerMode()) {
            setMarkerColor(newColor);
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

    function colorByMode() {
        if (modeRef.current == EditModes.Brush) return brushColorRef.current;
        if (modeRef.current == EditModes.Text) return textColorRef.current;
        if (modeRef.current == EditModes.Marker) return markerColorRef.current;
        if (modeRef.current == EditModes.Ruler) return rulerColorRef.current;
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
                color={colorByMode()}
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
                zoom={zoom}
                minSideMargin={sideMargin}
                paths={paths}
                texts={texts}
                lines={lines}
                images={images}
                tables={tables}
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
                currentElementType={mode as unknown as ElementTypes}
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