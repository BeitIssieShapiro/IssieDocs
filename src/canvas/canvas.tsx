import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
    Image,
    ImageSize,
    ImageURISource,
    LayoutChangeEvent,
    PanResponder,
    Pressable,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import {
    Canvas as SkiaCanvas,
    Path as SkiaPath,
    Image as SkiaImage,
    Rect as SkiaRect,
    Group as SkiaGroup,
    BlurMask,
    useCanvasRef,
    Skia,
    SkPath,
    PathCommand,
    PathVerb,
} from "@shopify/react-native-skia";

// Create an Animated version of Skia's <Path> component
//const AnimatedSkiaPath = Animated.createAnimatedComponent(Path);


import {
    CurrentEdited,
    ElementBase,
    ElementTypes,
    MoveContext,
    MoveTypes,
    Offset,
    SketchElement,
    SketchElementAttributes,
    SketchImage,
    SketchLine,
    SketchOverlay,
    SketchPath,
    SketchPoint,
    SketchTable,
    SketchText,
    TableContext,
    TablePart,
} from "./types";
import { Lines, MoveIcon, VLines } from "./canvas-elements";
import {
    arrLast,
    calcEffectiveHorizontalLines,
    calculateLineAngle,
    calculateLineTrashPoint,
    inBox,
    isPointOnLineSegment,
    joinPath,
    normalizeFoAndroid,
    IIF,
} from "./utils";
import TextElement from "./text-element"; // Example sub-component for text
import { PinchHelperEvent, PinchSession } from "./pinch";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { dimensions } from "../elements";
import { captureRef } from "react-native-view-shot";

// Create animated TouchableOpacity for use with reanimated styles
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
import { MyIcon } from "../common/icons";
import { trace } from "../log";
import { FileSystem } from "../filesystem";
import { cutShapePath, getOverlayImage, getUriImage, NormRect, pieceClipPath } from "./raster";
import { buildDrawLayers, DrawItem, DrawLayer, ERASER_COLOR, stackTexts, textBox, textCenter, topPieceAt, visibleTextAt } from "./pieces";
import { allHave, SpanStyle, styleAt } from "./text-spans";
import { FORMAT_BAR_HEIGHT, TextFormatBar } from "./text-format-bar";
import Clipboard from "@react-native-clipboard/clipboard";
import { textSizes } from "../elements";

const TEXT_SEARCH_MARGIN = 0; // 15;
const TABLE_LINE_THRESHOLD = 7;

function createSkiaPath(points: PathCommand[], ratio: number): any {
    const skPath = Skia.Path.Make();
    if (points.length === 0) return skPath;

    // Draw lines to subsequent points
    for (let i = 0; i < points.length; i++) {
        const [verb, x, y] = points[i];
        if (verb == PathVerb.Move) {
            skPath.moveTo(x * ratio, y * ratio);
        } else if (verb == PathVerb.Line) {
            // if (i == 1) console.log("line at", x , y , "ratioRef", ratioRef)
            skPath.lineTo(x * ratio, y * ratio);
        }
    }
    return skPath;
}

function toCmds(path: SkPath, ratio: number): PathCommand[] {
    const commands = path.toCmds();
    return commands.map(c => [c[0], c[1] / ratio, c[2] / ratio]);
}

interface CanvasProps {
    paths?: SketchPath[];
    lines?: SketchLine[];
    texts?: SketchText[];
    images?: SketchImage[];
    elements?: SketchElement[]; // generic elements
    tables?: SketchTable[];
    overlays?: SketchOverlay[]; // fills and cuts
    selectionRect?: NormRect;
    selectionLasso?: SketchPoint[];
    showCutWhiteouts?: boolean;

    currentEdited: CurrentEdited;
    renderElements?: (elem: SketchElement) => any;
    elementsAttr?: (elem: SketchElement) => SketchElementAttributes | undefined
    canvasWidth: number;
    canvasHeight: number;

    zoom: number;
    onZoom: (newZoom: number) => void;
    onMoveCanvas: (newPos: Offset) => void;
    sketchColor: string;
    sketchStrokeWidth: number;

    ratio: number;
    offset: Offset;
    sideMargin: number;
    canvasTop: number;
    style: any;
    onSketchStart: (p: SketchPoint) => void;
    onSketchStep: (p: SketchPoint) => void;
    onSketchEnd: (Cmd?: PathCommand[]) => void;
    onTextChanged: (id: string, newText: string) => void;
    onCanvasClick: (p: SketchPoint, elem: ElementBase | TableContext | undefined) => void;
    onMoveElement: (type: MoveTypes, id: string, p: SketchPoint) => void;
    onMoveEnd: (type: MoveTypes, id: string) => void;

    onMoveTablePart?: (p: SketchPoint, tableContext: TableContext) => void;
    onMoveTablePartEnd?: (tableContext: TableContext) => void;
    onDeleteElement: (type: ElementTypes, id: string) => void;
    onCopyElement?: (id: string) => void; // cut pieces
    // formats part of a text: [start, end) of the text with this id
    onFormatText?: (id: string, start: number, end: number, patch: SpanStyle) => void;
    onTextClipboard?: (id: string, start: number, end: number, action: "cut" | "copy" | "paste") => void;
    textFormatEnabled?: boolean; // the selection format bar (settings feature)
    onTextYOverflow?: (elemId: string) => void;
    onTextCursorChange?: () => void;
    imageSource?: ImageURISource;
    background: number | undefined;
    originalBgImageHeight?: number;
    currentElementType: ElementTypes;
    language?: string;
    testID?: string;

    //viewShotRef: any;
}

/** A single (x, y) coordinate */
export interface Point {
    x: number;
    y: number;
}


