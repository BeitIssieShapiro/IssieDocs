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
import { dimensions, semanticColors } from './elements';
import EditorToolbar from './editor-toolbar';
import { SRC_CAMERA, SRC_GALLERY } from './newPage';
import { EditModes, RootStackParamList } from './types';

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

    const [fontSize, setFontSize] = useState<number>(25);
    const [textAlignment, setTextAlignment] = useState<string>("left");
    const [strokeWidth, setStrokeWidth] = useState<number>(2);
    const [markerWidth, setMarkerWidth] = useState<number>(5);
    const [sideMargin, setSideMargin] = useState<number>(15);
    const [brushColor, setBrushColor] = useState<string>("#000000");
    const [rulerColor, setRulerColor] = useState<string>("#000000");

    // Corresponding Refs
    const linesRef = useRef(lines);
    const pathsRef = useRef(paths);


    const fontSizeRef = useRef(fontSize);
    const textAlignmentRef = useRef(textAlignment);
    const strokeWidthRef = useRef(strokeWidth);
    const markerWidthRef = useRef(markerWidth);
    const sideMarginRef = useRef(sideMargin);
    const brushColorRef = useRef(brushColor);
    const rulerColorRef = useRef(rulerColor);


    // -------------------------------------------------------------------------
    //                          EFFECTS
    // -------------------------------------------------------------------------

    useEffect(() => {
        pathsRef.current = paths
        linesRef.current = lines;
    }, [paths, lines]);


    useEffect(() => {
        modeRef.current = mode;
        fontSizeRef.current = fontSize;
        textAlignmentRef.current = textAlignment;
        strokeWidthRef.current = strokeWidth;
        markerWidthRef.current = markerWidth;
        sideMarginRef.current = sideMargin;
        brushColorRef.current = brushColor;
        rulerColorRef.current = rulerColor;
    }, [mode, fontSize, textAlignment, strokeWidth, markerWidth, sideMargin, brushColor, rulerColor]);


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
        console.log("queue:", q)
        let _texts = [] as SketchText[];
        let _images = [] as SketchImage[];
        let _tables = [] as SketchTable[]
        let _paths = [] as SketchPath[];
        let _rulers = [] as SketchLine[];
        let _audio = [] as SketchElement[];

        for (let i = 0; i < q.length; i++) {
            if (q[i].type === 'text') {
                const txtElem = q[i].elem

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
            } else if (q[i].type === 'path') {
                _paths.push(q[i].elem);
            } else if (q[i].type === 'line') {
                _rulers = _rulers.filter(l => l.id !== q[i].elem.id);
                _rulers.push(q[i].elem);
            } else if (q[i].type === 'lineDelete') {
                _rulers = _rulers.filter(l => l.id !== q[i].elemID);
            } else if (q[i].type === 'image') {
                // translate the relative path to full path:
                let elem = q[i].elem;
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
        setPaths(_paths);
        setTexts(_texts);
        setLines(_rulers);
        // TODO

    }

    // -------------------------------------------------------------------------
    //                          SKETCH HANDLERS
    // -------------------------------------------------------------------------
    function handleSketchStart(p: SketchPoint) {
        //console.log("Sketch Start", modeRef.current, p);
        if (isBrushMode()) {
            const newPath: SketchPath = {
                id: "S" + Math.random() * 10000,
                points: [p],
                color: brushColorRef.current,
                strokeWidth: strokeWidthRef.current,
            };

            pathsRef.current.push(newPath);
            setPaths([...pathsRef.current]);

        } else if (modeRef.current === EditModes.Ruler) {
            const newLine: SketchLine = {
                id: "L" + Math.random() * 10000,
                from: p,
                to: p,
                color: rulerColorRef.current,
                strokeWidth: 2,
                editMode: false,
            };
            linesRef.current.push(newLine);
            setLines([...linesRef.current]);
        }
    }

    function handleSketchStep(p: SketchPoint) {
        //trace("Sketch Step",  p);
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
    function handleTextChanged(id: string, newText: string) {
        setTexts((currTexts) =>
            currTexts.map((t) => (t.id === id ? { ...t, text: newText } : t))
        );
    }

    function handleCanvasClick(p: SketchPoint, elem: ElementBase | TableContext | undefined) {
        if (modeRef.current === EditModes.Text) {
            setTexts((currTexts) => {
                let clickedId: string | undefined;
                if (elem && 'id' in elem) {
                    clickedId = elem.id; // e.g. clicked existing text
                }

                let foundExisting = false;
                // Close all open text edits; if we clicked an existing text, re-open it
                const newTexts = currTexts.map((t) => {
                    if (t.editMode) {
                        return { ...t, editMode: undefined };
                    } else if (clickedId === t.id) {
                        foundExisting = true;
                        return { ...t, editMode: true };
                    }
                    return t;
                });

                // If none found, create new text
                if (!foundExisting) {
                    const newTextElem: SketchText = {
                        id: "T" + Math.random() * 10000,
                        text: "",
                        color: brushColorRef.current,
                        rtl: false,
                        fontSize: 25,
                        editMode: true,
                        x: p[0],
                        y: p[1],
                    };
                    newTexts.push(newTextElem);
                }
                return newTexts;
            });
        } else if (modeRef.current === EditModes.Ruler && elem) {
            console.log("Line clicked", elem);
            setLines((currLines) =>
                currLines.map((line) =>
                    line.id === (elem as SketchLine).id
                        ? { ...line, editMode: true }
                        : { ...line, editMode: false }
                )
            );
        }
    }

    // -------------------------------------------------------------------------
    //                          MOVE / DRAG HANDLERS
    // -------------------------------------------------------------------------
    function handleMove(type: MoveTypes, id: string, p: SketchPoint) {
        console.log("Move", type, id, p);
        if (type === MoveTypes.Text) {
            setStatus("Move Text:" + p[0] + "," + p[1]);
            setTexts((currTexts) =>
                currTexts.map((t) => (t.id === id ? { ...t, x: p[0], y: p[1] } : t))
            );
        } else if (type === MoveTypes.LineStart || type === MoveTypes.LineEnd) {
            setLines((currLines) =>
                currLines.map((line) => {
                    if (line.id === id) {
                        if (type === MoveTypes.LineStart) {
                            line.from = [p[0], p[1]];
                        } else {
                            line.to = [p[0], p[1]];
                        }
                    }
                    return line;
                })
            );
        }
    }

    function handleMoveEnd(type: MoveTypes, id: string) {
        console.log("Move end", type, id);
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
            setLines((currLines) => currLines.filter((l) => l.id !== id));
        }
        // Add more logic for other element types as needed
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
        // For do-queue undo/redo if needed
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
        setMode(EditModes.Ruler);
    }
    function handleTextMode() {
        setMode(EditModes.Text);
    }
    function handleImageMode() {
        setMode(EditModes.Image);
    }
    function handleAudioMode() {
        console.log("Audio mode not implemented yet");
        // setMode(EditModes.Audio); // if you have an Audio mode
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
        setMode(EditModes.Brush);
    }

    // Marker Mode
    function onMarkerMode() {
        console.log("Marker mode not implemented yet");
        // setMode(EditModes.Marker);
    }

    // Voice Mode
    function onVoiceMode() {
        console.log("Voice mode not implemented yet");
        // setMode(EditModes.Voice);
    }

    // Table Mode
    function onTableMode() {
        console.log("Table mode not implemented yet");
        // setMode(EditModes.Table);
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

    // TableActions placeholder
    const TableActions = {};

    // NEW OR UPDATED: handleSelectColor for the color palette
    function handleSelectColor(newColor: string) {
        if (isBrushMode()) {
            setBrushColor(newColor)
        } else if (isRulerMode()) {
            setRulerColor(newColor);
        }
    }

    // NEW OR UPDATED: handle text size, text alignment, brush & marker size
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
                isRulerMode={mode === EditModes.Ruler}
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
                isTableMode={isTableMode()}
                isMarkerMode={isMarkerMode()}
                isTextMode={isTextMode()}
                isAudioMode={isAudioMode()}
                isImageMode={isImageMode()}
                isVoiceMode={isVoiceMode()}
                isBrushMode={isBrushMode()}
                fontSize={fontSize}
                textAlignment={textAlignment}
                showCenterTextAlignment={false} // or some logic
                strokeWidth={strokeWidth}
                markerWidth={markerWidth}
                sideMargin={sideMargin}
                onSelectColor={handleSelectColor}
                color={brushColor}
                onSelectTextSize={onTextSize}
                onSelectTextAlignment={onTextAlignment}
                onSelectBrushSize={onBrushSize}
                onSelectMarkerSize={onMarkerSize}
                onToolBarDimensionsChange={handleToolbarDimensionChange}
                maxFloatingHeight={0}
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