import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
    Image,
    ImageSize,
    ImageURISource,
    LayoutChangeEvent,
    PanResponder,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import {
    Canvas as SkiaCanvas,
    Path as SkiaPath,
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
    IIF
} from "./utils";
import TextElement from "./text-element"; // Example sub-component for text
import { PinchHelperEvent, PinchSession } from "./pinch";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { dimensions } from "../elements";
import { captureRef } from "react-native-view-shot";
import { MyIcon } from "../common/icons";
import { trace } from "../log";
import { FileSystem } from "../filesystem";

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
    onTextYOverflow?: (elemId: string) => void;
    imageSource?: ImageURISource;
    background: number | undefined;
    originalBgImageHeight?: number;
    currentElementType: ElementTypes;

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
    onTextYOverflow,
    paths,
    texts,
    lines,
    images,
    elements,
    tables,
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

}: CanvasProps, ref: any) {
    // Refs & State
    const isMoving = useRef(false);
    const isDragMoving = useRef(false);
    const canvasRef = useRef<View | null>(null);
    //const viewOffset = useRef<Offset>({ x: 0, y: 0 });
    const canvasTopRef = useRef(canvasTop);
    const offsetRef = useRef(offset);
    const translateX = useSharedValue(offset.x);
    const translateY = useSharedValue(offset.y);

    const ratioRef = useRef(ratio);
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

    const viewShotRef = useRef(null);

    // Effects
    useEffect(() => {
        textsRef.current = texts || [];
        imagesRef.current = images || [];
        tablesRef.current = tables || [];
        linesRef.current = lines || [];
    }, [texts, images, tables, lines]);

    useEffect(() => {
        // verify the last path is the same as lastPathSV
        if (lastPathSV.value && paths && paths.length > 0) {
            const cmds = toCmds(lastPathSV.value, ratioRef.current);
            const lastPath = paths[paths.length - 1];
            //console.log("xx", cmds[0],  lastPath.points[0])
            if (cmds.length > 0 && cmds[0][1] == lastPath.points[0][1] &&
                cmds[0][2] == lastPath.points[0][2]) {
                lastPathSV.value.reset();
            }
        }
    }, [paths]);

    useEffect(() => {
        zoomRef.current = zoom;
        ratioRef.current = ratio;
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
            return new Promise(resolve => {
                setTimeout(() =>
                    captureRef(viewShotRef, { format: "jpg", quality: 0.6, height: dimensions.tileHeight, width: dimensions.tileWidth })
                        .then((uri) => resolve(uri))
                        .finally(() => {
                            setTimeout(() => moveIconDisplay.value = "flex");
                        }), 100);

            })
        },
        toExport: () => {
            moveIconDisplay.value = "none";
            editTextRef.current?.prepareForThumbnail();
            return new Promise((resolve, reject) => {
                setTimeout(() =>
                    captureRef(viewShotRef, { format: "jpg", quality: 0.9, result: "base64" })
                        .then((uri) => resolve(uri))
                        .catch((e) => reject(e))
                        .finally(() => {
                            setTimeout(() => moveIconDisplay.value = "flex");
                        }), 100)
            })
        },
        //getViewOffset: () => viewOffset.current,
    }));


    // PanResponder for sketching
    const sketchResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !isMoving.current,
            onMoveShouldSetPanResponder: () => !isMoving.current,
            onPanResponderGrant: (e, gState) => {
                const clickPoint = screen2Canvas(gState.x0, gState.y0);
                startSketchRef.current = { position: clickPoint, initialOffset: offsetRef.current };

                if (currentElementTypeRef.current !== ElementTypes.Sketch) {
                    const elem = searchElement(...clickPoint);
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
                                    parseFloat((startSketchRef.current.position[0] * ratioRef.current).toFixed(1)),
                                    parseFloat((startSketchRef.current.position[1] * ratioRef.current).toFixed(1))
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
                                    parseFloat((startSketchRef.current.position[0] * ratioRef.current).toFixed(1)),
                                    parseFloat((startSketchRef.current.position[1] * ratioRef.current).toFixed(1))
                                )
                            }

                            sketchInProgressRef.current = true;

                        } else if (currentElementTypeRef.current === ElementTypes.Line) {
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
                                if (moveContext.current == null) {
                                    moveContext.current = { type: MoveTypes.ImageMove, id: elem.id, offsetX: 0, offsetY: 0 };
                                }
                                moveContext.current.lastPt = pt;
                                onMoveElement(
                                    currentElementTypeRef.current == ElementTypes.Line ? MoveTypes.LineMove : MoveTypes.ImageMove,
                                    elem.id,
                                    pt);
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
                        return p.lineTo(newPoint[0] * ratioRef.current, newPoint[1] * ratioRef.current) as any;
                    })
                } else if (currentElementTypeRef.current === ElementTypes.Line) {
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
                        onCanvasClick(startSketchRef.current.position, startSketchRef.current?.elem);
                    }
                    startSketchRef.current = null;
                    return;
                }
                const elem = startSketchRef.current?.elem;

                if (!elem && currentElementTypeRef.current === ElementTypes.Sketch) {
                    const commands = toCmds(lastPathSV.value, ratioRef.current);
                    sketchInProgressRef.current = false;
                    sketchTimerRef.current = setTimeout(() => {
                        //console.log("sketch timeout")
                        sketchTimerRef.current = undefined;
                        if (!sketchInProgressRef.current) {
                            //console.log("call sketch end")
                            sketchPathInSaveProgressRef.current = true;
                            onSketchEnd(commands);
                        }
                    }, 300);
                } else if (!elem && currentElementTypeRef.current === ElementTypes.Line) {
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
    const moveResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => {
                isMoving.current = true;
                return true;
            },
            onPanResponderMove: (e, gState) => {
                if (moveContext.current) {
                    // +15 / -15 offset for text handle, etc. Adjust as needed for images
                    const canvasPos0 = screen2Canvas(gState.x0 + gState.dx + moveContext.current.offsetX * zoomRef.current, gState.y0 + gState.dy + moveContext.current.offsetY * zoomRef.current);
                    moveContext.current.lastPt = canvasPos0;
                    onMoveElement?.(moveContext.current.type, moveContext.current.id, canvasPos0);
                }
            },
            onPanResponderRelease: () => {
                isMoving.current = false;
                if (moveContext.current) {
                    onMoveEnd?.(moveContext.current.type, moveContext.current.id);
                }
            },
        })
    ).current;

    // Convert screen coordinates to canvas coordinates
    const screen2Canvas = useCallback((x: number, y: number): SketchPoint => {
        return [
            (x - sideMarginRef.current) / (zoomRef.current * ratioRef.current) - offsetRef.current.x,
            (y - canvasTopRef.current) / (zoomRef.current * ratioRef.current) - offsetRef.current.y,
        ];
    }, []);

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
        if (currentElementTypeRef.current === ElementTypes.Image) {
            return imagesRef.current?.find(t => inBox(t, cx, cy, TEXT_SEARCH_MARGIN));
        }
        if (currentElementTypeRef.current === ElementTypes.Line) {
            const THRESHOLD = 10; // how close to the line is acceptable?

            return linesRef.current?.find((line) =>
                isPointOnLineSegment(line.from, line.to, cx, cy, THRESHOLD)
            );
        }
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

            if (tableEndYAfter > normHeight && tableEndY <= normHeight) {
                onTextYOverflow?.(text.id);
            }
        }
    }, []);

    imageSource = normalizeFoAndroid(imageSource)
    //console.log("canvas render", ratio, canvasWidth)
    const isEraser = (color: string) => color === "#00000000";

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

                {(background == FileSystem.StaticPages.Lines || background == FileSystem.StaticPages.Math) && <Lines
                    height={canvasHeight}
                />}
                {background == FileSystem.StaticPages.Math && <VLines
                    width={canvasWidth}
                />}

                <SkiaCanvas
                    ref={skiaCanvasRef}
                    style={{
                        //backgroundColor:"green",
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        zIndex: 8,
                    }}
                >
                    {/* Re-draw each path in the order they appear */}
                    {paths?.map((p) => {
                        //console.log("createSkiaPath", ratioRef.current, actualWidth, actualHeight)
                        const skPath = createSkiaPath(p.points, ratio);

                        return (
                            <SkiaPath
                                key={p.id}
                                path={skPath}
                                color={isEraser(p.color) ? "black" : p.color}
                                style={"stroke"}
                                strokeWidth={p.strokeWidth}
                                blendMode={isEraser(p.color) ? "dstOut" : "srcOver"}
                            />
                        );
                    })}

                    <SkiaPath
                        path={lastPathSV}
                        color={isEraser(sketchColor) ? "black" : sketchColor}
                        style={"stroke"}
                        strokeWidth={sketchStrokeWidth}
                        blendMode={isEraser(sketchColor) ? "dstOut" : "srcOver"}
                    />

                </SkiaCanvas>

                {/* Text Elements */}
                {texts?.map((text) => {
                    const editMode = (currentElementTypeRef.current == ElementTypes.Text || currentElementTypeRef.current == ElementTypes.Table)
                        && text.id == currentEdited.textId
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
                        canvasHeight={canvasHeight / ratio}
                    />
                })}

                {/* Lines in edit mode */}
                {currentElementTypeRef.current == ElementTypes.Line && currentEdited.lineId &&
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

                                    <TouchableOpacity
                                        key={`${line.id}-trash`}
                                        style={[{
                                            position: "absolute",

                                            left: trashPos[0] * ratio - 11,
                                            top: trashPos[1] * ratio - 11,
                                        }, styles.moveIcon, visibleAnimatedStyle]}
                                        onPress={() => onDeleteElement?.(ElementTypes.Line, line.id)}
                                    >
                                        <MyIcon info={{ type: "Ionicons", name: "trash-outline", size: 22, color: "blue" }} />
                                    </TouchableOpacity>
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
                        const horizontalLines = calcEffectiveHorizontalLines(table, canvasHeightRef.current / ratioRef.current, textsRef.current);

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

                {/* Images */}
                {images?.map((image) => (
                    <React.Fragment key={image.id}>
                        <Image
                            style={[
                                styles.imageStyle,
                                {
                                    left: image.x * ratio,
                                    top: image.y * ratio,
                                    width: Math.round(image.width * ratio),
                                    height: Math.round(image.height * ratio),
                                },
                            ]}
                            source={normalizeFoAndroid(image.src) || { uri: image.imageData }}
                        />
                        {currentElementTypeRef.current == ElementTypes.Image &&
                            currentEdited.imageId == image.id && <TouchableOpacity
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
                        {currentElementTypeRef.current == ElementTypes.Image &&
                            currentEdited.imageId == image.id && <MoveIcon
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
                ))}

                {/* General Elements */}
                {elements?.map(elem => {
                    return <View key={elem.id} style={[styles.elementStyle, { left: elem.x * ratio, top: elem.y * ratio }]}
                        onMoveShouldSetResponder={(e) => {
                            const touchPoint = screen2Canvas(e.nativeEvent.locationX, e.nativeEvent.locationY);
                            const threshold = 5; // Minimum movement in pixels to activate drag
                            const ret = Math.abs(touchPoint[0] - elem.x) > threshold || Math.abs(touchPoint[1] - elem.y) > threshold;
                            if (ret) {
                                isMoving.current = true;
                            }
                            return ret;
                        }}
                        onResponderMove={(e) => {
                            if (e.nativeEvent) {
                                const touchPoint = screen2Canvas(e.nativeEvent.pageX, e.nativeEvent.pageY) as SketchPoint
                                onMoveElement?.(MoveTypes.ElementMove, elem.id, touchPoint);
                            }
                        }}
                        onResponderRelease={(e) => {
                            isMoving.current = false;
                            onMoveEnd?.(MoveTypes.ElementMove, elem.id)
                        }}
                    >
                        {renderElements?.(elem)}
                        {elementsAttr?.(elem)?.showDelete && <TouchableOpacity
                            style={[{
                                position: "absolute",
                                left: -20,
                                top: 0,
                            }, styles.moveIcon, visibleAnimatedStyle]}
                            onPress={() => onDeleteElement?.(ElementTypes.Element, elem.id)}
                        >
                            <MyIcon info={{ type: "Ionicons", name: "trash-outline", size: 22, color: "blue" }} />
                        </TouchableOpacity>}
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
    imageStyle: {
        position: "absolute",
        zIndex: 2,
    },
    elementStyle: {
        position: "absolute",
        zIndex: 15,
    },
    moveIcon: {
        zIndex: 2500,
    }
});