function Canvas({
    style,
    onTextChanged,
    onCanvasClick,

    onSketchStart,
    onSketchStep,
    onSketchEnd,

    sketchColor,
    sketchStrokeWidth,

    onMoveElement,
    onMoveEnd,

    onMoveTablePart,
    onMoveTablePartEnd,
    onZoom,
    onMoveCanvas,
    onDeleteElement,
    onCopyElement,
    onFormatText,
    onTextClipboard,
    textFormatEnabled,
    onTextYOverflow,
    onTextCursorChange,
    paths,
    texts,
    lines,
    images,
    elements,
    tables,
    overlays,
    selectionRect,
    selectionLasso,
    showCutWhiteouts,
    currentEdited,
    renderElements,
    elementsAttr,

    imageSource,
    background,
    originalBgImageHeight,
    zoom,
    offset,
    ratio,
    sideMargin,
    canvasTop,
    canvasWidth,
    canvasHeight,
    currentElementType,
    language,
    testID,

}: CanvasProps, ref: any) {
    // Refs & State
    const isMoving = useRef(false);
    const elemMoveStart = useRef<{ x: number; y: number } | null>(null);
    const isDragMoving = useRef(false);
    const canvasRef = useRef<View | null>(null);
    //const viewOffset = useRef<Offset>({ x: 0, y: 0 });
    const canvasTopRef = useRef(canvasTop);
    const offsetRef = useRef(offset);
    const translateX = useSharedValue(offset.x);
    const translateY = useSharedValue(offset.y);

    const ratioRef = useRef(ratio);
    const ratioSV = useSharedValue(ratio); // Shared value for worklets
    const zoomRef = useRef(zoom);
    const canvasHeightRef = useRef(canvasHeight)
    const sideMarginRef = useRef(sideMargin);

    const lastPathSV = useSharedValue<SkPath>(Skia.Path.Make());
    const sketchInProgressRef = useRef<boolean>(false);
    const sketchPathInSaveProgressRef = useRef<boolean>(false);
    const sketchTimerRef = useRef<NodeJS.Timeout | undefined>();
    const skiaCanvasRef = useCanvasRef();
    const editTextRef = useRef<any>(null);
    const moveIconDisplay = useSharedValue<'none' | 'flex' | undefined>("flex");
    const visibleAnimatedStyle = useAnimatedStyle(() => ({
        display: moveIconDisplay.value
    }));

    const startSketchRef = useRef<{
        position: SketchPoint;
        elem?: ElementBase | TableContext;
        // what a tap selects, when it is not what a drag moves (select tool: a text on a piece)
        clickElem?: ElementBase;
        initialPosition?: SketchPoint;
        initialOffset?: Offset;
        pinch?: PinchSession;
    } | null>(null);

    const currentElementTypeRef = useRef<ElementTypes>(ElementTypes.Sketch);
    const moveContext = useRef<MoveContext | null>(null);

    const textsRef = useRef(texts || []);
    const imagesRef = useRef<SketchImage[]>(images || []);
    const tablesRef = useRef<SketchTable[]>(tables || []);
    const linesRef = useRef<SketchLine[]>(lines || []);
    const elementsRef = useRef<SketchElement[]>(elements || []);
    const currentEditedRef = useRef(currentEdited);

    const viewShotRef = useRef(null);

    // Effects
    useEffect(() => {
        textsRef.current = texts || [];
        imagesRef.current = images || [];
        tablesRef.current = tables || [];
        linesRef.current = lines || [];
        elementsRef.current = elements || [];
        currentEditedRef.current = currentEdited;
    }, [texts, images, tables, lines, elements, currentEdited]);

    useEffect(() => {
        // verify the last path is the same as lastPathSV
        if (lastPathSV.value && paths && paths.length > 0) {
            const cmds = toCmds(lastPathSV.value, ratioRef.current);
            const lastPath = paths[paths.length - 1];
            //console.log("xx", cmds[0],  lastPath.points[0])
            if (cmds.length > 0 && lastPath.points.length > 0 &&
                cmds[0][1] == lastPath.points[0][1] &&
                cmds[0][2] == lastPath.points[0][2]) {
                lastPathSV.value.reset();
            }
        }
    }, [paths]);

    useEffect(() => {
        zoomRef.current = zoom;
        ratioRef.current = ratio;
        ratioSV.value = ratio; // Sync shared value for worklets
        canvasHeightRef.current = canvasHeight;
        sideMarginRef.current = sideMargin;
        canvasTopRef.current = canvasTop;
    }, [zoom, ratio, canvasHeight, sideMargin, canvasTop]);

    useEffect(() => {
        console.log("offset change", isMoving.current, moveContext.current, moveContext.current?.lastPt)
        if (isMoving.current && moveContext.current && moveContext.current.lastPt) {
            // if the canvas moves as an element is being moved
            const dx = offsetRef.current.x - offset.x;
            const dy = offsetRef.current.y - offset.y;
            const newPt = [moveContext.current.lastPt[0] + dx, moveContext.current.lastPt[1] + dy] as SketchPoint;
            console.log("offset while move", dx, dy)
            moveContext.current.lastPt = newPt;
            onMoveElement?.(moveContext.current.type, moveContext.current.id, newPt);
        }
        //console.log("canvas offset changed", offset)
        offsetRef.current = offset;
        const duration = IIF(500, [isDragMoving.current, 0], [isMoving.current, 100], [startSketchRef.current?.pinch, 0]);
        translateX.value = withTiming(offset.x * ratioRef.current, { duration });
        translateY.value = withTiming(offset.y * ratioRef.current, { duration });

    }, [offset]);

    useEffect(() => {
        currentElementTypeRef.current = currentElementType;
    }, [currentElementType]);


    useImperativeHandle(ref, () => ({
        toThumbnail: () => {
            moveIconDisplay.value = "none";
            editTextRef.current?.prepareForThumbnail();
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (!viewShotRef.current) { reject(new Error("view not mounted")); return; }
                    captureRef(viewShotRef, { format: "jpg", quality: 0.6, height: dimensions.tileHeight, width: dimensions.tileWidth })
                        .then((uri) => resolve(uri))
                        .catch((e) => reject(e))
                        .finally(() => {
                            setTimeout(() => moveIconDisplay.value = "flex");
                        });
                }, 100);
            })
        },
        toExport: () => {
            moveIconDisplay.value = "none";
            editTextRef.current?.prepareForThumbnail();
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (!viewShotRef.current) { reject(new Error("view not mounted")); return; }
                    captureRef(viewShotRef, { format: "jpg", quality: 0.9, result: "base64" })
                        .then((uri) => {
                            //console.log("exported-file", uri)
                            resolve(uri)
                        })
                        .catch((e) => reject(e))
                        .finally(() => {
                            setTimeout(() => moveIconDisplay.value = "flex");
                        });
                }, 100)
            })
        },
        isMoving: (val: boolean) => {
            isDragMoving.current = val;
        }
        //getViewOffset: () => viewOffset.current,
    }));


    const isTouchOnInteractive = (x0: number, y0: number) => {
        const pt = screen2Canvas(x0, y0);
        const iconSize = 30 / ratioRef.current;

        // Check general elements (e.g. audio)
        if (elementsRef.current?.length) {
            const elemSize = 80 / ratioRef.current;
            const padding = currentElementTypeRef.current === ElementTypes.Element ? iconSize : 0;
            if (elementsRef.current.some(el =>
                pt[0] >= el.x - padding && pt[0] <= el.x + elemSize &&
                pt[1] >= el.y && pt[1] <= el.y + elemSize
            )) return true;
        }

        // The text format bar
        const bar = formatBarRectRef.current;
        if (bar && pt[0] * ratioRef.current >= bar.x && pt[0] * ratioRef.current <= bar.x + bar.width &&
            pt[1] * ratioRef.current >= bar.y && pt[1] * ratioRef.current <= bar.y + bar.height) return true;

        // Check image delete icon area (visible when image is selected)
        if ((currentElementTypeRef.current === ElementTypes.Image || currentElementTypeRef.current === ElementTypes.Cut)
            && currentEditedRef.current?.imageId) {
            const image = imagesRef.current?.find(img => img.id === currentEditedRef.current?.imageId);
            if (image) {
                // Delete icon at (image.x - 30/ratio, image.y)
                if (pt[0] >= image.x - iconSize && pt[0] <= image.x &&
                    pt[1] >= image.y && pt[1] <= image.y + iconSize) return true;
                // Copy icon (pieces) below it
                const copyTop = image.y + 40 / ratioRef.current;
                if (currentElementTypeRef.current === ElementTypes.Cut && pt[0] >= image.x - iconSize && pt[0] <= image.x &&
                    pt[1] >= copyTop && pt[1] <= copyTop + iconSize) return true;
                // Resize icon at (image.x + image.width, image.y + image.height)
                if (pt[0] >= image.x + image.width - iconSize && pt[0] <= image.x + image.width + iconSize &&
                    pt[1] >= image.y + image.height - iconSize && pt[1] <= image.y + image.height + iconSize) return true;
            }
        }

        // Check line delete icon area (visible when line is selected)
        if (currentElementTypeRef.current === ElementTypes.Line && currentEditedRef.current?.lineId) {
            const line = linesRef.current?.find(l => l.id === currentEditedRef.current?.lineId);
            if (line) {
                const midX = (line.from[0] + line.to[0]) / 2;
                const midY = (line.from[1] + line.to[1]) / 2;
                if (pt[0] >= midX - iconSize && pt[0] <= midX + iconSize &&
                    pt[1] >= midY - iconSize && pt[1] <= midY + iconSize) return true;
            }
        }

        return false;
    };

    // PanResponder for sketching
    const sketchResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: (e) => {
                if (isMoving.current) return false;
                return !isTouchOnInteractive(e.nativeEvent.pageX, e.nativeEvent.pageY);
            },
            onMoveShouldSetPanResponder: (e) => {
                if (isMoving.current) return false;
                return !isTouchOnInteractive(e.nativeEvent.pageX, e.nativeEvent.pageY);
            },
            onPanResponderGrant: (e, gState) => {
                const clickPoint = screen2Canvas(gState.x0, gState.y0);
                startSketchRef.current = { position: clickPoint, initialOffset: offsetRef.current };

                if (currentElementTypeRef.current !== ElementTypes.Sketch) {
                    const elem = searchElement(...clickPoint);
                    if (currentElementTypeRef.current === ElementTypes.Cut) {
                        // select tool: a tap on a text selects it; a drag moves the piece (a text moves by its handle)
                        startSketchRef.current.clickElem = visibleTextAt(textsRef.current, imagesRef.current, ...clickPoint, TEXT_SEARCH_MARGIN);
                    }
                    if (elem) {
                        startSketchRef.current.elem = elem;
                        if ("x" in elem && "y" in elem) {
                            // not line
                            startSketchRef.current.initialPosition = [elem.x, elem.y];
                        } else if ("from" in elem) {
                            startSketchRef.current.initialPosition = elem.from;
                        }
                    }
                    if (!elem && (
                        currentElementTypeRef.current === ElementTypes.Table || currentElementTypeRef.current === ElementTypes.Text)) {
                        const tableContext = searchTable(...clickPoint, currentElementTypeRef.current === ElementTypes.Text);
                        if (tableContext) {
                            startSketchRef.current = { ...startSketchRef.current, initialPosition: tableContext.initialPosition, elem: tableContext };
                        }
                    }
                }
            },
            onPanResponderMove: (e, gState) => {
                if (gState.numberActiveTouches == 1 && Math.abs(gState.dx) < 2 && Math.abs(gState.dy) < 2) return;
                const newPoint = screen2Canvas(gState.moveX, gState.moveY);

                if (startSketchRef.current) {
                    // Zoom and Move
                    if (gState.numberActiveTouches == 2) {

                        const touches = e.nativeEvent.touches
                        const p1 = [touches[0]?.pageX, touches[0]?.pageY] as SketchPoint
                        const p2 = [touches[1]?.pageX, touches[1]?.pageY] as SketchPoint


                        if (!startSketchRef.current.pinch) {
                            startSketchRef.current.pinch = new PinchSession(
                                {
                                    initialOffset: offsetRef.current,
                                    zoom: zoomRef.current,
                                    minZoom: 1,
                                    p1, p2,

                                },
                                (event: PinchHelperEvent) => {
                                    onZoom(event.zoom);
                                    onMoveCanvas(event.offset);
                                }
                            );
                        }

                        startSketchRef.current.pinch.processPinch(p1, p2);

                        return;
                    }


                    if (!startSketchRef.current.elem) {
                        if (currentElementTypeRef.current === ElementTypes.Sketch) {
                            if (sketchTimerRef.current) {
                                console.log("sketch continue - cancel save timer")
                                clearTimeout(sketchTimerRef.current);
                                sketchTimerRef.current = undefined;
                                // continue the previous sketch

                                lastPathSV.value.moveTo(
                                    parseFloat((startSketchRef.current.position[0] * ratioSV.value).toFixed(1)),
                                    parseFloat((startSketchRef.current.position[1] * ratioSV.value).toFixed(1))
                                )

                                sketchInProgressRef.current = true;
                            }
                            // else if (sketchPathInSaveProgressRef.current) {
                            //     if (lastPathSV.value.countPoints() > 0) {
                            //         lastPathSV.value.reset();
                            //     }
                            //     sketchPathInSaveProgressRef.current = false;
                            // } 


                            if (!sketchInProgressRef.current) {
                                // init line
                                lastPathSV.value.reset();
                                lastPathSV.value.moveTo(
                                    parseFloat((startSketchRef.current.position[0] * ratioSV.value).toFixed(1)),
                                    parseFloat((startSketchRef.current.position[1] * ratioSV.value).toFixed(1))
                                )
                            }

                            sketchInProgressRef.current = true;

                        } else if (currentElementTypeRef.current === ElementTypes.Line ||
                            currentElementTypeRef.current === ElementTypes.Cut) {
                            onSketchStart(startSketchRef.current.position);
                        }
                        startSketchRef.current = null;
                    } else {
                        // Move or resize an element
                        const dx = gState.dx / (zoomRef.current * ratioRef.current);
                        const dy = gState.dy / (zoomRef.current * ratioRef.current);

                        const { initialPosition, elem, initialOffset } = startSketchRef.current;
                        if (initialPosition && elem && currentElementTypeRef.current != ElementTypes.Text) {
                            const pt: SketchPoint = [initialPosition[0] + dx, initialPosition[1] + dy];
                            if ("id" in elem) {
                                isMoving.current = true;
                                const moveType = currentElementTypeRef.current == ElementTypes.Line ? MoveTypes.LineMove : MoveTypes.ImageMove;
                                if (moveContext.current == null) {
                                    moveContext.current = { type: moveType, id: elem.id, offsetX: 0, offsetY: 0 };
                                }
                                moveContext.current.lastPt = pt;
                                onMoveElement(moveType, elem.id, pt);
                            } else {
                                onMoveTablePart?.(pt, elem);
                            }
                        } else if (initialOffset) {
                            isDragMoving.current = true;
                            onMoveCanvas({ x: initialOffset.x + dx, y: initialOffset.y + dy });
                        }
                        return; // Do not proceed to `onSketchStep` if moving an element
                    }
                }
                if (currentElementTypeRef.current === ElementTypes.Sketch) {
                    //console.log("sketch step")
                    lastPathSV.modify(p => {
                        "worklet"
                        return p.lineTo(newPoint[0] * ratioSV.value, newPoint[1] * ratioSV.value) as any;
                    })
                } else if (currentElementTypeRef.current === ElementTypes.Line ||
                    currentElementTypeRef.current === ElementTypes.Cut) {
                    onSketchStep(newPoint);
                } else {
                    // pass a screen point, as offset may change during...
                    if (e.nativeEvent) {
                        onSketchStep([e.nativeEvent.pageX, e.nativeEvent.pageY]);
                        isDragMoving.current = true;
                    }
                }
            },
            onPanResponderRelease: (_, gState) => {
                if (startSketchRef.current?.pinch) {
                    startSketchRef.current = null;
                    return;
                }
                //console.log("x1", gState, Math.abs(gState.dx) < 2 && Math.abs(gState.dy) < 2)
                if (Math.abs(gState.dx) < 2 && Math.abs(gState.dy) < 2) {
                    // Possibly a tap/click
                    if (startSketchRef.current) {
                        onCanvasClick(startSketchRef.current.position, startSketchRef.current.clickElem ?? startSketchRef.current.elem);
                    }
                    startSketchRef.current = null;
                    return;
                }
                const elem = startSketchRef.current?.elem;

                if (!elem && currentElementTypeRef.current === ElementTypes.Sketch) {
                    const finalPoint = screen2Canvas(gState.moveX, gState.moveY);
                    const finalX = parseFloat((finalPoint[0] * ratioRef.current).toFixed(1));
                    const finalY = parseFloat((finalPoint[1] * ratioRef.current).toFixed(1));
                    sketchInProgressRef.current = false;

                    // Add the final point via modify() so it queues after all in-flight worklet lineTo calls.
                    // Then read back on JS thread via setTimeout(0) — by then the worklet queue has flushed.
                    lastPathSV.modify(p => {
                        "worklet";
                        p.lineTo(finalX, finalY);
                        return p;
                    });

                    setTimeout(() => {
                        const commands = toCmds(lastPathSV.value, ratioRef.current);
                        sketchTimerRef.current = setTimeout(() => {
                            sketchTimerRef.current = undefined;
                            if (!sketchInProgressRef.current) {
                                sketchPathInSaveProgressRef.current = true;
                                onSketchEnd(commands);
                            }
                        }, 300);
                    }, 0);
                } else if (!elem && (currentElementTypeRef.current === ElementTypes.Line ||
                    currentElementTypeRef.current === ElementTypes.Cut)) {
                    onSketchEnd();
                } else if (elem) {
                    if ("id" in elem) {
                        onMoveEnd(
                            currentElementTypeRef.current == ElementTypes.Line ? MoveTypes.LineMove : MoveTypes.ImageMove,
                            (elem as ElementBase).id);
                        isMoving.current = false;
                        moveContext.current = null;

                    } else {
                        onMoveTablePartEnd?.(elem);
                    }
                } else if (currentElementTypeRef.current === ElementTypes.Text) {
                    isDragMoving.current = false;
                    onSketchEnd();
                }
                startSketchRef.current = null;
                isDragMoving.current = false;
            },
        })
    ).current;

    // PanResponder for moving elements (like text, lines, etc.)
    // a text being dragged by its handle (text mode): the piece under it is highlighted
    const [movingTextId, setMovingTextId] = useState<string | undefined>();
    const movingTextIdRef = useRef<string | undefined>(undefined);

    const moveResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => {
                isMoving.current = true;
                return true;
            },
            onPanResponderMove: (e, gState) => {
                if (moveContext.current?.type === MoveTypes.Text && movingTextIdRef.current !== moveContext.current.id) {
                    movingTextIdRef.current = moveContext.current.id;
                    setMovingTextId(moveContext.current.id);
                }
                if (moveContext.current) {
                    // +15 / -15 offset for text handle, etc. Adjust as needed for images
                    const canvasPos0 = screen2Canvas(gState.x0 + gState.dx + moveContext.current.offsetX * zoomRef.current, gState.y0 + gState.dy + moveContext.current.offsetY * zoomRef.current);
                    moveContext.current.lastPt = canvasPos0;
                    onMoveElement?.(moveContext.current.type, moveContext.current.id, canvasPos0);
                }
            },
            onPanResponderRelease: () => {
                isMoving.current = false;
                if (movingTextIdRef.current) {
                    movingTextIdRef.current = undefined;
                    setMovingTextId(undefined);
                }
                if (moveContext.current) {
                    onMoveEnd?.(moveContext.current.type, moveContext.current.id);
                }
            },
        })
    ).current;

    // Convert screen coordinates to canvas coordinates
    const screen2Canvas = (x: number, y: number): SketchPoint => {
        // trace("screen2Canvas", { canvasTop: canvasTopRef.current, ratio: ratioRef.current })
        return [
            (x - sideMarginRef.current) / (zoomRef.current * ratioRef.current) - offsetRef.current.x,
            (y - canvasTopRef.current) / (zoomRef.current * ratioRef.current) - offsetRef.current.y,
        ];
    }

    const searchTable = useCallback((cx: number, cy: number, searchCell: boolean): TableContext | undefined => {
        for (const table of tablesRef.current) {
            // 0. calculate effective hlines
            const horizontalLines = calcEffectiveHorizontalLines(table, canvasHeightRef.current / ratioRef.current, textsRef.current);

            if (!searchCell) {
                // 1. Check if near a vertical or horizontal line
                for (let v = 1; v < table.verticalLines.length - 1; v++) {
                    if (Math.abs(table.verticalLines[v] - cx) < TABLE_LINE_THRESHOLD) {
                        return {
                            elem: table,
                            vLine: v,
                            initialPosition: [table.verticalLines[v], table.verticalLines[v]]
                        };
                    }
                }

                //console.log("xxx", cx, cy, table.verticalLines, horizontalLines)
                for (let h = 1; h < horizontalLines.length - 1; h++) {
                    if (Math.abs(horizontalLines[h] - cy) < TABLE_LINE_THRESHOLD) {
                        return {
                            elem: table,
                            hLine: h,
                            initialPosition: [horizontalLines[h], horizontalLines[h]]
                        };
                    }
                }
            }

            // 2. Not near a line – find the cell (if any) the click is in
            let cellX = -1;
            let cellY = -1;

            // Find column by checking between vertical lines
            for (let col = 0; col < table.verticalLines.length - 1; col++) {
                const leftX = table.verticalLines[col];
                const rightX = table.verticalLines[col + 1];
                if (cx >= leftX && cx < rightX) {
                    cellX = col; // zero-based column index
                    break;
                }
            }

            // Find row by checking between horizontal lines
            for (let row = 0; row < horizontalLines.length - 1; row++) {
                const topY = horizontalLines[row];
                const bottomY = horizontalLines[row + 1];
                if (cy >= topY && cy < bottomY) {
                    cellY = row; // zero-based row index
                    break;
                }
            }

            // If the click is inside a cell within this table, return the cell info
            if (cellX !== -1 && cellY !== -1) {
                return {
                    elem: table,
                    cell: [cellX, cellY],
                    initialPosition: [horizontalLines[cellX], horizontalLines[cellY]]
                };
            }
        }
        // 3. Click not on any line or cell of any table
        return undefined;
    }, []);

    const searchElement = useCallback((cx: number, cy: number) => {
        if (currentElementTypeRef.current === ElementTypes.Text) {
            //console.log("searchElement txt",textsRef.current)
            return textsRef.current?.find(t => !t.tableId && inBox(t, cx, cy, TEXT_SEARCH_MARGIN));
        }
        if (currentElementTypeRef.current === ElementTypes.Image || currentElementTypeRef.current === ElementTypes.Cut) {
            // the piece on top (images are pieces)
            return topPieceAt(imagesRef.current, cx, cy);
        }
        if (currentElementTypeRef.current === ElementTypes.Line) {
            const THRESHOLD = 10; // how close to the line is acceptable?

            return linesRef.current?.find((line) =>
                isPointOnLineSegment(line.from, line.to, cx, cy, THRESHOLD)
            );
        }
    }, []);

    const handleCursorPositionChange = useCallback((top2cursorHeight: number, text: SketchText) => {
        console.log("handleCursorPositionChange", top2cursorHeight)
        text.tempTop2CursorHeight = top2cursorHeight / ratioRef.current;
        onTextCursorChange?.();
    }, []);

    const handleTextLayout = useCallback((e: LayoutChangeEvent, text: SketchText) => {
        const { width, height } = e.nativeEvent.layout;
        text.width = width / ratioRef.current;
        let table: SketchTable | undefined = undefined;
        let tableEndY = 0

        if (text.tableId) {
            table = tablesRef.current?.find(table => table.id == text.tableId)
            if (table) {
                tableEndY = arrLast(calcEffectiveHorizontalLines(table, 99999, // in this case we don;t want to limit */, 
                    textsRef.current)) ?? 0;
            }
        }

        //const prevHeight = text.height || 0;
        const normHeight = canvasHeightRef.current / ratioRef.current;
        text.height = height / ratioRef.current;
        trace("handleTextLayout", normHeight, text.height, "bottom", text.y + height / ratioRef.current)
        if (!text.tableId && text.y + height / ratioRef.current > normHeight) {
            trace("non table y-overflow")
            // change in height passed end of page
            onTextYOverflow?.(text.id);
        } else if (table) {
            const tableEndYAfter = arrLast(calcEffectiveHorizontalLines(table, 99999, // in this case we don;t want to limit */, 
                textsRef.current)) ?? 0;
            trace("table y-overflow", { normHeight, tableEndYAfter, tableEndY });

            if (tableEndYAfter > normHeight && tableEndY <= normHeight) {
                onTextYOverflow?.(text.id);
            }
        }
    }, []);

    imageSource = normalizeFoAndroid(imageSource)
    //console.log("canvas render", ratio, canvasWidth)
    const isEraser = (color: string) => color === ERASER_COLOR;

    const showImageControls = (image: SketchImage) => currentEdited.imageId == image.id &&
        (currentElementType == ElementTypes.Image || currentElementType == ElementTypes.Cut);

    const [, setImagesLoaded] = useState(0);

    // The selection in the text being edited, and the format bar shown for it
    const [textSelection, setTextSelection] = useState<{ id: string; start: number; end: number } | undefined>();
    const handleTextSelection = useCallback((id: string, sel: { start: number; end: number }) =>
        setTextSelection({ id, start: Math.min(sel.start, sel.end), end: Math.max(sel.start, sel.end) }), []);
    useEffect(() => setTextSelection(undefined), [currentEdited.textId]);
    // the edited text box's layout (view points), to place the bar under it
    const [editLayout, setEditLayout] = useState<{ id: string; x: number; y: number; width: number; height: number } | undefined>();
    const handleEditLayout = useCallback((id: string, l: { x: number; y: number; width: number; height: number }) =>
        setEditLayout({ id, ...l }), []);
    // with a cursor only, the bar offers Paste - when there is text to paste
    const [canPaste, setCanPaste] = useState(false);
    useEffect(() => {
        if (!textFormatEnabled || !textSelection || textSelection.end > textSelection.start) return;
        let live = true;
        Clipboard.hasString().then(has => live && setCanPaste(has)).catch(() => { });
        return () => { live = false; };
    }, [textSelection, textFormatEnabled]);
    const formatBarRectRef = useRef<{ x: number; y: number; width: number; height: number } | undefined>(undefined);

    const renderFormatBar = () => {
        formatBarRectRef.current = undefined;
        const sel = textSelection;
        if (!textFormatEnabled || currentElementType != ElementTypes.Text || !sel || sel.id !== currentEdited.textId) return null;
        const text = texts?.find(t => t.id === sel.id);
        if (!text || text.tableId) return null;
        const pasteOnly = sel.end <= sel.start;
        if (pasteOnly && !canPaste) return null;
        const box = editLayout?.id === text.id ? editLayout : undefined;
        // the first row: 6 format buttons, a divider, cut/copy/paste
        const width = pasteOnly ? 48 : 9 * 40 + 18;
        // above the text box, or below it when there is no room above; kept within the page width
        const boxTop = box ? box.y : text.y * ratio;
        const boxBottom = box ? box.y + box.height : (text.y + text.fontSize) * ratio;
        const above = boxTop - FORMAT_BAR_HEIGHT - 8 >= 0;
        const boxLeft = box ? box.x : textBox(text).x * ratio;
        const boxRight = box ? box.x + box.width : boxLeft + (text.width ?? 0) * ratio;
        const preferred = text.rtl ? boxRight - width : boxLeft;
        const left = Math.max(0, Math.min(preferred, canvasWidth - width));
        formatBarRectRef.current = above ?
            { x: left, y: boxTop - 8 - FORMAT_BAR_HEIGHT * 2, width, height: FORMAT_BAR_HEIGHT * 2 } :
            { x: left, y: boxBottom + 8, width, height: FORMAT_BAR_HEIGHT * 2 };
        const at = styleAt(text.spans, sel.start);
        const onSize = (step: 1 | -1) => {
            const current = (at.fontSize ?? text.fontSize) * ratio;
            const next = step > 0 ?
                textSizes.find((sz: number) => sz > current + 0.5) ?? current + 5 :
                [...textSizes].reverse().find((sz: number) => sz < current - 0.5) ?? Math.max(current - 5, 10);
            onFormatText?.(text.id, sel.start, sel.end, { fontSize: next / ratio });
        };
        return <TextFormatBar
            left={left}
            {...(above ? { bottom: canvasHeight - (boxTop - 8) } : { top: boxBottom + 8 })}
            pasteOnly={pasteOnly}
            bold={allHave(text.spans, sel.start, sel.end, "bold", !!text.bold)}
            italic={allHave(text.spans, sel.start, sel.end, "italic", !!text.italic)}
            underline={allHave(text.spans, sel.start, sel.end, "underline", !!text.underline)}
            color={at.color ?? text.color}
            onFormat={patch => onFormatText?.(text.id, sel.start, sel.end, patch)}
            onSize={onSize}
            onClipboard={action => onTextClipboard?.(text.id, sel.start, sel.end, action)}
        />;
    };

    // How a piece is shown away from where its content was laid out: moved (dx, dy, in view points)
    // and resized (sx, sy around its corner ox, oy), while it is dragged or resized
    const pieceDelta = (pieceId?: string | null) => {
        const piece = pieceId ? images?.find(i => i.id === pieceId) : undefined;
        if (!piece) return undefined;
        const ox = (piece.originX ?? piece.x) * ratio, oy = (piece.originY ?? piece.y) * ratio;
        const dx = piece.x * ratio - ox, dy = piece.y * ratio - oy;
        const sx = piece.width / (piece.originWidth ?? piece.width), sy = piece.height / (piece.originHeight ?? piece.height);
        return dx || dy || sx !== 1 || sy !== 1 ? { dx, dy, sx, sy, ox, oy } : undefined;
    };
    const pieceTransform = (d: ReturnType<typeof pieceDelta>) => d ? [
        { translateX: d.dx + d.ox }, { translateY: d.dy + d.oy }, { scaleX: d.sx }, { scaleY: d.sy },
        { translateX: -d.ox }, { translateY: -d.oy },
    ] : [];
    // a piece's text follows it: the text's box placed where the piece moves/scales it to
    const textOffset = (text: SketchText) => {
        const d = pieceDelta(text.pieceId);
        if (!d) return undefined;
        const b = textBox(text);
        const L = b.x * ratio, T = b.y * ratio, W = b.width * ratio, H = b.height * ratio;
        const s = (d.sx + d.sy) / 2;
        const cx = d.ox + (L - d.ox) * d.sx + d.dx + W * s / 2, cy = d.oy + (T - d.oy) * d.sy + d.dy + H * s / 2;
        return { dx: cx - (L + W / 2), dy: cy - (T + H / 2), scale: s };
    };

    const renderDrawItem = (it: DrawItem) => {
        if (it.path) {
            const p = it.path;
            return <SkiaPath
                key={p.id}
                path={createSkiaPath(p.points, ratio)}
                color={isEraser(p.color) ? "black" : p.color}
                style={"stroke"}
                strokeWidth={p.strokeWidth}
                blendMode={isEraser(p.color) ? "dstOut" : "srcOver"}
            />;
        }
        const o = it.overlay!;
        const rect = { x: o.x * ratio, y: o.y * ratio, width: o.width * ratio, height: o.height * ratio };
        if (o.kind === "cut") {
            return o.points ?
                <SkiaPath key={o.id} path={cutShapePath(o, ratio)} color="black" blendMode="dstOut" /> :
                <SkiaRect key={o.id} {...rect} color="black" blendMode="dstOut" />;
        }
        const image = getOverlayImage(o);
        return image && <SkiaImage key={o.id} image={image} {...rect} fit="fill" />;
    };

    // The text selected with the select tool, or dragged in text mode, shows the piece it lies on
    const highlightTextId = currentEdited.selectedTextId ?? movingTextId;
    const highlightText = highlightTextId ? texts?.find(t => t.id === highlightTextId) : undefined;
    // its parent; while it is being moved, the piece it would land on
    const textMoving = highlightText && (highlightText.id === movingTextId || !!highlightText.backup);
    const highlightPieceId = !highlightText ? undefined :
        textMoving ? topPieceAt(images, ...textCenter(highlightText))?.id : (highlightText.pieceId ?? undefined);

    // A piece: its paper, then its own paint and ink in a layer of their own,
    // so its erasers clear only its ink. Paint stays inside the piece's outline.
    const renderPiece = (piece: SketchImage, items: DrawItem[], layerIndex: number) => {
        const ox = piece.originX ?? piece.x, oy = piece.originY ?? piece.y;
        const ow = piece.originWidth ?? piece.width, oh = piece.originHeight ?? piece.height;
        const d = pieceDelta(piece.id);
        const clip = pieceClipPath({ ...piece, width: ow, height: oh }, ratio, ox, oy);
        const image = piece.src?.uri ? getUriImage(piece.src.uri, () => setImagesLoaded(n => n + 1)) : null;
        // with the select tool, pieces look raised: a soft shadow and a thin outline
        const marked = currentElementType == ElementTypes.Cut;
        const highlighted = piece.id === highlightPieceId;
        return <SkiaGroup key={"layer-" + layerIndex} transform={pieceTransform(d)}>
            {marked && <SkiaGroup clip={clip} invertClip>
                {/* outside the piece only: a transparent piece (blank page) does not show it through */}
                <SkiaGroup transform={[{ translateX: 2 }, { translateY: 3 }]}>
                    <SkiaPath path={clip} color="rgba(0,0,0,0.35)"><BlurMask blur={5} style="normal" /></SkiaPath>
                </SkiaGroup>
            </SkiaGroup>}
            {image && <SkiaGroup clip={clip}>
                <SkiaImage image={image} fit="fill"
                    x={ox * ratio} y={oy * ratio} width={ow * ratio} height={oh * ratio} />
            </SkiaGroup>}
            {items.length > 0 && <SkiaGroup layer>
                {items.map(it => it.overlay?.kind === "fill" ?
                    <SkiaGroup key={it.overlay.id} clip={clip}>{renderDrawItem(it)}</SkiaGroup> :
                    renderDrawItem(it))}
            </SkiaGroup>}
            {(marked || highlighted) && <SkiaPath path={clip} style="stroke" strokeWidth={highlighted ? 4 : 1}
                color={highlighted ? "#1E90FF" : "rgba(30,144,255,0.7)"} />}
        </SkiaGroup>;
    };

    // A piece being dragged is on top while it moves (it is brought to the top when dropped)
    const isDragged = (img: SketchImage) => img.x !== (img.originX ?? img.x) || img.y !== (img.originY ?? img.y);
    const drawLayers = useMemo(() => buildDrawLayers(paths, overlays,
        images?.map(img => isDragged(img) ? { ...img, z: Number.MAX_SAFE_INTEGER } : img)), [paths, overlays, images]);
    // Layers are keyed by position, not id: when the order changes the layers update in place
    // rather than being moved, which the Skia renderer does not reliably reorder.

    // Texts are views above the drawing: to have a piece laid over a text cover it, the drawing is
    // split into stacked canvases with the covered texts between them. The edited text is on top.
    const editedTextId = (currentElementType == ElementTypes.Text || currentElementType == ElementTypes.Table)
        ? currentEdited.textId : undefined;
    const onTopTextId = editedTextId ?? currentEdited.selectedTextId;
    // (not memoized: a text's measured size is set on its layout, in place)
    const stack = stackTexts(drawLayers, texts, onTopTextId);
    // canvas k: zIndex 8 + 2k; the texts right under it: one less; texts above all: 13
    const textZIndex = (level: number) => level >= stack.canvases.length ? 13 : 7 + 2 * level;

    const transformStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { scale: zoom },
                { translateX: translateX.value },
                { translateY: translateY.value },
            ],
        };
    });


    return (
        <Animated.View
            ref={canvasRef}
            testID={testID}
            style={[
                styles.container,
                style,
                {
                    marginLeft: sideMargin,
                    width: canvasWidth,
                    height: canvasHeight,
                    transformOrigin: "0 0 0",
                    // transform: [
                    //     { scale: zoom },
                    //     { translateX },
                    //     { translateY },
                    // ],

                },
                transformStyle
            ]}
            // onLayout={(e) => {
            //     console.log("canvas onLayout", e.nativeEvent.layout)
            //     setTimeout(() =>
            //         canvasRef.current?.measure((x, y, w, h, px, py) => {
            //             viewOffset.current = {
            //                 x: Math.floor(px - offsetRef.current.x * ratio * zoomRef.current),
            //                 y: Math.floor(py - offsetRef.current.y * ratio * zoomRef.current)
            //             };
            //             console.log("View offset:", viewOffset.current)
            //         }), 500)
            // }}

            {...sketchResponder.panHandlers}
        >
            <View style={{ direction: "ltr", flex: 1, backgroundColor: "white" }} collapsable={false} ref={viewShotRef}
            >

                {/* Background Image */}
                {imageSource && (
                    <Image
                        source={imageSource}
                        style={{
                            zIndex: 0,
                            position: "absolute",
                            width: Math.round(canvasWidth),
                            height: Math.round(originalBgImageHeight && originalBgImageHeight > 0 ? originalBgImageHeight : canvasHeight),
                        }}
                    />
                )}

                {/* Areas cut out of the background */}
                {showCutWhiteouts && overlays?.some(o => o.kind === "cut") &&
                    <Svg height="100%" width="100%" style={{ position: "absolute", zIndex: 0 }} pointerEvents="none">
                        {overlays.filter(o => o.kind === "cut").map(c => (
                            <Path key={c.id} d={cutShapePath(c, ratio).toSVGString()} fill="white" />
                        ))}
                    </Svg>}

                {(background == FileSystem.StaticPages.Lines || background == FileSystem.StaticPages.Math) && <Lines
                    height={canvasHeight}
                />}
                {background == FileSystem.StaticPages.Math && <VLines
                    width={canvasWidth}
                />}

                {stack.canvases.map((layers: DrawLayer[], k: number) => {
                    const first = stack.canvases.slice(0, k).reduce((n, c) => n + c.length, 0);
                    const last = k === stack.canvases.length - 1;
                    return <SkiaCanvas
                        key={"canvas-" + k}
                        ref={k === 0 ? skiaCanvasRef : undefined}
                        style={{
                            position: "absolute",
                            width: "100%",
                            height: "100%",
                            zIndex: 8 + 2 * k,
                        }}
                    >
                        {/* Base ink and paint, and pieces on top of them - in the order last touched */}
                        {layers.map((layer, j) => layer.piece ?
                            renderPiece(layer.piece, layer.items, first + j) :
                            <SkiaGroup key={"layer-" + (first + j)} layer>
                                {layer.items.map(renderDrawItem)}
                                {layer.erasers.map(it => <React.Fragment key={"clear-" + (it.path ?? it.overlay)!.id}>{renderDrawItem(it)}</React.Fragment>)}
                            </SkiaGroup>)}

                        {last && <SkiaPath
                            path={lastPathSV}
                            color={isEraser(sketchColor) ? "black" : sketchColor}
                            style={"stroke"}
                            strokeWidth={sketchStrokeWidth}
                            blendMode={isEraser(sketchColor) ? "dstOut" : "srcOver"}
                        />}
                    </SkiaCanvas>;
                })}

                {/* Text Elements */}
                {texts?.map((text) => {
                    const editMode = (currentElementType == ElementTypes.Text || currentElementType == ElementTypes.Table)
                        && text.id == currentEdited.textId
                    const d = textOffset(text);
                    return <TextElement
                        ref={editMode ? editTextRef : undefined}
                        key={text.id}
                        text={text}
                        editMode={editMode}
                        texts={texts}
                        tables={tables}
                        actualWidth={canvasWidth}
                        ratio={ratio}
                        moveResponder={moveResponder}
                        moveContext={moveContext}
                        onTextChanged={onTextChanged}
                        handleTextLayout={handleTextLayout}
                        handleCursorPositionChange={handleCursorPositionChange}
                        canvasHeight={canvasHeight / ratio}
                        language={language}
                        dragOffset={d}
                        touchable={currentElementType != ElementTypes.Cut}
                        onSelectionChange={handleTextSelection}
                        hideEditMenu={!!textFormatEnabled}
                        onEditLayout={handleEditLayout}
                        zIndex={textZIndex(stack.textLevel.get(text.id) ?? stack.canvases.length)}
                    />
                })}

                {renderFormatBar()}

                {/* a text selected with the select tool: moved by its handle (dragging elsewhere moves the piece) */}
                {currentElementType == ElementTypes.Cut && highlightText && (() => {
                    const b = textBox(highlightText);
                    const t = highlightText;
                    // the handle beside the text's start, as when editing it
                    const hx = t.rtl ? (b.x + b.width) * ratio + 6 : b.x * ratio - 36;
                    return <React.Fragment>
                        <View pointerEvents="none" testID="selected-text" style={{
                            position: "absolute", zIndex: 2000,
                            left: b.x * ratio - 4, top: b.y * ratio - 4, width: b.width * ratio + 8, height: b.height * ratio + 8,
                            borderWidth: 2, borderStyle: "dashed", borderColor: "#1E90FF",
                        }} />
                        <MoveIcon
                            style={[styles.moveIcon, visibleAnimatedStyle]}
                            position={[hx, b.y * ratio - 4]}
                            size={30}
                            panResponderHandlers={moveResponder.panHandlers}
                            onSetContext={() => {
                                // the text's corner relative to the touch (the handle's center)
                                moveContext.current = { type: MoveTypes.Text, id: t.id, offsetX: t.rtl ? -21 : 21, offsetY: -11 };
                            }}
                            icon="move"
                            color="blue"
                        />
                    </React.Fragment>;
                })()}

                {/* Lines in edit mode */}
                {currentElementType == ElementTypes.Line && currentEdited.lineId &&
                    lines?.filter(line => line.id == currentEdited.lineId)
                        .map((line) => {
                            const angle = calculateLineAngle(line.from, line.to);
                            const trashPos = calculateLineTrashPoint(line.from, line.to, (angle + 90) % 360, 20);

                            const transform = { transform: [{ rotate: `${angle}deg` }] };
                            return (
                                <View key={line.id}>
                                    <MoveIcon
                                        style={[transform, styles.moveIcon, visibleAnimatedStyle]}
                                        position={[line.from[0] * ratio - 8, line.from[1] * ratio - 8]}
                                        size={16}
                                        panResponderHandlers={moveResponder.panHandlers}
                                        onSetContext={() => {
                                            moveContext.current = { type: MoveTypes.LineStart, id: line.id, offsetX: 0, offsetY: 0 };
                                        }}
                                        icon="square"
                                        color={line.color}
                                    />

                                    <MoveIcon
                                        style={[transform, styles.moveIcon, visibleAnimatedStyle]}
                                        position={[line.to[0] * ratio - 8, line.to[1] * ratio - 8]}
                                        size={16}
                                        panResponderHandlers={moveResponder.panHandlers}
                                        onSetContext={() => {
                                            moveContext.current = { type: MoveTypes.LineEnd, id: line.id, offsetX: 0, offsetY: 0 };
                                        }}
                                        icon="square"
                                        color={line.color}
                                    />

                                    <AnimatedTouchableOpacity
                                        key={`${line.id}-trash`}
                                        style={[{
                                            position: "absolute",

                                            left: trashPos[0] * ratio - 11,
                                            top: trashPos[1] * ratio - 11,
                                        }, styles.moveIcon, visibleAnimatedStyle]}
                                        onPress={() => onDeleteElement?.(ElementTypes.Line, line.id)}
                                    >
                                        <MyIcon info={{ type: "Ionicons", name: "trash-outline", size: 22, color: "blue" }} />
                                    </AnimatedTouchableOpacity>
                                </View>
                            );
                        })}



                {/* Paths & Lines (Non-edit) */}
                <Svg height="100%" width="100%" style={{ position: "absolute", zIndex: 8 }}>

                    {lines?.map((line) => (
                        <Path
                            key={line.id}
                            d={joinPath([line.from, line.to], ratio)}
                            stroke={line.color}
                            strokeWidth={line.strokeWidth}
                            fill="none"
                        />
                    ))}
                    {// Tables 
                    }
                    {tables?.map((table) => {
                        const horizontalLines = calcEffectiveHorizontalLines(table, canvasHeight / ratio, texts);

                        const lines = [];
                        const dashArray = table.strokeDash && table.strokeDash.map((v: number) => v * 5);

                        for (let i = 0; i < horizontalLines.length; i++) {
                            const hLine = horizontalLines[i];
                            lines.push(<Path
                                key={`${table.id}h${i}`}
                                d={joinPath(
                                    [
                                        [table.verticalLines[0], hLine],
                                        [arrLast(table.verticalLines) ?? 0, hLine],
                                    ],
                                    ratio
                                )}
                                stroke={table.color}
                                strokeWidth={table.strokeWidth}
                                strokeDasharray={dashArray}
                                fill="none"
                            />)
                        }

                        for (let i = 0; i < table.verticalLines.length; i++) {
                            const vLine = table.verticalLines[i];
                            lines.push(
                                <Path
                                    key={`${table.id}v${i}`}
                                    d={joinPath(
                                        [
                                            [vLine, horizontalLines[0] - table.strokeWidth / 2],
                                            [vLine, ((arrLast(horizontalLines) ?? 0) + table.strokeWidth / 2)],
                                        ],
                                        ratio
                                    )}
                                    stroke={table.color}
                                    strokeWidth={table.strokeWidth}
                                    strokeDasharray={dashArray}
                                    fill="none"
                                />
                            );
                        }

                        return lines;
                    })}
                </Svg>

                {/* Table Move/Resize Icons */}
                {currentElementType == ElementTypes.Table && tables?.map((table) => {
                    return < MoveIcon
                        key={`table-move-${table.id}`}
                        style={[styles.moveIcon, visibleAnimatedStyle]}
                        position={[table.verticalLines[0] * ratio - 30, table.horizontalLines[0] * ratio]}
                        size={30}
                        panResponderHandlers={moveResponder.panHandlers}
                        onSetContext={() => {
                            moveContext.current = { type: MoveTypes.TableMove, id: table.id, offsetX: 15, offsetY: -15 };
                        }}
                        icon="move"
                        color="black"
                    />
                })}
                {currentElementType == ElementTypes.Table && tables?.map((table) => {
                    const horizontalLines = calcEffectiveHorizontalLines(table, canvasHeightRef.current / ratioRef.current, texts)

                    return <MoveIcon
                        key={`table-resize-${table.id}`}
                        style={[styles.moveIcon, visibleAnimatedStyle]}
                        position={[
                            (arrLast(table.verticalLines) ?? 0) * ratio - 20,
                            (arrLast(horizontalLines) ?? 0) * ratio - 20,
                        ]}
                        size={40}
                        panResponderHandlers={moveResponder.panHandlers}
                        onSetContext={() => {
                            moveContext.current = { type: MoveTypes.TableResize, id: table.id, offsetX: -10, offsetY: -10 };
                        }}
                        icon="resize-bottom-right"
                        color="black"
                    />
                })}

                {selectionRect && <View pointerEvents="none" style={{
                    position: "absolute", zIndex: 2000,
                    left: selectionRect.x * ratio, top: selectionRect.y * ratio,
                    width: selectionRect.width * ratio, height: selectionRect.height * ratio,
                    borderWidth: 2, borderStyle: "dashed", borderColor: "#1E90FF",
                }} />}
                {selectionLasso && selectionLasso.length > 1 &&
                    <Svg height="100%" width="100%" style={{ position: "absolute", zIndex: 2000 }} pointerEvents="none">
                        <Path d={joinPath(selectionLasso, ratio) + " Z"} stroke="#1E90FF" strokeWidth={2}
                            strokeDasharray={[6, 4]} fill="rgba(30,144,255,0.08)" />
                    </Svg>}

                {/* Images */}
                {/* only the selected image has controls */}
                {images?.filter(image => image.id === currentEdited.imageId).map((image) => {
                    const imgW = (image.width)
                    const imgH = (image.height)
                    const w = (imgW * ratio);
                    const h = (imgH * ratio);
                    if (!imgW || imgW === 0) return null;
                    // every image is drawn in the sketch layer, as a piece; here: its controls only
                    return <React.Fragment key={image.id} >
                        {showImageControls(image) && (image.outline ?
                            <Animated.View pointerEvents="none" style={[styles.moveIcon, {
                                position: "absolute", left: image.x * ratio, top: image.y * ratio, width: w, height: h,
                            }, visibleAnimatedStyle]}>
                                <Svg width={w} height={h}>
                                    <Path d={joinPath(image.outline.map(([fx, fy]) => [fx * w, fy * h] as SketchPoint), 1) + " Z"}
                                        stroke="#1E90FF" strokeWidth={2} strokeDasharray={[6, 4]} fill="none" />
                                </Svg>
                            </Animated.View> :
                            <Animated.View pointerEvents="none" style={[styles.moveIcon, {
                                position: "absolute",
                                left: image.x * ratio - 2,
                                top: image.y * ratio - 2,
                                width: w + 4,
                                height: h + 4,
                                borderWidth: 2, borderStyle: "dashed", borderColor: "#1E90FF",
                            }, visibleAnimatedStyle]} />)}
                        {showImageControls(image) && <TouchableOpacity
                                style={{
                                    position: "absolute",
                                    zIndex: 30,
                                    left: image.x * ratio - 30,
                                    top: image.y * ratio,
                                }}
                                onPress={() => onDeleteElement?.(ElementTypes.Image, image.id)}
                            >
                                <MyIcon info={{ type: "Ionicons", name: "trash-outline", size: 30, color: "blue" }} />

                            </TouchableOpacity>}
                        {showImageControls(image) && currentElementType == ElementTypes.Cut && <TouchableOpacity
                                testID="piece-copy"
                                style={{
                                    position: "absolute",
                                    zIndex: 30,
                                    left: image.x * ratio - 30,
                                    top: image.y * ratio + 40,
                                }}
                                onPress={() => onCopyElement?.(image.id)}
                            >
                                <MyIcon info={{ type: "MDI", name: "content-copy", size: 30, color: "blue" }} />
                            </TouchableOpacity>}
                        {/* every piece can be resized: its paper and what is on it scale together */}
                        {showImageControls(image) && <MoveIcon
                                style={[styles.moveIcon, visibleAnimatedStyle]}
                                position={[
                                    (image.x + image.width) * ratio - 20,
                                    (image.y + image.height) * ratio - 20,
                                ]}
                                size={40}
                                panResponderHandlers={moveResponder.panHandlers}
                                onSetContext={() => {
                                    moveContext.current = { type: MoveTypes.ImageResize, id: image.id, offsetX: -30, offsetY: -30 };
                                }}
                                icon="resize-bottom-right"
                                color="black"
                            />}
                    </React.Fragment>
                }
                )}

                {/* General Elements */}
                {elements?.map(elem => {
                    return <View key={elem.id} style={[styles.elementStyle, { left: elem.x * ratio, top: elem.y * ratio }]}
                    onMoveShouldSetResponder={(e) => {
                            const { pageX, pageY } = e.nativeEvent;
                            if (!elemMoveStart.current) {
                                elemMoveStart.current = { x: pageX, y: pageY };
                                return false;
                            }
                            const dx = pageX - elemMoveStart.current.x;
                            const dy = pageY - elemMoveStart.current.y;
                            const threshold = 10;
                            if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
                                isMoving.current = true;
                                return true;
                            }
                            return false;
                        }}
                        onResponderMove={(e) => {
                            if (e.nativeEvent) {
                                const touchPoint = screen2Canvas(e.nativeEvent.pageX, e.nativeEvent.pageY) as SketchPoint
                                onMoveElement?.(MoveTypes.ElementMove, elem.id, touchPoint);
                            }
                        }}
                        onResponderRelease={() => {
                            isMoving.current = false;
                            elemMoveStart.current = null;
                            onMoveEnd?.(MoveTypes.ElementMove, elem.id)
                        }}
                        onResponderTerminate={() => {
                            isMoving.current = false;
                            elemMoveStart.current = null;
                        }}
                        onTouchEnd={() => {
                            elemMoveStart.current = null;
                        }}
                    >
                        {renderElements?.(elem)}
                        {elementsAttr?.(elem)?.showDelete && <AnimatedTouchableOpacity
                            style={[{
                                position: "absolute",
                                left: -20,
                                top: 0,
                            }, styles.moveIcon, visibleAnimatedStyle]}
                            onPress={() => onDeleteElement?.(ElementTypes.Element, elem.id)}
                        >
                            <MyIcon info={{ type: "Ionicons", name: "trash-outline", size: 22, color: "blue" }} />
                        </AnimatedTouchableOpacity>}
                    </View>
                })}
            </View>
        </Animated.View>
    );
}

export default forwardRef(Canvas);

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#f5f5f5",
        zIndex: 5
        //backgroundColor: "white",
    },
    elementStyle: {
        position: "absolute",
        zIndex: 15,
    },
    moveIcon: {
        zIndex: 2500,
    }
});
