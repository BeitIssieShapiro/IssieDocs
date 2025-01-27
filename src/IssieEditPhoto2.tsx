import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ImageSize,
    Keyboard,
    SafeAreaView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import * as Progress from 'react-native-progress';
import Share from 'react-native-share';
import { StackScreenProps } from '@react-navigation/stack';
import { CurrentEdited, ElementBase, ElementTypes, MoveTypes, Offset, SketchElement, SketchElementAttributes, SketchImage, SketchLine, SketchPath, SketchPoint, SketchTable, SketchText, TableContext } from './canvas/types';
import Canvas from './canvas/canvas';
import DoQueue from './do-queue';
import { FileSystem } from './filesystem';
import { trace } from './log';
import { arrLast, pageTitleAddition, setNavParam } from './utils';
import { colors, dimensions, getImageDimensions, getRoundedButton, globalStyles, Icon, semanticColors, Spacer } from './elements';
import EditorToolbar from './editor-toolbar';
import { getNewPage, SRC_CAMERA, SRC_FILE, SRC_GALLERY, SRC_RENAME } from './newPage';
import { EditModes, RootStackParamList } from './types';
import { backupElement, calcEffectiveHorizontalLines, calcRatio, cloneElem, getId, restoreElement, tableColWidth, tableHeight, tableRowHeight, tableWidth, wait } from './canvas/utils';
import { MARKER_TRANSPARENCY_CONSTANT } from './svg-icons';
import { fTranslate, isRTL, translate } from './lang';
import { FileContextMenu } from './file-context-menu';
import { AudioElement2 } from './audio-elem-new';
import { generatePDF } from './pdf';
import { Text } from 'react-native';
import { migrateMetadata } from './state-migrate';
import { PathCommand } from '@shopify/react-native-skia';
import RNSystemSounds from '@dashdoc/react-native-system-sounds';
import { hideMessage, showMessage } from 'react-native-flash-message';

type EditPhotoScreenProps = StackScreenProps<RootStackParamList, 'EditPhoto'>;

