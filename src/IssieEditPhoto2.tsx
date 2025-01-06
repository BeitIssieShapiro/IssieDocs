import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
import { Canvas } from './canvas/canvas';
import DoQueue from './do-queue';
import { FileSystem } from './filesystem';
import { trace } from './log';
import { arrLast, pageTitleAddition, setNavParam } from './utils';
import { colors, dimensions, getImageDimensions, getRoundedButton, Icon, semanticColors } from './elements';
import EditorToolbar from './editor-toolbar';
import { getNewPage, SRC_CAMERA, SRC_FILE, SRC_GALLERY } from './newPage';
import { EditModes, RootStackParamList } from './types';
import { backupElement, cloneElem, getId, restoreElement, tableColWidth, tableHeight, tableRowHeight, tableWidth, wait } from './canvas/utils';
import { MARKER_TRANSPARENCY_CONSTANT } from './svg-icons';
import { fTranslate, isRTL, translate } from './lang';
import { FileContextMenu } from './file-context-menu';
import { AudioElement2 } from './audio-elem-new';
import ViewShot from 'react-native-view-shot';
import { generatePDF } from './pdf';
import { Text } from 'react-native';

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
    const [audios, setAudios] = useState<SketchElement[]>([]);
    const [currentEdited, setCurrentEdited] = useState<CurrentEdited>({});

    const [windowSize, setWindowSize] = useState<ImageSize>({ width: 500, height: 500 });
    const [canvasSize, setCanvasSize] = useState<ImageSize>({ width: 1000, height: 1000 })
    const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
    const [toolbarHeight, setToolbarHeight] = useState<number>(dimensions.toolbarHeight);

    const [zoom, setZoom] = useState<number>(1);
    const [status, setStatus] = useState<string>("");
    const [moveCanvas, setMoveCanvas] = useState<Offset>({ x: 0, y: 0 });
    const [mode, setMode] = useState<EditModes>(EditModes.Brush);
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

    const modeRef = useRef<EditModes>(EditModes.Brush);
    const mainViewRef = useRef<ViewShot>(null);
    const viewOffsetRef = useRef<Offset>({ x: 0, y: 0 })

    const [fontSize, setFontSize] = useState<number>(35);
    const [textAlignment, setTextAlignment] = useState<string>(isRTL()?"Right":"Left");
    const [strokeWidth, setStrokeWidth] = useState<number>(2);
    const [markerWidth, setMarkerWidth] = useState<number>(20);
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

    const ratioRef = useRef(1);
    const keyboardHeightRef = useRef(keyboardHeight);

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
    const moveCanvasRef = useRef(moveCanvas);
    const zoomRef = useRef(zoom);


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
        currPageIndexRef.current = currPageIndex;
        currentFileRef.current = currentFile;
        moveCanvasRef.current = moveCanvas;
        zoomRef.current = zoom;
        keyboardHeightRef.current = keyboardHeight;

        updateCurrentEditedElements();
    }, [mode, fontSize, textAlignment, strokeWidth, markerWidth, sideMargin,
        brushColor, rulerColor, markerColor, textColor, tableColor, canvasSize,
        currPageIndex, currentFile, moveCanvas, zoom, keyboardHeight]);

    useEffect(() => {
        currentEditedRef.current = currentEdited;
    }, [currentEdited])


    async function loadPage(newPage: any, index: number) {
        const newCurrentFile = newPage.getPage(index);
        setCurrentFile(newPage.getPage(index));
        setCurrPageIndex(index);

        trace("EditPhoto CurrentFile: ", newCurrentFile);
        if (newPage.count > 0) {
            setNavParam(navigation, 'pageTitleAddition', pageTitleAddition(newPage.count, index));
        }

        pageRef.current = newPage;

        metaDataUri.current = newCurrentFile + ".json";
        await loadMetadata().then(() => queue2state());
    }

    useEffect(() => {
        setNavParam(navigation, 'onMoreMenu', () => setOpenContextMenu(true));
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', _keyboardDidShow);
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', _keyboardDidHide);

        loadPage(page, (pageIndex != undefined && pageIndex > 0 ? pageIndex : 0)).then(() => {
            if (share) {
                doShare();
            }
        })

        return () => {
            // Cleanup 
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

        let kbTop = (e.endCoordinates.screenY - viewOffsetRef.current.y) / ratioRef.current;
        kbTop -= moveCanvasRef.current.y;
        kbTop /= zoomRef.current
        if (textElem) {
            const elemHeight = (textElem.height ?? 20);
            const elemBottom = textElem.y + elemHeight;
            if (elemBottom > kbTop) {
                trace("text behind kb")
                const dy = elemBottom - kbTop
                handleMoveCanvas({ x: moveCanvasRef.current.x, y: -(moveCanvasRef.current.y + dy + 3) })
            }
        }
    }
    function _keyboardDidHide() {
        setKeyboardHeight(0);
    }

    async function loadMetadata() {
        queue.current.clear();
        const value = await FileSystem.main.loadFile(metaDataUri.current).catch(e => {/**left blank, as expetced */ }) || "[]";
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

        //  Save thumbnail
        mainViewRef.current.capture().then((uri: string) => {
            FileSystem.main.saveThumbnail(uri, pageRef.current);
        });
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
            const uri = await mainViewRef.current.capture()
            dataUrls.push(uri);
            for (let i = 1; i < pageRef.current.count; i++) {
                setShareProgressPage(i + 1);
                setShareProgress(i / pageRef.current.count)
                await loadPage(pageRef.current, i);
                await wait(shareTimeMs);
                const uri = await mainViewRef.current.capture()
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
        audiosRef.current = _audio;

        setPaths(_paths);
        setTexts(_texts);
        setLines(_rulers);
        setImages(_images);
        setTables(_tables);
        setAudios(_audio);
    }

    function beforeModeChange() {
        saveText();
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
        } else if (modeRef.current === EditModes.Text) {
            trace("sketch start text")

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

                }
                setCurrentEdited(prev => ({ ...prev, textId: undefined }));
            } else {
                // new text element
                if (textElem.text != "") {
                    queue.current.pushText(textElem);
                    queue2state();
                    save();

                }
                setCurrentEdited(prev => ({ ...prev, textId: undefined }));
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
        trace("Move elem",
            Math.floor(p[0]),
            moveCanvasRef.current.x,
            //Math.floor(p[1]), 
            canvasSizeRef.current.width / ratioRef.current,
            //canvasSizeRef.current.height/ratioRef.current, type, id
        )

        let [x, y] = p;
        if (x < 20) x = 20;
        if (x > canvasSizeRef.current.width / ratioRef.current - 20)
            x = canvasSizeRef.current.width / ratioRef.current - 20;

        if (y < 0) y = 0;
        if (y > canvasSizeRef.current.height / ratioRef.current - 20)
            y = canvasSizeRef.current.height / ratioRef.current - 20;

        if (type === MoveTypes.Text) {
            const textElem = textsRef.current.find(t => t.id === id);
            //trace("Move text", textElem, textsRef.current)
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
                }
                if (type === MoveTypes.ImageMove) {
                    imgElem.x = x;
                    imgElem.y = y;
                } else {
                    imgElem.width = x - imgElem.x;
                    imgElem.height = y - imgElem.y;
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

                    table.horizontalLines = table.horizontalLines.map((hLine, i) => {
                        if (i == 0) return hLine;
                        const ratio = (table.horizontalLines[i] - table.horizontalLines[0]) / tableHeight(table);
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
                if (p[1] <= table.horizontalLines[tableContext.hLine - 1] || p[1] >= table.horizontalLines[tableContext.hLine + 1]) return;
                table.horizontalLines[tableContext.hLine] = p[1];
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
            queue.current.pushDeleteLine(id);
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
    function handleToolbarDimensionChange(height: number, exHeight: number) {
        setToolbarHeight(height);
        //console.log("Toolbar dimension changed:", height, exHeight);
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

    const moveArrows = (windowSize: ImageSize, keyboardHeight: number, zoom: number, moveCanvas: Offset, toolbarHeight: number) => {
        const sidesTop = Math.min(windowSize.height / 2 - 35, windowSize.height - keyboardHeight - 95);
        const upDownLeft = windowSize.width / 2;
        const upDownTop = toolbarHeight + 45
        const verticalMovePossible = modeRef.current == EditModes.Text || zoom > 1;
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
                    style={{ top: upDownTop, left: upDownLeft - 50 }} disabled={moveCanvas.y == 0}
                />}
                {verticalMovePossible && <MoveButton key={4} rotate={90} onPress={() => handleMoveCanvas({ x: moveCanvas.x + 50, y: moveCanvas.y - 50 })}
                    style={{ top: upDownTop, left: upDownLeft + 50 }} disabled={disabledBottom}
                />}
            </React.Fragment >);
    }

    async function movePage(inc: number) {
        saveText();

        let currentIndex = -1;
        for (let i = 0; i < pageRef.current.count; i++) {
            if (pageRef.current.getPage(i) == currentFileRef.current) {
                currentIndex = i;
                break;
            }
        }
        currentIndex += inc;
        if (currentIndex < 0)
            currentIndex = 0;

        if (currentIndex >= pageRef.current.count) return;

        currPageIndexRef.current = currentIndex;
        setCurrPageIndex(currentIndex);
        setNavParam(navigation, 'pageTitleAddition', pageTitleAddition(pageRef.current.count, currPageIndexRef.current));

        const newCurrentFile = pageRef.current.getPage(currentIndex);
        const newMetaDataUri = newCurrentFile + ".json";
        setCurrentFile(newCurrentFile);
        metaDataUri.current = newMetaDataUri;
        await loadMetadata();
        queue2state();
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


    function handleMoveCanvas(newOffset: Offset) {
        if (zoom == 1 && modeRef.current != EditModes.Text) return;
        let { x, y } = newOffset;
        const verticalOnly = (zoomRef.current == 1 && modeRef.current == EditModes.Text);

        x = verticalOnly ? moveCanvasRef.current.x : Math.min(Math.max(x, -maxXOffset() / ratioRef.current), 0);

        y = Math.min(Math.max(y, -maxYOffset() / ratioRef.current), 0);
        trace("set move", x, y, newOffset, -maxYOffset())
        setMoveCanvas({ x, y });
    }

    return (
        <SafeAreaView
            style={styles.mainContainer}
            onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                setWindowSize({ width, height });
            }}
        >
            {/* <View style={{ position: "absolute", left: sideMargin, top: 100, height: 5, width: canvasSize.width, backgroundColor: "green", zIndex: 10000 }} />
            <View style={{ position: "absolute", left: 0, top: 110, height: 5, width: windowSize.width, backgroundColor: "yellow", zIndex: 10000 }} />
            <View style={{ position: "absolute", left: 100, top: toolbarHeight + dimensions.toolbarMargin, height: canvasSize.height, width: 5, backgroundColor: "red", zIndex: 10000 }} /> */}
            {busy &&
                <View style={styles.busy}>
                    <ActivityIndicator size="large" /></View>
            }

            {shareProgress >= 0 && <View style={styles.progressBarHost}>
                <Text style={{ fontSize: 28, marginBottom: 5 }}>{fTranslate("ExportProgress",
                    shareProgressPage,
                    (pageRef.current.count > 0 ? pageRef.current.count : 1))
                }</Text>
                <Progress.Bar width={windowSize.width * .6} progress={.7} style={[isRTL() && { transform: [{ scaleX: -1 }] }]} />
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

                onRename={() => {
                    //rename(true) todo
                }}
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
                isAudioMode={mode === EditModes.Audio}
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
            <ViewShot ref={mainViewRef} options={{ format: "jpg", quality: 0.9, result: share ? "base64" : "tmpfile" }}>
                <Canvas
                    style={{ overflow: 'hidden', backgroundColor: 'gray' }}
                    offset={moveCanvas}
                    canvasWidth={windowSize.width}
                    canvasHeight={windowSize.height - toolbarHeight - dimensions.toolbarMargin}
                    onActualCanvasSize={(actualSize, actualMargin, viewOffset, ratio) => {
                        if (actualSize.height != canvasSize.height || actualSize.width != canvasSize.width) {
                            setCanvasSize(actualSize)
                        }
                        if (actualMargin !== sideMargin) {
                            setSideMargin(actualMargin);
                        }
                        ratioRef.current = ratio;
                        viewOffsetRef.current = viewOffset;
                    }}
                    zoom={zoom}
                    onZoom={(newZoom) => setZoom(newZoom)}
                    onMoveCanvas={handleMoveCanvas}
                    minSideMargin={sideMargin}
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
            </ViewShot>

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

            {moveArrows(windowSize, keyboardHeight, zoom, moveCanvas, toolbarHeight)}
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
    busy: {
        position: 'absolute',
        left: "48%",
        top: "40%",
        zIndex: 1000
    },
    progressBarHost: {
        position: 'absolute',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 3.84,
        borderRadius: 10, 
        padding: 10, 
        top: '25%', left: '15%', width: '70%', zIndex: 1000, 
        backgroundColor: 'white', alignItems: 'center'
    },
    moveCanvasButton: {
        position: 'absolute',
        zIndex: 100000
    }
});