export function IssieEditPhoto2({ route, navigation }: EditPhotoScreenProps) {
    const { page, folder, share, goHome, pageIndex, insets, headerHeight } = route.params;

    // -------------------------------------------------------------------------
    //                          STATE & REFS
    // -------------------------------------------------------------------------
    const [paths, setPaths] = useState<SketchPath[]>([]);
    const [lines, setLines] = useState<SketchLine[]>([]);
    const [texts, setTexts] = useState<SketchText[]>([]);
    const [images, setImages] = useState<SketchImage[]>([]);
    const [tables, setTables] = useState<SketchTable[]>([]);
    const [audios, setAudios] = useState<SketchElement[]>([]);
    const [currentEdited, setCurrentEdited] = useState<CurrentEdited>({});

    const [windowSize, setWindowSize] = useState<ImageSize>(Dimensions.get("window"));

    const [canvasSize, setCanvasSize] = useState<ImageSize>({ width: -1, height: -1 })
    const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
    const [keyboardTop, setKeyboardTop] = useState<number>(0);
    const [toolbarHeight, setToolbarHeight] = useState<number>(dimensions.toolbarHeight);
    const [floatingToolbarHeight, setFloatingToolbarHeight] = useState<number>(0);

    const [ratio, setRatio] = useState<number>(1);
    const [zoom, setZoom] = useState<number>(1);
    const [status, setStatus] = useState<string>("");
    const [moveCanvas, setMoveCanvas] = useState<Offset>({ x: 0, y: 0 });
    const [mode, setMode] = useState<EditModes>(EditModes.Text);
    const [eraseMode, setEraseMode] = useState<boolean>(false);
    const [openContextMenu, setOpenContextMenu] = useState<boolean>(false);
    const [currentFile, setCurrentFile] = useState<string>(page.defaultSrc);
    const [currPageIndex, setCurrPageIndex] = useState<number>(pageIndex ?? 0);
    const [busy, setBusy] = useState<boolean>(false);


    const pageRef = useRef(page);
    const metaDataUri = useRef("");
    const currPageIndexRef = useRef(pageIndex ?? 0);
    const currentFileRef = useRef(currentFile);
    const queue = useRef(new DoQueue(async (attachName: string) => {
        console.log("File Evicted from queue");
        await FileSystem.main.deleteAttachedFile(pageRef.current, currPageIndexRef.current, attachName);
    }));

    const modeRef = useRef<EditModes>(mode);
    const canvasRef = useRef<any>(null);
    const toolbarRef = useRef<any>(null);
    const windowSizeRef = useRef(windowSize);
    const toolbarHeightRef = useRef(toolbarHeight);
    const canvasTop = useRef(headerHeight + insets.top + toolbarHeight + dimensions.toolbarMargin);


    const [fontSize, setFontSize] = useState<number>(35);
    const [textAlignment, setTextAlignment] = useState<string>(isRTL() ? "Right" : "Left");
    const [strokeWidth, setStrokeWidth] = useState<number>(2);
    const [markerWidth, setMarkerWidth] = useState<number>(20);
    const [rulerStrokeWidth, setRulerStrokeWidth] = useState<number>(2);

    const [sideMargin, setSideMargin] = useState<number>(dimensions.minSideMargin);
    const [brushColor, setBrushColor] = useState<string>(colors.black);
    const [rulerColor, setRulerColor] = useState<string>(colors.black);
    const [markerColor, setMarkerColor] = useState<string>(colors.yellow);
    const [textColor, setTextColor] = useState<string>(colors.black);
    const [tableColor, setTableColor] = useState<string>(colors.blue);

    const [shareProgress, setShareProgress] = useState<number>(-1)
    const [shareProgressPage, setShareProgressPage] = useState<number>(1)


    // Corresponding Refs
    const linesRef = useRef(lines);
    const pathsRef = useRef(paths);
    const textsRef = useRef(texts);
    const imagesRef = useRef(images);
    const tablesRef = useRef(tables);
    const audiosRef = useRef(audios);
    const currentEditedRef = useRef<CurrentEdited>(currentEdited);
    const canvasSizeRef = useRef<ImageSize>(canvasSize);
    const eraseModeRef = useRef<boolean>(false);

    const ratioRef = useRef(ratio);
    const keyboardHeightRef = useRef(keyboardHeight);
    const keyboardTopRef = useRef(0);

    const fontSizeRef = useRef(fontSize);
    const textAlignmentRef = useRef(textAlignment);
    const strokeWidthRef = useRef(strokeWidth);
    const rulerStrokeWidthRef = useRef(rulerStrokeWidth);
    const markerWidthRef = useRef(markerWidth);
    const sideMarginRef = useRef(sideMargin);
    const brushColorRef = useRef(brushColor);
    const rulerColorRef = useRef(rulerColor);
    const markerColorRef = useRef(markerColor);
    const textColorRef = useRef(textColor);
    const tableColorRef = useRef(tableColor);
    const moveCanvasRef = useRef(moveCanvas);
    const moveRepeatRef = useRef<{ offset: Offset, interval: NodeJS.Timeout } | undefined>();
    const zoomRef = useRef(zoom);

    const dragToMoveCanvasRef = useRef<{
        initialOffset: Offset;
        initialPt: SketchPoint;
    } | undefined>()


    // -------------------------------------------------------------------------
    //                          EFFECTS
    // -------------------------------------------------------------------------

    useEffect(() => {
        //trace("Refs change", mode)
        modeRef.current = mode;
        fontSizeRef.current = fontSize;
        textAlignmentRef.current = textAlignment;
        strokeWidthRef.current = strokeWidth;
        rulerStrokeWidthRef.current = rulerStrokeWidth;
        markerWidthRef.current = markerWidth;
        sideMarginRef.current = sideMargin;
        brushColorRef.current = brushColor;
        rulerColorRef.current = rulerColor;
        markerColorRef.current = markerColor;
        textColorRef.current = textColor;
        tableColorRef.current = tableColor;
        canvasSizeRef.current = canvasSize;
        currPageIndexRef.current = currPageIndex;
        currentFileRef.current = currentFile;
        moveCanvasRef.current = moveCanvas;
        zoomRef.current = zoom;
        keyboardHeightRef.current = keyboardHeight;
        eraseModeRef.current = eraseMode;

        updateCurrentEditedElements();
    }, [mode, fontSize, textAlignment, strokeWidth, rulerStrokeWidth, markerWidth, sideMargin,
        brushColor, rulerColor, markerColor, textColor, tableColor, canvasSize,
        currPageIndex, currentFile, moveCanvas, zoom, keyboardHeight, eraseMode]);

    useEffect(() => {
        currentEditedRef.current = currentEdited;
    }, [currentEdited])

    useEffect(() => {
        canvasTop.current = headerHeight + insets.top + toolbarHeight + dimensions.toolbarMargin
        calcCanvasRatio(currentFileRef.current);
    }, [toolbarHeight])


    async function calcCanvasRatio(imgPath: string) {
        const res = await calcRatio(imgPath, dimensions.minSideMargin,
            {
                width: windowSizeRef.current.width,
                height: windowSizeRef.current.height - toolbarHeightRef.current - dimensions.toolbarMargin * 2 - headerHeight - insets.top - insets.bottom
            });
        //trace("calcRatio", res, toolbarHeightRef.current)
        setCanvasSize(res.actualSize);
        canvasSizeRef.current = res.actualSize;
        setSideMargin(res.actualSideMargin);
        setRatio(res.ratio);
        ratioRef.current = res.ratio;

    }

    async function loadPage(newPage: any, index: number) {
        const newCurrentFile = newPage.getPage(index);
        setCurrentFile(newCurrentFile);
        setCurrPageIndex(index);
        setZoom(1);
        setMoveCanvas({ x: 0, y: 0 });

        trace("EditPhoto CurrentFile: ", newCurrentFile);
        if (newPage.count > 0) {
            setNavParam(navigation, 'pageTitleAddition', pageTitleAddition(newPage.count, index));
        }

        pageRef.current = newPage;
        metaDataUri.current = newCurrentFile + ".json";

        await calcCanvasRatio(newCurrentFile);

        await loadMetadata(ratioRef.current, canvasSizeRef.current).then(() => queue2state(true));
    }
    //trace("win-size", windowSize)
    useEffect(() => {
        setNavParam(navigation, 'onMoreMenu', () => setOpenContextMenu(true));
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', _keyboardDidShow);
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', _keyboardDidHide);

        const handleChange = ({ window }: any) => {
            setWindowSize(window);
            windowSizeRef.current = window;
            calcCanvasRatio(currentFileRef.current);
        };

        const subscription = Dimensions.addEventListener('change', handleChange);
        loadPage(page, (pageIndex != undefined && pageIndex > 0 ? pageIndex : 0)).then(() => {
            if (share) {
                doShare();
            }
        })

        return () => {
            // Cleanup 
            saveText();
            subscription?.remove()
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function _keyboardDidShow(e: any) {
        const newKbHeight = e.endCoordinates.height - dimensions.toolbarMargin

        setKeyboardHeight(newKbHeight);
        keyboardHeightRef.current = newKbHeight;

        // check if a text box in edit:
        const textElem = currentEditedRef.current.textId ? textsRef.current.find(t => t.id == currentEditedRef.current.textId) : undefined;

        let kbTop = (e.endCoordinates.screenY - (canvasTop.current));

        setKeyboardTop(kbTop)
        keyboardTopRef.current = kbTop
        if (textElem) {
            const elemHeight = (textElem.height ?? 20);
            let elemBottom = (textElem.y + elemHeight + moveCanvasRef.current.y) * ratioRef.current * zoomRef.current;
            if (textElem.tableId) {
                const table = tablesRef.current.find(t => t.id == textElem.tableId);
                if (table) {
                    const horizontalLines = calcEffectiveHorizontalLines(table, textsRef.current);
                    elemBottom = horizontalLines[textElem.y] + elemHeight;
                }
            }
            if (elemBottom > kbTop) {
                trace("text behind kb", elemBottom, kbTop, elemHeight, "ratio", ratioRef.current, "zoom", zoomRef.current)
                const dy = (kbTop - elemBottom) / (ratioRef.current * zoomRef.current);
                handleMoveCanvas({ x: moveCanvasRef.current.x, y: moveCanvasRef.current.y + dy - 3 })
            }
        }
    }
    function _keyboardDidHide() {
        if (zoomRef.current == 1) {
            setMoveCanvas({ x: 0, y: 0 });
        }
    }

    async function loadMetadata(ratio: number, canvasSize: ImageSize) {
        queue.current.clear();
        const value = await FileSystem.main.loadFile(metaDataUri.current).catch(e => {/**left blank, as expetced */ }) || "[]";
        const sketchState = JSON.parse(value);
        let elements: any[];
        if (Array.isArray(sketchState)) {
            elements = migrateMetadata(sketchState, canvasSize, ratio)
        } else {
            //if (sketchState.version == "2.0") {
            elements = sketchState.elements;
            //} 
        }
        for (let i = 0; i < elements.length; i++) {
            queue.current.add(elements[i]);
        }
        trace("load metadata - end", new Date().toISOString());
    }

    const save = async () => {
        let elements = queue.current.getAll();
        const content = JSON.stringify({
            version: "2.0",
            elements: elements
        }, undefined, " ");
        await FileSystem.main.writeFile(metaDataUri.current, content)
            .catch((e) => Alert.alert("File Save Failed" + e))

        //  Save thumbnail
        if (currPageIndexRef.current === 0) {
            await canvasRef.current?.toThumbnail()
                .then((uri: string) => {
                    // do not block for saving the thumbnail
                    setTimeout(() => FileSystem.main.saveThumbnail(uri, pageRef.current));
                }).catch((e: any) => trace("error save thumbnail", e));
        }
    }

    const doShare = async () => {
        const shareTimeMs = 2000;

        //iterates over all files and exports them
        //this.setState({ sharing: true, shareProgress: 0, shareProgressPage: 1 });
        const dataUrls = [];
        setShareProgressPage(1);


        //let interval = pageRef.current.count * shareTimeMs / 11;
        setShareProgress(0);
        //let intervalObj = setInterval(() => setShareProgress(prev => prev + 10), interval);

        await wait(shareTimeMs);
        try {
            const uri = await canvasRef.current?.toExport();
            await canvasRef.current?.toExport()
            dataUrls.push(uri);
            for (let i = 1; i < pageRef.current.count; i++) {
                setShareProgressPage(i + 1);
                setShareProgress(i / pageRef.current.count)
                await loadPage(pageRef.current, i);
                await wait(shareTimeMs);
                const uri = await canvasRef.current?.toExport();
                dataUrls.push(uri);
            }

            //clearInterval(intervalObj);
            //avoid reshare again
            setNavParam(navigation, 'share', false);
            // Always create PDF file
            trace("about to generate PDF", dataUrls.length)
            const shareUrl = "file://" + (await generatePDF(dataUrls));
            trace("about to share", shareUrl)
            setShareProgress(-1);

            if (shareUrl) {
                // Define share options
                const shareOptions = {
                    title: translate("ShareWithTitle"),
                    subject: translate("ShareEmailSubject"),
                    url: shareUrl,
                    type: 'application/pdf',
                    //saveToFiles: true,
                    //showAppsToView: true,
                };

                // Share the PDF
                Share.open(shareOptions)
                    .then(() => {
                        Alert.alert(translate("ShareSuccessful"));
                    })
                    .catch((err: any) => {
                        if (err && err.error !== 'User did not share') {
                            Alert.alert("Error sharing PDF");
                        }
                        // Handle other errors or user cancellations if necessary
                    })
            } else {
                Alert.alert("Failed to generate PDF for sharing.");
            }
        } catch (e) {
            console.log("Share failed", e)
        }
    }


    const queue2state = (updateToolsState?: boolean) => {
        let q = queue.current.getAll();

        //console.log("Queue:", q.map(elem=>`${elem.type}: ${elem.elem.from+","+elem.elem.to}\n`))

        let _texts = [] as SketchText[];
        let _images = [] as SketchImage[];
        let _tables = [] as SketchTable[]
        let _paths = [] as SketchPath[];
        let _rulers = [] as SketchLine[];
        let _audio = [] as SketchElement[];

        let fontSize
        let textAlignment
        let strokeWidth
        let markerStrokeWidth
        let markerColor
        let brushColor
        let rulerColor
        let rulerStrokeWidth
        let textColor
        let latestMode: EditModes | undefined

        for (let i = 0; i < q.length; i++) {
            if (q[i].type === 'text') {
                const txtElem = cloneElem(q[i].elem);

                //first try to find same ID and replace, or add it
                let found = false;

                fontSize = txtElem.fontSize;
                if (!txtElem.alignment) {
                    txtElem.alignment = txtElem.rtl ? "Right" : "Left";
                }
                textAlignment = txtElem.alignment;
                textColor = txtElem.color;
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
                    latestMode = EditModes.Marker;
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
                latestMode = EditModes.Ruler;
            } else if (q[i].type === 'lineDelete') {
                _rulers = _rulers.filter(l => l.id !== q[i].elem.id);
                latestMode = EditModes.Ruler;
            } else if (q[i].type === 'image') {
                // translate the relative path to full path:
                let elem = cloneElem(q[i].elem);
                if (elem.file) {
                    elem = {
                        ...elem,
                        ...(elem.file ? { src: { uri: FileSystem.main.getAttachmentBase(pageRef.current, currPageIndexRef.current) + elem.file } } : {})
                    }
                }
                _images.push(elem);
                latestMode = EditModes.Image;
            } else if (q[i].type === 'imagePosition') {
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
                    latestMode = EditModes.Image;
                }
            } else if (q[i].type === 'imageDelete') {
                const elemIndex = _images.findIndex(ci => ci.id === q[i].elem.id);
                if (elemIndex >= 0) {
                    _images.splice(elemIndex, 1);
                    latestMode = EditModes.Image;
                }
            } else if (q[i].type === 'table') {
                _tables = _tables.filter(t => t.id !== q[i].elem.id);
                const tableElem = cloneElem(q[i].elem) as SketchTable;
                if (tableElem.strokeDash && !Array.isArray(tableElem.strokeDash)) {
                    tableElem.strokeDash = (tableElem.strokeDash as string).split(",").map((n: string) => parseInt(n)) as [number, number];
                }
                _tables.push(tableElem);
                latestMode = EditModes.Table;
            } else if (q[i].type === 'tableDelete') {
                _tables = _tables.filter(t => t.id !== q[i].elem.id);
                // delete all cell text related
                _texts = _texts.filter(tct => tct.tableId !== q[i].elemID)
                latestMode = EditModes.Table;
            } else if (q[i].type === 'audio') {
                _audio.push(cloneElem(q[i].elem));
                latestMode = EditModes.Audio;
            } else if (q[i].type === 'audioDelete') {
                _audio = _audio.filter(t => t.id !== q[i].elem.id);
                latestMode = EditModes.Audio;
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
        audiosRef.current = _audio;

        setPaths(_paths);
        setTexts(_texts);
        setLines(_rulers);
        setImages(_images);
        setTables(_tables);
        setAudios(_audio);

        if (updateToolsState) {
            if (fontSize != undefined) setFontSize(fontSize * ratioRef.current);
            if (textAlignment != undefined) setTextAlignment(textAlignment);
            if (strokeWidth != undefined) setStrokeWidth(strokeWidth);
            if (markerStrokeWidth != undefined) setMarkerWidth(markerStrokeWidth);
            if (markerColor != undefined) setMarkerColor(markerColor);
            if (brushColor != undefined) setBrushColor(brushColor);
            if (rulerColor != undefined) setRulerColor(rulerColor);
            if (rulerStrokeWidth != undefined) setRulerStrokeWidth(rulerStrokeWidth);
            if (textColor != undefined) setTextColor(textColor);
            if (latestMode != undefined) {
                setMode(latestMode);
                if ([EditModes.Audio, EditModes.Image, EditModes.Ruler, EditModes.Table, EditModes.Marker].includes(latestMode)) {
                    // expand the ext menu:
                    toolbarRef.current?.openExtMenu();
                }
            }
        }
    }

    async function beforeModeChange() {
        await saveText();
        if (modeRef.current == EditModes.Audio) {
            const audioElem = audiosRef.current.find(au => au.editMode)
            if (audioElem) {
                audiosRef.current = audiosRef.current.filter(au => !au.editMode);
                setAudios([...audiosRef.current]);
            }
        }
    }

    // -------------------------------------------------------------------------
    //                          SKETCH HANDLERS
    // -------------------------------------------------------------------------
    function handleSketchStart(p: SketchPoint) {
        console.log("Sketch Start", modeRef.current, p);
        if (modeRef.current === EditModes.Marker || modeRef.current === EditModes.Brush) {
            let color = isMarkerMode() ? markerColorRef.current + MARKER_TRANSPARENCY_CONSTANT : brushColorRef.current;
            let strokeWidth = isMarkerMode() ? markerWidthRef.current : strokeWidthRef.current;
            if (eraseModeRef.current) {
                color = '#00000000';
                strokeWidth = (strokeWidth * 3 < 15 ? 15 : strokeWidth * 3)
            }
            trace("selected stroke width", strokeWidth)
            const newPath: SketchPath = {
                id: getId("S"),
                points: [p],
                color,
                strokeWidth,
                isMarker: isMarkerMode(),
            };

            pathsRef.current.push(newPath);
            setPaths([...pathsRef.current]);

        } else if (modeRef.current === EditModes.Ruler) {
            const newLine: SketchLine = {
                id: getId("L"),
                from: p,
                to: p,
                color: rulerColorRef.current,
                strokeWidth: rulerStrokeWidthRef.current,
            };
            linesRef.current.push(newLine);
            setLines([...linesRef.current]);
            const newCurrEdited = { ...currentEditedRef.current, lineId: newLine.id }
            currentEditedRef.current = newCurrEdited
            setCurrentEdited(newCurrEdited);

        } else if (modeRef.current === EditModes.Text) {
            trace("sketch start text")

        }
    }

    function handleSketchStep(p: SketchPoint) {
        // if (isBrushMode() || isMarkerMode()) {
        //     const lastPath = arrLast(pathsRef.current);
        //     if (lastPath) {
        //         lastPath.points.push(p);
        //         setPaths([...pathsRef.current]);
        //         trace("Sketch Step", pathsRef.current.map(p => p.id), lastPath.color);
        //     }
        // } else 
        if (isRulerMode()) {
            const lastLine = arrLast(linesRef.current);
            if (lastLine) {
                lastLine.to = p;
                setLines([...linesRef.current]);
            }
        } else if (isTextMode()) {

            if (!dragToMoveCanvasRef.current) {
                dragToMoveCanvasRef.current = {
                    initialOffset: { ...moveCanvasRef.current },
                    initialPt: p
                }
            }
            const dy = (p[1] - dragToMoveCanvasRef.current.initialPt[1]) / ratioRef.current;
            handleMoveCanvas({ x: dragToMoveCanvasRef.current.initialOffset.x, y: dragToMoveCanvasRef.current.initialOffset.y + dy });
            trace("text sketch step", p)

        }
    }

    function handleSketchEnd(commands?: PathCommand[]) {
        if (isBrushMode() || isMarkerMode()) {
            trace("Sketch End, elem being saved")
            let color = isMarkerMode() ? markerColorRef.current + MARKER_TRANSPARENCY_CONSTANT : brushColorRef.current;
            let strokeWidth = isMarkerMode() ? markerWidthRef.current : strokeWidthRef.current;
            if (eraseModeRef.current) {
                color = '#00000000';
                strokeWidth = Math.max(15, strokeWidth * 3)
            }
            if (commands) {
                const newPath: SketchPath = {
                    id: getId("S"),
                    points: commands,
                    color,
                    strokeWidth,
                    isMarker: isMarkerMode(),
                };

                pathsRef.current.push(newPath);
                setPaths([...pathsRef.current]);

                queue.current.pushPath(newPath)
            }
        } else if (isRulerMode()) {
            const elem = arrLast(linesRef.current);
            if (!elem) return;
            queue.current.pushLine(elem);
        } else if (isTextMode()) {
            trace("text sketch release")
            dragToMoveCanvasRef.current = undefined;
            return;
        }


        save();
        queue2state();
    }

    // -------------------------------------------------------------------------
    //                          TEXT HANDLERS
    // -------------------------------------------------------------------------

    async function saveText() {
        if (modeRef.current != EditModes.Text) return;
        const textElem = textsRef.current.find(t => t.id == currentEditedRef.current.textId);
        if (textElem) {
            // verify text elem has changed
            if (textElem.backup) {
                const changedElem = restoreElement(textElem) as SketchText;
                const origElem = textElem as SketchText;
                // compare the text elements
                if (changedElem.text != origElem.text ||
                    changedElem.color != origElem.color ||
                    changedElem.fontSize != origElem.fontSize ||
                    changedElem.rtl != origElem.rtl ||
                    changedElem.alignment != origElem.alignment ||
                    changedElem.x != origElem.x ||
                    changedElem.y != origElem.y) {

                    queue.current.pushText(changedElem);
                    queue2state();
                    await save();

                }
                const newCurrEdited = { ...currentEditedRef.current, textId: undefined }
                currentEditedRef.current = newCurrEdited
                setCurrentEdited(newCurrEdited);

            } else {
                // new text element
                if (textElem.text != "") {
                    queue.current.pushText(textElem);
                    queue2state();
                    await save();

                }
                const newCurrEdited = { ...currentEditedRef.current, textId: undefined }
                currentEditedRef.current = newCurrEdited
                setCurrentEdited(newCurrEdited);
            }
        }
    }

    function selectText(textElem: SketchText) {
        backupElement(textElem);
        const newCurrEdited = { ...currentEditedRef.current, textId: textElem.id }
        currentEditedRef.current = newCurrEdited
        setCurrentEdited(newCurrEdited);

        // Update the font and color based on the selected text
        setFontSize(textElem.fontSize * ratioRef.current);
        setTextColor(textElem.color);
        setTextAlignment(textElem.alignment)
    }

    async function handleCanvasClick(p: SketchPoint, elem: ElementBase | TableContext | undefined) {
        if (isTextMode()) {
            await saveText();

            if (elem && 'id' in elem) {
                // click on existing text
                const textElem = textsRef.current.find(t => t.id == elem.id);
                if (textElem) {
                    selectText(textElem);
                }
            } else {
                if (elem && "cell" in elem && elem.cell) {
                    // search tableCell
                    const textElem = textsRef.current.find(t => elem.cell && t.x == elem.cell[0] && t.y == elem.cell[1]);
                    if (textElem) {
                        selectText(textElem);
                        return;
                    }
                }
                trace("new text", fontSizeRef.current, ratioRef.current)
                const newTextElem: SketchText = {
                    id: getId("T"),
                    text: "",
                    color: brushColorRef.current,
                    rtl: textAlignmentRef.current == 'Right',
                    alignment: textAlignmentRef.current,
                    fontSize: fontSizeRef.current / ratioRef.current,
                    x: p[0],
                    y: p[1],
                };
                if (elem && "cell" in elem) {
                    // clicked a table
                    const tableContext = elem as TableContext;
                    newTextElem.tableId = tableContext.elem.id;
                    newTextElem.x = tableContext.cell && tableContext.cell[0] || 0;
                    newTextElem.y = tableContext.cell && tableContext.cell[1] || 0;
                }
                const newCurrEdited = { ...currentEditedRef.current, textId: newTextElem.id }
                currentEditedRef.current = newCurrEdited
                setCurrentEdited(newCurrEdited);
                textsRef.current.push(newTextElem);
            }

            setTexts([...textsRef.current]);
        } else if (modeRef.current === EditModes.Ruler && elem && "id" in elem) {
            const lineElem = linesRef.current.find(line => line.id == elem.id);
            if (lineElem) {
                const newCurrEdited = { ...currentEditedRef.current, lineId: elem.id }
                currentEditedRef.current = newCurrEdited
                setCurrentEdited(newCurrEdited);
                setLines([...linesRef.current]);
            }
        } else if (modeRef.current === EditModes.Image && elem && "id" in elem) {
            trace("set current image")
            const newCurrEdited = { ...currentEditedRef.current, imageId: elem.id }
            currentEditedRef.current = newCurrEdited
            setCurrentEdited(newCurrEdited);
        } else if (modeRef.current === EditModes.Audio) {
            // first check if an edited recording exists
            const audio = audiosRef.current.find(ae => ae.editMode);
            if (audio) {
                // move it
                audio.x = p[0];
                audio.y = p[1];
                setAudios([...audiosRef.current]);
                return;
            }
            const audioElem = {
                id: getId("Aud"),
                type: "audio",
                x: p[0],
                y: p[1],
                editMode: true,
            } as SketchElement;
            //queue.current.pushAudio(audioElem);
            audiosRef.current.push(audioElem);
            setAudios([...audiosRef.current]);
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
        let [x, y] = p;
        const r = ratioRef.current;
        const z = zoomRef.current;
        const cw = canvasSizeRef.current.width;
        const ch = canvasSizeRef.current.height;
        const offx = moveCanvasRef.current.x;
        const offy = moveCanvasRef.current.y;
        const mr = sideMarginRef.current;
        const pm = dimensions.toolbarMargin;
        const kbh = keyboardHeightRef.current - dimensions.toolbarMargin;

        const getElemBox = () => {
            let elem: any;
            let moveOffset: Offset = { x: 0, y: 0 }
            if (type === MoveTypes.Text) {
                elem = textsRef.current.find(t => t.id === id);
                moveOffset.x = elem?.rtl ? -35 : -15;
                moveOffset.y = -15;
            } else if (type === MoveTypes.ImageMove) {
                elem = imagesRef.current.find(image => image.id == id);
                moveOffset = { x: -15, y: 0 }
            } else if (type === MoveTypes.TableMove) {
                elem = tablesRef.current.find(table => table.id == id);

                if (elem) {
                    const horizontalLines = calcEffectiveHorizontalLines(elem, textsRef.current);

                    return {
                        moveOffset: { x: -15, y: -15 },
                        x: elem.verticalLines[0],
                        y: horizontalLines[0],
                        width: tableWidth(elem),
                        height: horizontalLines[horizontalLines.length - 1] - horizontalLines[0],
                        moveIconOnRight: false,
                    };
                }
            } else if (type === MoveTypes.ElementMove) {
                elem = audiosRef.current.find(au => au.id == id);
                moveOffset = { x: 20, y: 20 };
            }
            if (elem) {
                const box = {
                    x: elem.x, y: elem.y, width: Math.max(elem.width, 20), height: elem.height,
                    moveIconOnRight: false,
                    moveOffset,
                };
                if (type === MoveTypes.Text && elem.rtl) {
                    box.moveIconOnRight = true
                }
                return box
            }

            trace("Default elem box")
            return { x, y, width: 0, height: 0, moveIconOnRight: false, moveOffset };
        }

        const elemBox = getElemBox();

        const marginRight = elemBox.moveIconOnRight ? 15 : 20;

        if (x + elemBox.moveOffset.x < 0) {
            trace("hit left", x + elemBox.moveOffset.x, 0)
            x = 0 - elemBox.moveOffset.x;
        }
        let xRight = x + (elemBox.moveIconOnRight ? 0 : elemBox.width);



        if ((xRight - elemBox.moveOffset.x - marginRight) * r > cw) {
            trace("hit right", (xRight - elemBox.moveOffset.x) * r, cw, marginRight)
            x = cw / r + elemBox.moveOffset.x + marginRight;
            if (!elemBox.moveIconOnRight) {
                x -= elemBox.width;
            }

        }

        if (y < 0) y = 0;
        if ((y + elemBox.height - elemBox.moveOffset.y) * r > ch) {
            trace("hit bottom", elemBox, cw, ch)
            y = ch / r - elemBox.height - elemBox.moveOffset.y;;
        }

        let rMoveX = 0;
        let rMoveY = 0;
        if ((x + offx + mr) / z < 30) {
            trace("push left")
            rMoveX = 25;
        }

        if ((y - 15 + offy - dimensions.toolbarMargin) / z < 5) {
            trace("push up")
            rMoveY = 25;
        }

        const yBottom = (y + elemBox.height) * r;

        const dy = yBottom + offy * r - (ch + pm) / z;
        trace("move info", dy, kbh)

        if (dy + kbh / z > -5) {
            trace("push down")
            rMoveY = -25;
        }

        const dx = xRight * r + offx * r - (cw + mr) / z;

        if (dx > 0) {
            trace("push right")
            rMoveX = -25;
        }


        if (!moveRepeatRef.current && ((rMoveX && rMoveX != 0) || (rMoveY && rMoveY != 0))) {
            moveRepeatRef.current = {
                interval: setInterval(() => {
                    trace("repeat", moveRepeatRef.current?.offset)
                    if (moveRepeatRef.current?.offset) {
                        handleMoveCanvas({
                            x: moveCanvasRef.current.x + moveRepeatRef.current.offset.x,
                            y: moveCanvasRef.current.y + moveRepeatRef.current.offset.y,
                        });
                    }
                }, 100),
                offset: { x: 0, y: 0 },
            }
        }
        if (moveRepeatRef.current) moveRepeatRef.current.offset.x = rMoveX;
        if (moveRepeatRef.current) moveRepeatRef.current.offset.y = rMoveY;


        if (type === MoveTypes.Text) {
            const textElem = textsRef.current.find(t => t.id === id);
            if (textElem) {
                textElem.x = x;
                textElem.y = y;
                setTexts([...textsRef.current]);
            }
        } else if (type === MoveTypes.LineStart || type === MoveTypes.LineEnd || type === MoveTypes.LineMove) {
            const line = linesRef.current.find(line => line.id == id);
            if (line) {
                if (!line.backup) {
                    backupElement(line)
                }
                if (type === MoveTypes.LineStart) {
                    line.from = [x, y];
                } else if (type === MoveTypes.LineEnd) {
                    line.to = [x, y];
                } else {
                    const dx = line.to[0] - line.from[0];
                    const dy = line.to[1] - line.from[1];
                    line.from = [x, y];
                    line.to = [x + dx, y + dy];
                }
                setLines([...linesRef.current]);
            }

        } else if (type === MoveTypes.ImageMove || type === MoveTypes.ImageResize) {
            const imgElem = imagesRef.current.find(image => image.id == id);
            if (imgElem) {
                if (!imgElem.backup) {
                    backupElement(imgElem)
                    imgElem.aspectRatio = imgElem.width / imgElem.height;
                }
                if (type === MoveTypes.ImageMove) {
                    imgElem.x = x;
                    imgElem.y = y;
                } else {
                    const delta = (x - imgElem.x) - imgElem.width;
                    imgElem.width += delta;
                    imgElem.height += delta / (imgElem.aspectRatio || 1)
                }
                setImages([...imagesRef.current]);
            }
        } else if (type === MoveTypes.TableMove || type === MoveTypes.TableResize) {
            const table = tablesRef.current.find(table => table.id == id);
            if (table) {
                if (!table.backup) {
                    backupElement(table);
                }

                if (type === MoveTypes.TableMove) {
                    const dx = x - table.verticalLines[0];
                    table.verticalLines = table.verticalLines.map(vLine => vLine + dx);

                    const dy = y - table.horizontalLines[0];
                    table.horizontalLines = table.horizontalLines.map(hLine => hLine + dy);
                } else {
                    const dx = x - arrLast(table.verticalLines);
                    const dy = y - arrLast(table.horizontalLines);
                    table.verticalLines = table.verticalLines.map((vLine, i) => {
                        if (i == 0) return vLine;
                        const ratio = (table.verticalLines[i] - table.verticalLines[0]) / tableWidth(table);
                        return vLine + dx * ratio;
                    });

                    const horizontalLines = calcEffectiveHorizontalLines(table, textsRef.current)

                    table.horizontalLines = horizontalLines.map((hLine, i) => {
                        if (i == 0) return hLine;
                        const ratio = (horizontalLines[i] - horizontalLines[0]) / tableHeight(table);
                        return hLine + dy * ratio;
                    });
                }
                setTables([...tablesRef.current]);
            }
        } else if (type === MoveTypes.ElementMove) {
            const audioElem = audiosRef.current.find(au => au.id == id);
            if (audioElem) {
                if (!audioElem.backup) {
                    backupElement(audioElem)
                }
                audioElem.x = x;
                audioElem.y = y;
                setAudios([...audiosRef.current]);
            }
        }
    }

    function handleMoveEnd(type: MoveTypes, id: string) {
        if (moveRepeatRef.current) {
            trace("end repeat")
            clearInterval(moveRepeatRef.current.interval);
            moveRepeatRef.current = undefined;
        }


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
                const changed = restoreElement(imgElem) as SketchImage;
                delete changed.imageData;
                delete changed.aspectRatio;
                queue.current.pushImagePosition(changed);
                save();
                queue2state();
            }
        } else if (type === MoveTypes.TableMove || type === MoveTypes.TableResize) {
            const table = tablesRef.current.find(table => table.id == id);
            if (table && table.backup) {
                queue.current.pushTable(restoreElement(table));
                queue2state();
                save();
            }
        } else if (type === MoveTypes.ElementMove) {
            const audioElem = audiosRef.current.find(au => au.id == id);
            if (audioElem && !audioElem.editMode) {
                queue.current.pushAudioPosition(restoreElement(audioElem));
                queue2state();
                save();
            }
        }
    }

    function handleMoveTablePart(p: SketchPoint, tableContext: TableContext) {
        const table = tablesRef.current.find(t => t.id == tableContext.elem.id);
        if (table) {
            trace("Table part move", p, tableContext)
            if (!table.backup) {
                backupElement(table);
            }


            if (tableContext.hLine != undefined && tableContext.hLine > 0 && tableContext.hLine < table.horizontalLines.length - 1) {
                // not allow move beyond the two adjecent lines
                const horizontalLines = calcEffectiveHorizontalLines(table, textsRef.current)
                if (p[1] <= horizontalLines[tableContext.hLine - 1] || p[1] >= horizontalLines[tableContext.hLine + 1]) return;

                // calculate the added size to all rows before this
                const prevRowsDelta = horizontalLines[tableContext.hLine - 1] - table.horizontalLines[tableContext.hLine - 1];

                // find text elements of this line:
                const rowTexts = textsRef.current.filter(t => t.tableId == table.id && t.y + 1 == tableContext.hLine);
                for (let rowText of rowTexts) {
                    if (rowText.height && p[1] - horizontalLines[tableContext.hLine - 1] < rowText.height) {
                        // trying to resize the line smaller than the heighest text in the row
                        trace("limit resize row", rowText.height, p[1] - table.horizontalLines[tableContext.hLine - 1])
                        return;
                    }
                }

                table.horizontalLines[tableContext.hLine] = p[1] - prevRowsDelta;
            }
            if (tableContext.vLine != undefined && tableContext.vLine > 0 && tableContext.vLine < table.verticalLines.length - 1) {
                // not allow move beyond the two adjecent lines
                if (p[0] <= table.verticalLines[tableContext.vLine - 1] || p[0] >= table.verticalLines[tableContext.vLine + 1]) return;
                table.verticalLines[tableContext.vLine] = p[0];
            }

            setTables([...tablesRef.current]);
        }
    }

    function handleMoveTablePartEnd(tableContext: TableContext) {
        const table = tablesRef.current.find(t => t.id == tableContext.elem.id);
        if (table && table.backup) {
            queue.current.pushTable(restoreElement(table));
            queue2state();
            save();
        }
    }

    // -------------------------------------------------------------------------
    //                          DELETE HANDLER
    // -------------------------------------------------------------------------
    function handleDelete(type: ElementTypes, id: string) {
        if (type === ElementTypes.Line) {
            queue.current.pushDeleteLineNew(id);
            save();
            queue2state();
        } else if (type == ElementTypes.Image) {
            queue.current.pushDeleteImage({ id });
            save();
            queue2state();
        } else if (type == ElementTypes.Element && modeRef.current == EditModes.Audio) {
            queue.current.pushDeleteAudio({ id });
            queue2state();
            save();
        }
    }

    // -------------------------------------------------------------------------
    //                          TEXT OVERFLOW
    // -------------------------------------------------------------------------
    function handleTextYOverflow(elemId: string) {
        console.log("End of page reached", elemId);

        RNSystemSounds.beep(RNSystemSounds.Beeps.Negative)
        const textElem = textsRef.current.find(t => t.id == elemId);
        if (textElem) {
            const tableElem = textElem.tableId && tablesRef.current.find(t => t.id == textElem.tableId);
            const tableOverflow = tableElem && textElem.y < tableElem.horizontalLines.length - 2;
            const isFontChange = false; //todo

            showMessage({
                message: tableOverflow ? translate("TableOverflowsPage") :
                    (isFontChange ? translate("FontChangeOverflowsPage") :
                        translate("ReachedEndOfPage")),
                type: "warning",
                animated: true,
                duration: 10000,
                position: "center",
                titleStyle: { lineHeight: 35, fontSize: 25, height: 100, textAlign: "center", margin: 15, color: "black" },
                style: { width: 450, height: 250 },

                renderAfterContent: (opt) => {
                    return <View style={{ flexDirection: "row", height: 50, width: "100%", justifyContent: 'center' }}>
                        {!tableOverflow && !isFontChange && getRoundedButton(
                            async () => {
                                hideMessage()

                                // take the last line - after NL
                                let text = ""
                                text = textElem.text;
                                let nlPos = text.lastIndexOf("\n");
                                if (nlPos === text.length - 1) {
                                    nlPos = text.lastIndexOf("\n", nlPos - 1);
                                }

                                if (nlPos >= 0) {
                                    text = text.substring(nlPos + 1);
                                    textElem.text = textElem.text.substring(0, nlPos);
                                } else {
                                    textElem.text = "";
                                }

                                await saveText();

                                const newUri = await FileSystem.main.cloneToTemp(currentFileRef.current);
                                const updatedSheet = await FileSystem.main.addPageToSheet(pageRef.current, newUri, currPageIndexRef.current + 1);
                                trace('add page at end of file', updatedSheet)
                                pageRef.current = updatedSheet;
                                await movePage(currPageIndexRef.current + 1);
                                if (tableElem) {
                                    queue.current.pushTable(tableElem);
                                }
                                const newTextElem = {
                                    ...textElem,
                                    text,
                                    y: 0
                                }

                                queue.current.pushText(newTextElem);
                                const newCurrEdited = { ...currentEditedRef.current, textId: newTextElem.id }
                                currentEditedRef.current = newCurrEdited
                                setCurrentEdited(newCurrEdited);
                                queue2state();
                            }, "add", translate("AddPageMenuTitle"), 25, 35, { width: 180 }, undefined, undefined, undefined, true)
                        }
                        <Spacer />
                        {getRoundedButton(() => hideMessage(),
                            "cancel",
                            tableOverflow || isFontChange ? translate("BtnOK") : translate("BtnCancel"),
                            25, 35, { width: 180 }, undefined, undefined, undefined, true)}

                    </View>
                }
            })
        }
    }

    // -------------------------------------------------------------------------
    //                          TOOLBAR OR MODE HANDLERS
    // -------------------------------------------------------------------------
    function afterUndoRedo() {
        queue2state()
        save();
    }

    function handleEraserPressed() {
        trace("Eraser pressed");
        if (!eraseModeRef.current &&
            (modeRef.current === EditModes.Image || modeRef.current === EditModes.Table || modeRef.current === EditModes.Text)) {
            beforeModeChange();
            setMode(EditModes.Brush);
            toolbarRef.current?.closePicker();
        }
        setEraseMode((prev) => !prev);
    }

    function handleRulerMode() {
        beforeModeChange();
        if (eraseModeRef.current) {
            setEraseMode(false);
        }
        setMode(EditModes.Ruler);
    }
    function handleTextMode() {
        beforeModeChange();
        if (eraseModeRef.current) {
            setEraseMode(false);
        }
        setMode(EditModes.Text);
    }
    function handleImageMode() {
        beforeModeChange();
        if (eraseModeRef.current) {
            setEraseMode(false);
        }
        setMode(EditModes.Image);

        if (imagesRef.current?.length == 0) {
            toolbarRef.current?.openImageSubMenu();
        } else if (imagesRef.current?.length == 1) {
            const newCurrEdited = { ...currentEditedRef.current, imageId: imagesRef.current[0].id }
            currentEditedRef.current = newCurrEdited
            setCurrentEdited(newCurrEdited);
        }
    }
    function handleAudioMode() {
        beforeModeChange();
        if (eraseModeRef.current) {
            setEraseMode(false);
        }

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
                FileSystem.main.resizeImage(uri, Math.round(canvasSizeRef.current.width / 1.5), canvasSizeRef.current.height / 1.5)
                    .then(uri2 => FileSystem.main.attachedFileToPage(uri2, pageRef.current, currPageIndexRef.current, "jpeg"))
                    .then(imageAttachmentFile => {
                        const img = {
                            id: getId("I"),
                            x: canvasSizeRef.current.width / 2,
                            y: canvasSizeRef.current.height / 2,
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
    function handleTableMode() {
        beforeModeChange();
        if (eraseModeRef.current) {
            setEraseMode(false);
        }
        setMode(EditModes.Table);
        return tablesRef.current.length > 0;
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

    function isBrushMode() {
        return modeRef.current === EditModes.Brush;
    }

    const TableActions = {
        delete: (id: string) => {
            trace("Delete table", id)
            queue.current.pushDeleteTableNew(id);
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
            const topMargin = dimensions.toolbarHeight * 1.4;
            const sideMargin = 50;
            const colWidth = Math.floor((canvasSizeRef.current.width / ratioRef.current - sideMargin * 2) / cols - 1);
            const rowHeight = Math.floor((canvasSizeRef.current.height / ratioRef.current - topMargin - bottomMargin) / rows);

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
                (isCols && tablesRef.current[0].verticalLines.length - 1 != newVal ||
                    !isCols && tablesRef.current[0].horizontalLines.length - 1 != newVal)) {

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
                if (isCols) {
                    changed.verticalLines = newArray;
                } else {
                    changed.horizontalLines = newArray;;
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
            const strokeDash = !borderStyle || borderStyle == "0,0" ? [0, 0] : borderStyle.split(",");
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
                textElem.fontSize = fontSizeRef.current / ratioRef.current;
                textElem.alignment = textAlignmentRef.current;
                if (!textElem.tableId) {
                    textElem.rtl = textAlignmentRef.current == "Right";
                }
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
        if (modeRef.current == EditModes.Ruler) {
            setRulerStrokeWidth(brushSize);
            const lineElem = linesRef.current.find(line => line.id == currentEditedRef.current.lineId);
            if (lineElem) {
                const cloned = cloneElem(lineElem);
                cloned.strokeWidth = brushSize;
                queue.current.pushLine(cloned);
                queue2state();
                save();
            }
        } else {
            setStrokeWidth(brushSize);
        }
    }
    function onMarkerSize(markerSize: number) {
        setMarkerWidth(markerSize);
    }

    // NEW OR UPDATED: stub for handleToolbarDimensionChange
    function handleToolbarDimensionChange(height: number, floatingToolbarHeight: number) {
        setToolbarHeight(height);
        toolbarHeightRef.current = height;
        setFloatingToolbarHeight(floatingToolbarHeight);
        console.log("Toolbar dimension changed:", height, floatingToolbarHeight);
    }

    // -------------------------------------------------------------------------
    //                          RENDER
    // -------------------------------------------------------------------------


    function mode2ElementType(mode: EditModes): ElementTypes {
        if (mode == EditModes.Brush || mode == EditModes.Marker) {
            return ElementTypes.Sketch
        }
        return mode as unknown as ElementTypes;
    }

    function handleAddBlankPage(blankType: number) {
        FileSystem.main.getStaticPageTempFile(blankType).then(uri => addNewPage(uri, SRC_FILE, true));
    }

    function addNewPage(uri: string, src: string, isBlank: boolean) {
        navigation.navigate('SavePhoto', {
            uri,
            isBlank,
            imageSource: src,
            addToExistingPage: pageRef.current,
            goHomeAndThenToEdit: route.params.goHomeAndThenToEdit,
            pageIndex: pageRef.current.count,
        })
    }

    function handleNewPage(srcType: string) {
        trace("handleNewPage", srcType);
        getNewPage(srcType,
            // OK
            (uri: string) => {
                setBusy(true);
                addNewPage(uri, srcType, false)
            },
            //cancel
            () => setBusy(false),
            // Error
            (err: any) => Alert.alert("Error", err.description),
            navigation,
            {
                selectionLimit: 1,
            })
            .finally(() => setBusy(false));
    }

    function handleDeletePage() {
        Alert.alert(translate("BeforeDeleteSubPageTitle"), translate("BeforeDeleteSubPageQuestion"),
            [
                {
                    text: translate("BtnDelete"), onPress: async () => {
                        let updatedPage = await FileSystem.main.deletePageInSheet(pageRef.current, currPageIndexRef.current);
                        let index = currPageIndexRef.current;
                        if (index > 0) {
                            index--;
                        }
                        loadPage(updatedPage, index);
                    },
                    style: 'destructive'
                },
                {
                    text: translate("BtnCancel"), onPress: () => {
                        //do nothing
                    },
                    style: 'cancel'
                }
            ]
        );
    }

    const moveArrows = (windowSize: ImageSize, keyboardHeight: number, zoom: number, moveCanvas: Offset, toolbarHeight: number, floatingToolbarHeight: number, mode: EditModes) => {
        const sidesTop = Math.min(windowSize.height / 2 - 35, windowSize.height - keyboardHeight - 95);
        const upDownLeft = windowSize.width / 2 - 35; //half the size of the button
        const upDownTop = toolbarHeight + floatingToolbarHeight
        const verticalMovePossible = zoom > 1;
        const horizMovePossible = zoom > 1;

        const disabledRight = -maxXOffset() >= moveCanvas.x;
        const disabledBottom = -maxYOffset() >= moveCanvas.y

        const MoveButton = ({ rotate, onPress, style, disabled }: { rotate: number, onPress: () => void, style: any, disabled: boolean }) => (
            <TouchableOpacity style={[styles.moveCanvasButton, style, { transform: [{ rotate: rotate + 'deg' }] }]}
                onPress={() => { console.log("presse move"); !disabled && onPress() }} >
                <Icon
                    name='play-arrow' size={70} color={disabled ? semanticColors.moveInZoomButtonDisabled : semanticColors.moveInZoomButton}
                />
            </TouchableOpacity>
        );

        return (
            <React.Fragment>
                {horizMovePossible && <MoveButton key={1} rotate={180} onPress={() => handleMoveCanvas({ x: moveCanvas.x + 50, y: moveCanvas.y })}
                    style={{ top: sidesTop, left: 10 }} disabled={moveCanvas.x == 0}
                />}
                {horizMovePossible && <MoveButton key={2} rotate={0} onPress={() => handleMoveCanvas({ x: moveCanvas.x - 50, y: moveCanvas.y })}
                    style={{ top: sidesTop, right: 10 }} disabled={disabledRight}
                />}
                {verticalMovePossible && <MoveButton key={3} rotate={270} onPress={() => handleMoveCanvas({ x: moveCanvas.x, y: moveCanvas.y + 50 })}
                    style={{ top: upDownTop + 7, left: upDownLeft - 50 }} disabled={moveCanvas.y == 0}
                />}
                {verticalMovePossible && <MoveButton key={4} rotate={90} onPress={() => handleMoveCanvas({ x: moveCanvas.x, y: moveCanvas.y - 50 })}
                    style={{ top: upDownTop, left: upDownLeft + 50 }} disabled={disabledBottom}
                />}
            </React.Fragment >);
    }

    async function movePage(inc: number) {
        await saveText();

        let currentIndex = -1;
        for (let i = 0; i < pageRef.current.count; i++) {
            if (pageRef.current.getPage(i) == currentFileRef.current) {
                currentIndex = i;
                break;
            }
        }
        let newIndex = currentIndex + inc;
        if (newIndex < 0)
            newIndex = 0;

        if (newIndex >= pageRef.current.count) return;
        await loadPage(pageRef.current, newIndex);
    }

    function handleRenderElements(elem: SketchElement) {
        if (elem.type == "audio") {
            return <AudioElement2
                basePath={FileSystem.main.getAttachmentBase(pageRef.current, currPageIndexRef.current)}
                audioFile={elem.file}
                editMode={elem.editMode}
                width={80}
                height={80}
                onUpdateAudioFile={handleUpdateAudioFile}
            />
        }
    }

    function handleElementsAttr(elem: SketchElement): SketchElementAttributes | undefined {
        if (elem.type == "audio" && modeRef.current == EditModes.Audio) {
            return { showDelete: true };
        }
    }

    async function handleRename(isRename: boolean) {
        navigation.navigate('SavePhoto', {
            sheet: pageRef.current,
            imageSource: SRC_RENAME,
            folder: route.params.folder,
            name: pageRef.current.name,
            returnFolderCallback: route.params.returnFolderCallback,
            saveNewFolder: route.params.saveNewFolder,
            title: isRename ? translate("RenameFormTitle") : translate("MovePageFormTitle"),
            goHomeAndThenToEdit: route.params.goHomeAndThenToEdit
        });
    }

    async function handleUpdateAudioFile(filePath: string) {
        const audioElem = audiosRef.current.find(au => au.editMode);
        if (audioElem) {
            const audioFile = await FileSystem.main.attachedFileToPage(filePath, pageRef.current, currPageIndexRef.current, "m4a");
            delete audioElem.editMode;
            audioElem.file = audioFile;
            queue.current.pushAudio(audioElem);
            queue2state();
            save();
        }
    }

    const maxXOffset = () => (canvasSizeRef.current.width * zoomRef.current - canvasSizeRef.current.width) / zoomRef.current
    const maxYOffset = () => (canvasSizeRef.current.height * zoomRef.current - canvasSizeRef.current.height + keyboardHeightRef.current) / zoomRef.current

    function doZoom(newZoom: number) {
        if (zoomRef.current > 1 && newZoom <= 1) {
            setZoom(1);
            const y = modeRef.current == EditModes.Text ? moveCanvasRef.current.y : 0;
            setMoveCanvas({ x: 0, y })
        } else if (newZoom > 1) {
            setZoom(newZoom);
        }
    }

    function handleMoveCanvas(newOffset: Offset) {
        if (zoomRef.current == 1 && modeRef.current != EditModes.Text) return;
        let { x, y } = newOffset;
        //trace("set move before", x, y)
        const verticalOnly = (zoomRef.current == 1 && modeRef.current == EditModes.Text);

        x = verticalOnly ? moveCanvasRef.current.x : Math.min(Math.max(x, -maxXOffset() / ratioRef.current), 0);

        y = Math.min(Math.max(y, -maxYOffset() / ratioRef.current), 0);
        //trace("set move", x, y, -maxYOffset())
        setMoveCanvas({ x, y });
    }


    return (
        <View
            style={styles.mainContainer}
        // onLayout={(e) => {
        //     trace("onLayout")
        //     const { y, width, height } = e.nativeEvent.layout;
        //     trace("onLayout", width, height, y)
        //     //setViewTop(y);
        // }}

        >
            {/* <View style={{ position: "absolute", left: sideMargin, top: 100, height: 5, width: canvasSize.width, backgroundColor: "green", zIndex: 10000 }} />

            
            <View style={{ position: "absolute", left: 0, top: 110, height: 5, width: windowSize.width, backgroundColor: "yellow", zIndex: 10000 }} />
            <View style={{ position: "absolute", left: 100, top: toolbarHeight + dimensions.toolbarMargin, height: canvasSize.height, width: 5, backgroundColor: "red", zIndex: 10000 }} /> */}
            {/* {[...Array(100).keys()].map((i: number) => (<View key={i}
                style={{ position: "absolute", left: 0, top: toolbarHeight + dimensions.toolbarMargin + i * 25, height: 2, width: windowSize.width, backgroundColor: "yellow", zIndex: 10000 }}
            >
                <Text style={{ position: "absolute", left: 100, top: -13 }}>{i * 25}</Text>
            </View>))}

            <View 
                style={{ position: "absolute", left: 0, top: toolbarHeight + dimensions.toolbarMargin + keyboardTop -2, height: 2, width: windowSize.width, backgroundColor: "red", zIndex: 10000 }}
            >
                <Text style={{ position: "absolute", left: 100, top: -13 }}>kb</Text>
            </View> */}

            {busy &&
                <View style={styles.busy}>
                    <ActivityIndicator size="large" /></View>
            }

            {shareProgress >= 0 && <View style={globalStyles.progressBarHost}>
                <Text style={{ fontSize: 28, marginBottom: 5 }}>{fTranslate("ExportProgress",
                    shareProgressPage,
                    (pageRef.current.count > 0 ? pageRef.current.count : 1))
                }</Text>
                <Progress.Bar width={windowSize.width * .6} progress={shareProgress} style={[isRTL() && { transform: [{ scaleX: -1 }] }]} />
            </View>}


            <FileContextMenu
                item={pageRef.current}
                isLandscape={windowSize.height < windowSize.width}
                open={openContextMenu}
                height={windowSize.height * .7}
                width={windowSize.width * .75}
                onClose={() => {
                    setOpenContextMenu(false);
                }}
                inFoldersMode={false}

                onRename={handleRename}
                onDeletePage={pageRef.current && pageRef.current.count > 1 ? handleDeletePage : undefined}
                deletePageIndex={currPageIndex + 1}
                pagesCount={pageRef.current.count}

                onBlankPage={() => handleAddBlankPage(FileSystem.StaticPages.Blank)}
                onLinesPage={() => handleAddBlankPage(FileSystem.StaticPages.Lines)}
                onMathPage={() => handleAddBlankPage(FileSystem.StaticPages.Math)}
                onAddFromCamera={() => handleNewPage(SRC_CAMERA)}
                onAddFromMediaLib={() => handleNewPage(SRC_GALLERY)}
            />

            <EditorToolbar
                ref={toolbarRef}
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
                fontSize4Toolbar={(size: number) => size}///ratioRef.current}
                onZoomOut={() => doZoom(zoomRef.current - 0.5)}
                onZoomIn={() => doZoom(zoomRef.current + 0.5)}
                eraseMode={eraseMode}
                onEraser={handleEraserPressed}
                onRulerMode={handleRulerMode}
                onTextMode={handleTextMode}
                onImageMode={handleImageMode}
                onAudioMode={handleAudioMode}
                onAddAudio={handleAddAudio}
                onBrushMode={onBrushMode}
                onMarkerMode={onMarkerMode}
                onVoiceMode={onVoiceMode}
                onTableMode={handleTableMode}
                onAddImageFromGallery={() => addImage(SRC_GALLERY)}
                onAddImageFromCamera={() => addImage(SRC_CAMERA)}
                TableActions={TableActions}
                isRulerMode={mode === EditModes.Ruler}
                isTableMode={mode === EditModes.Table}
                isMarkerMode={mode === EditModes.Marker}
                isTextMode={mode === EditModes.Text}
                isAudioMode={mode === EditModes.Audio}
                isImageMode={mode === EditModes.Image}
                isVoiceMode={false}
                isBrushMode={mode === EditModes.Brush}
                fontSize={fontSize}
                textAlignment={textAlignment}
                showCenterTextAlignment={currentEdited.textId && texts.find(t => t.id == currentEdited.textId)?.tableId}
                strokeWidth={mode === EditModes.Ruler ? rulerStrokeWidth : strokeWidth}
                markerWidth={markerWidth}
                sideMargin={sideMargin}
                onSelectColor={handleSelectColor}
                brushColor={brushColor}
                textColor={textColor}
                markerColor={markerColor}
                rulerColor={rulerColor}
                tableColor={tableColor}
                onSelectTextSize={onTextSize}
                onSelectTextAlignment={onTextAlignment}
                onSelectBrushSize={onBrushSize}
                onSelectMarkerSize={onMarkerSize}
                onToolBarDimensionsChange={handleToolbarDimensionChange}
                maxFloatingHeight={windowSize.height - keyboardHeight}
            />
            <View style={styles.topMargin} />
            {/* <ViewShot ref={mainViewRef} options={{ format: "jpg", quality: 0.9, result: share ? "base64" : "tmpfile" }}> */}
            <Canvas
                ref={canvasRef}
                style={{ overflow: 'hidden', backgroundColor: 'gray' }}
                offset={moveCanvas}
                canvasWidth={canvasSize.width}
                canvasHeight={canvasSize.height}// - toolbarHeight - dimensions.toolbarMargin}
                ratio={ratio}
                //canvasTop={canvasTop.current}
                zoom={zoom}
                onZoom={(newZoom) => doZoom(newZoom)}
                onMoveCanvas={handleMoveCanvas}
                sideMargin={sideMargin}
                paths={paths}
                texts={texts}
                lines={lines}
                images={images}
                tables={tables}
                elements={audios}
                renderElements={handleRenderElements}
                elementsAttr={handleElementsAttr}
                currentEdited={currentEdited}
                onTextChanged={handleTextChanged}
                onSketchStart={handleSketchStart}
                onSketchStep={handleSketchStep}
                onSketchEnd={handleSketchEnd}

                sketchColor={eraseMode ? '#00000000' : (mode == EditModes.Marker ? markerColor + MARKER_TRANSPARENCY_CONSTANT : brushColor)}
                sketchStrokeWidth={eraseMode ? (mode == EditModes.Marker ? Math.max(15, markerWidth * 3) : Math.max(15, strokeWidth * 3)) :
                    (mode == EditModes.Marker ? markerWidth : strokeWidth)}

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
            {/* </ViewShot> */}

            {/** previous page button */}
            {
                pageRef.current && pageRef.current.count > 0 && currentFile !== pageRef.current.getPage(0) ?
                    <View style={{ position: 'absolute', bottom: 50, left: 10, width: 155, height: 40, zIndex: 100 }}>
                        {getRoundedButton(() => movePage(-1), 'chevron-left', translate("BtnPreviousPage"), 30, 30, { width: 125, height: 40 }, 'row-reverse', true)}
                    </View> :
                    null
            }
            {/** next page button */}
            {
                pageRef.current && pageRef.current.count > 1 &&
                    currentFile !== pageRef.current.getPage(pageRef.current.count - 1) ?
                    <View style={{ position: 'absolute', bottom: 50, right: 10, height: 40, zIndex: 100 }}>
                        {getRoundedButton(() => movePage(1), 'chevron-right', translate("BtnNextPage"), 30, 30, { width: 125, height: 40 }, 'row', true)}
                    </View> :
                    null
            }

            {moveArrows(windowSize, keyboardHeight, zoom, moveCanvas, toolbarHeight, floatingToolbarHeight, mode)}
        </View>
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
    busy: {
        position: 'absolute',
        left: "48%",
        top: "40%",
        zIndex: 1000
    },
    moveCanvasButton: {
        position: 'absolute',
        zIndex: 100000
    }
});