import React, { useEffect, useRef, useState } from "react";
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
import IconIonic from "react-native-vector-icons/Ionicons";

import {
    Canvas as SkiaCanvas,
    Path as SkiaPath,
    PaintStyle,
    BlendMode,
    useCanvasRef,
    useValue,
    useTouchHandler
} from "@shopify/react-native-skia";
import { Skia, Path as SkPath } from "@shopify/react-native-skia";

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
import { MoveIcon } from "./canvas-elements";
import {
    arrLast,
    calcEffectiveHorizontalLines,
    calculateLineAngle,
    calculateLineTrashPoint,
    inBox,
    isPointOnLineSegment,
    joinPath,
    normalizeFoAndroid,
} from "./utils";
import { TextElement } from "./text-element"; // Example sub-component for text
import { PinchHelperEvent, PinchSession, ResizeEvent } from "./pinch";

const TEXT_SEARCH_MARGIN = 0; // 15;
const TABLE_LINE_THRESHOLD = 7;

function createSkiaPath(points: [number, number][], ratio: number): any {
    const skPath = Skia.Path.Make();
    if (points.length === 0) return skPath;

    // Move to first point
    const [x0, y0] = points[0];
    skPath.moveTo(x0 * ratio, y0 * ratio);

    // Draw lines to subsequent points
    for (let i = 1; i < points.length; i++) {
        const [x, y] = points[i];
        skPath.lineTo(x * ratio, y * ratio);
    }
    return skPath;
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

    onActualCanvasSize?: (actualSize: ImageSize, actualSideMargin: number, viewOffset: Offset, ratio: number) => void,

    zoom: number;
    onZoom: (newZoom: number) => void
    onMoveCanvas: (newPos: Offset) => void


    offset: Offset;
    minSideMargin: number;
    style: any;
    onSketchStart: (p: SketchPoint) => void;
    onSketchStep: (p: SketchPoint) => void;
    onSketchEnd: () => void;
    onTextChanged: (id: string, newText: string) => void;
    onCanvasClick: (p: SketchPoint, elem: ElementBase | TableContext | undefined) => void;
    onMoveElement: (type: MoveTypes, id: string, p: SketchPoint) => void;
    onMoveEnd: (type: MoveTypes, id: string) => void;

    onMoveTablePart?: (p: SketchPoint, tableContext: TableContext) => void;
    onMoveTablePartEnd?: (tableContext: TableContext) => void;
    onDeleteElement: (type: ElementTypes, id: string) => void;
    onTextYOverflow?: (elemId: string) => void;
    imageSource?: ImageURISource;
    currentElementType: ElementTypes;
}

export function Canvas({
    style,
    onTextChanged,
    onCanvasClick,

    onSketchStart,
    onSketchStep,
    onSketchEnd,

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
    zoom,
    offset,
    minSideMargin,
    canvasWidth,
    canvasHeight,
    onActualCanvasSize,
    currentElementType,
}: CanvasProps) {
    // Refs & State
    const isMoving = useRef(false);
    const canvasRef = useRef<View | null>(null);
    const viewOffset = useRef<Offset>({ x: 0, y: 0 });
    const offsetRef = useRef(offset);
    const ratio = useRef(1);
    const zoomRef = useRef(1);
    const [imageSize, setImageSize] = useState<ImageSize | undefined>();
    const [sideMargin, setSideMargin] = useState<number>(minSideMargin);
    const normCanvasSize = useRef<ImageSize>({ width: canvasWidth, height: canvasHeight });


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
    // Effects
    useEffect(() => {
        textsRef.current = texts || [];
        imagesRef.current = images || [];
        tablesRef.current = tables || [];
        linesRef.current = lines || [];
    }, [texts, images, tables, lines]);

    useEffect(() => {
        zoomRef.current = zoom;
    }, [zoom]);

    useEffect(() => {
        offsetRef.current = offset;
    }, [offset]);

    useEffect(() => {
        currentElementTypeRef.current = currentElementType;
    }, [currentElementType]);

    useEffect(() => {
        if (imageSource?.uri) {
            Image.getSize(imageSource.uri).then((size) => {
                const ratioX = (canvasWidth - minSideMargin * 2) / size.width;
                const ratioY = canvasHeight / size.height;
                let calcRatio = Math.min(ratioX, ratioY);
                calcRatio = Math.floor((calcRatio + Number.EPSILON) * 100) / 100;

                ratio.current = calcRatio;
                const actualSize = { width: size.width * calcRatio, height: size.height * calcRatio };
                const actualSideMargin = (canvasWidth - size.width * calcRatio) / 2;
                setImageSize(actualSize);
                onActualCanvasSize?.(actualSize, actualSideMargin, viewOffset.current, ratio.current);
                setSideMargin(actualSideMargin);
            });
        }
    }, [imageSource, canvasHeight, canvasWidth, minSideMargin]);

    // PanResponder for sketching
    const sketchResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !isMoving.current,
            onMoveShouldSetPanResponder: () => !isMoving.current,
            onPanResponderGrant: (e, gState) => {
                const clickPoint = screen2Canvas(gState.x0, gState.y0);
                startSketchRef.current = { position: clickPoint, initialOffset: offsetRef.current };

                if (
                    currentElementTypeRef.current !== ElementTypes.Sketch
                ) {

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

                    if (currentElementTypeRef.current === ElementTypes.Table ||
                        currentElementTypeRef.current === ElementTypes.Text) {
                        const tableContext = searchTable(...clickPoint);
                        if (tableContext) {
                            startSketchRef.current = { ...startSketchRef.current, initialPosition: tableContext.initialPosition, elem: tableContext };
                        }
                    }
                }
            },
            onPanResponderMove: (e, gState) => {
                const newPoint = screen2Canvas(gState.moveX, gState.moveY);

                if (startSketchRef.current) {
                    // Zoom and Move
                    if (gState.numberActiveTouches == 2) {

                        const touches = e.nativeEvent.touches
                        const p1 = [touches[0].pageX, touches[0].pageY] as SketchPoint
                        const p2 = [touches[1].pageX, touches[1].pageY] as SketchPoint


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


                    if (
                        currentElementTypeRef.current === ElementTypes.Sketch ||
                        (!startSketchRef.current.elem && currentElementTypeRef.current === ElementTypes.Line)
                    ) {
                        // Begin new line or sketch
                        onSketchStart(startSketchRef.current.position);
                        startSketchRef.current = null;
                    } else {
                        // Move or resize an element
                        const dx = gState.dx / (zoomRef.current * ratio.current);
                        const dy = gState.dy / (zoomRef.current * ratio.current);

                        const { initialPosition, elem, initialOffset } = startSketchRef.current;
                        if (initialPosition && elem) {
                            const pt: SketchPoint = [initialPosition[0] + dx, initialPosition[1] + dy];
                            if ("id" in elem) {
                                onMoveElement(
                                    currentElementTypeRef.current == ElementTypes.Line ? MoveTypes.LineMove : MoveTypes.ImageMove,
                                    elem.id,
                                    pt);
                            } else {
                                onMoveTablePart?.(pt, elem);
                            }
                        } else if (initialOffset) {
                            console.log("move canvas", initialOffset, dx, dy)
                            onMoveCanvas({ x: initialOffset.x + dx, y: initialOffset.y + dy });
                        }
                        return; // Do not proceed to `onSketchStep` if moving an element
                    }
                }

                onSketchStep(newPoint);
            },
            onPanResponderRelease: (_, gState) => {
                if (startSketchRef.current?.pinch) {
                    startSketchRef.current = null;
                    return;
                }
                if (gState.dx === 0 && gState.dy === 0) {
                    // Possibly a tap/click
                    if (startSketchRef.current) {
                        onCanvasClick(startSketchRef.current.position, startSketchRef.current?.elem);
                    }
                    startSketchRef.current = null;
                    return;
                }
                const elem = startSketchRef.current?.elem;

                if (currentElementTypeRef.current === ElementTypes.Sketch ||
                    (!elem && currentElementTypeRef.current === ElementTypes.Line)) {
                    onSketchEnd();
                } else if (elem) {
                    if ("id" in elem) {
                        onMoveEnd(
                            currentElementTypeRef.current == ElementTypes.Line ? MoveTypes.LineMove : MoveTypes.ImageMove,
                            (elem as ElementBase).id);
                    } else {
                        onMoveTablePartEnd?.(elem);
                    }
                }
                startSketchRef.current = null;
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
                    const canvasPos0 = screen2Canvas(gState.x0 + gState.dx + moveContext.current.offsetX, gState.y0 + gState.dy + moveContext.current.offsetY);
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
    function screen2Canvas(x: number, y: number): SketchPoint {
        return [
            (x - viewOffset.current.x) / (zoomRef.current * ratio.current) - offsetRef.current.x,
            (y - viewOffset.current.y) / (zoomRef.current * ratio.current) - offsetRef.current.y,
        ];
    }

    function searchTable(cx: number, cy: number): TableContext | undefined {
        for (const table of tablesRef.current) {

            // 0. calculate effective hlines
            const horizontalLines = calcEffectiveHorizontalLines(table, textsRef.current);


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
            for (let h = 1; h < horizontalLines.length - 1; h++) {
                if (Math.abs(horizontalLines[h] - cy) < TABLE_LINE_THRESHOLD) {
                    return {
                        elem: table,
                        hLine: h,
                        initialPosition: [horizontalLines[h], horizontalLines[h]]
                    };
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
    }

    function searchElement(cx: number, cy: number) {
        if (currentElementTypeRef.current === ElementTypes.Text) {
            return textsRef.current?.find(t => inBox(t, cx, cy, TEXT_SEARCH_MARGIN));
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
    }

    function handleTextLayout(e: LayoutChangeEvent, text: SketchText) {
        const { width, height } = e.nativeEvent.layout;
        text.width = width / ratio.current;
        let table: SketchTable | undefined = undefined;
        let tableEndY = 0

        if (text.tableId) {
            table = tablesRef.current?.find(table => table.id == text.tableId)
            if (table) {
                tableEndY = arrLast(calcEffectiveHorizontalLines(table, textsRef.current)) ?? 0;
            }
        }


        const prevHeight = text.height || 0;
        text.height = height / ratio.current;
        if (!text.tableId && text.y + text.height > normCanvasSize.current.height &&
            text.y + prevHeight <= normCanvasSize.current.height) {
            // change in height passed end of page
            onTextYOverflow?.(text.id);
        } else if (table) {
            const tableEndYAfter = arrLast(calcEffectiveHorizontalLines(table, textsRef.current)) ?? 0;

            if (tableEndYAfter > normCanvasSize.current.height && tableEndY <= normCanvasSize.current.height) {
                onTextYOverflow?.(text.id);
            }
        }
    }

    const actualWidth = imageSize?.width || canvasWidth;
    const actualHeight = imageSize?.height || canvasHeight;

    normCanvasSize.current = { width: actualWidth / ratio.current, height: actualHeight / ratio.current };
    imageSource = normalizeFoAndroid(imageSource)
    console.log("canvas render", imageSource)
    return (
        <View
            ref={canvasRef}
            style={[
                styles.container,
                style,
                {
                    marginLeft: sideMargin,
                    width: actualWidth,
                    height: actualHeight,
                    transformOrigin: "0 0 0",
                    transform: [
                        { scale: zoomRef.current },
                        { translateX: offsetRef.current.x * ratio.current },
                        { translateY: offsetRef.current.y * ratio.current },
                    ],
                },
            ]}
            onLayout={() => {
                setTimeout(() =>
                    canvasRef.current?.measureInWindow((absX, absY) => {
                        console.log("Canvas Layout", absX, absY)
                        viewOffset.current = { x: absX, y: absY };
                    }), 500);
            }}
            {...sketchResponder.panHandlers}
        >
            {/* Background Image */}
            {imageSize && (
                <Image
                    source={imageSource}
                    style={{
                        position: "absolute",
                        width: imageSize.width,
                        height: imageSize.height,
                    }}
                />
            )}

            {/* Text Elements */}
            {texts?.map((text) => (
                <TextElement
                    key={text.id}
                    text={text}
                    editMode={(currentElementTypeRef.current == ElementTypes.Text || currentElementTypeRef.current == ElementTypes.Table)
                        && text.id == currentEdited.textId}
                    texts={texts}
                    tables={tables}
                    actualWidth={actualWidth}
                    ratio={ratio}
                    moveResponder={moveResponder}
                    moveContext={moveContext}
                    onTextChanged={onTextChanged}
                    handleTextLayout={handleTextLayout}
                />
            ))}

            {/* Lines in edit mode */}
            {currentElementTypeRef.current == ElementTypes.Line && currentEdited.lineId &&
                lines?.filter(line => line.id == currentEdited.lineId)
                    .map((line) => {
                        const angle = calculateLineAngle(line.from, line.to);
                        const trashPos = calculateLineTrashPoint(line.from, line.to, (angle + 90) % 360, 8);

                        const transform = { transform: [{ rotate: `${angle}deg` }] };
                        return (
                            <View key={line.id}>
                                <MoveIcon
                                    style={transform}
                                    position={[line.from[0] * ratio.current - 8, line.from[1] * ratio.current - 8]}
                                    size={16}
                                    panResponderHandlers={moveResponder.panHandlers}
                                    onSetContext={() => {
                                        moveContext.current = { type: MoveTypes.LineStart, id: line.id, offsetX: 0, offsetY: 0 };
                                    }}
                                    icon="square"
                                    color={line.color}
                                />

                                <MoveIcon
                                    style={transform}
                                    position={[line.to[0] * ratio.current - 8, line.to[1] * ratio.current - 8]}
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
                                    style={{
                                        position: "absolute",
                                        zIndex: 1000,
                                        left: trashPos[0] * ratio.current - 11,
                                        top: trashPos[1] * ratio.current - 11,
                                    }}
                                    onPress={() => onDeleteElement?.(ElementTypes.Line, line.id)}
                                >
                                    <IconIonic name="trash-outline" size={22} color={"blue"} />
                                </TouchableOpacity>
                            </View>
                        );
                    })}

            <SkiaCanvas
                style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%"
                }}
            >
                {/* Re-draw each path in the order they appear */}
                {paths?.map((p) => {
                    const skPath = createSkiaPath(p.points, ratio.current);
                    const isEraser = (p.color === "#00000000");

                    // For erasers, the color doesn't matter. Use "black" or any color you like.
                    const strokeColor = isEraser ? "black" : p.color;

                    return (
                        <SkiaPath
                            key={p.id}
                            path={skPath}
                            color={strokeColor}
                            style={"stroke"}
                            strokeWidth={p.strokeWidth}
                            blendMode={isEraser ? "dstOut" : "srcOver"}
                        />
                    );
                })}

            </SkiaCanvas>

            {/* Paths & Lines (Non-edit) */}

            <Svg height="100%" width="100%" style={{ position: "absolute" }}>
               
                {lines?.map((line) => (
                    <Path
                        key={line.id}
                        d={joinPath([line.from, line.to], ratio.current)}
                        stroke={line.color}
                        strokeWidth={line.strokeWidth}
                        fill="none"
                    />
                ))}
                {// Tables 
                }
                {tables?.map((table) => {
                    const horizontalLines = calcEffectiveHorizontalLines(table, textsRef.current);

                    const lines = [];

                    for (let i = 0; i < horizontalLines.length; i++) {
                        const hLine = horizontalLines[i];
                        lines.push(<Path
                            key={`${table.id}h${i}`}
                            d={joinPath(
                                [
                                    [table.verticalLines[0], hLine],
                                    [arrLast(table.verticalLines) ?? 0, hLine],
                                ],
                                ratio.current
                            )}
                            stroke={table.color}
                            strokeWidth={table.strokeWidth}
                            strokeDasharray={table.strokeDash}
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
                                    ratio.current
                                )}
                                stroke={table.color}
                                strokeWidth={table.strokeWidth}
                                strokeDasharray={table.strokeDash}
                                fill="none"
                            />
                        );
                    }

                    return lines;
                })}
            </Svg>

            {/* Table Move/Resize Icons */}
            {currentElementType == ElementTypes.Table && tables?.map((table) => (
                <MoveIcon
                    key={`table-move-${table.id}`}
                    style={{}}
                    position={[table.verticalLines[0] * ratio.current - 30, table.horizontalLines[0] * ratio.current]}
                    size={30}
                    panResponderHandlers={moveResponder.panHandlers}
                    onSetContext={() => {
                        moveContext.current = { type: MoveTypes.TableMove, id: table.id, offsetX: 30, offsetY: 0 };
                    }}
                    icon="move"
                    color="black"
                />
            ))}
            {currentElementType == ElementTypes.Table && tables?.map((table) => (
                <MoveIcon
                    key={`table-resize-${table.id}`}
                    style={{}}
                    position={[
                        (arrLast(table.verticalLines) ?? 0) * ratio.current - 20,
                        (arrLast(table.horizontalLines) ?? 0) * ratio.current - 20,
                    ]}
                    size={40}
                    panResponderHandlers={moveResponder.panHandlers}
                    onSetContext={() => {
                        moveContext.current = { type: MoveTypes.TableResize, id: table.id, offsetX: -10, offsetY: -10 };
                    }}
                    icon="resize-bottom-right"
                    color="black"
                />
            ))}

            {/* Images */}
            {images?.map((image) => (
                <React.Fragment key={image.id}>
                    <Image
                        style={[
                            styles.imageStyle,
                            {
                                left: image.x * ratio.current,
                                top: image.y * ratio.current,
                                width: image.width * ratio.current,
                                height: image.height * ratio.current,
                            },
                        ]}
                        source={normalizeFoAndroid(image.src) || { uri: image.imageData }}
                    />
                    {currentElementTypeRef.current == ElementTypes.Image &&
                        currentEdited.imageId == image.id && <TouchableOpacity
                            style={{
                                position: "absolute",
                                zIndex: 1000,
                                left: image.x * ratio.current - 30,
                                top: image.y * ratio.current,
                            }}
                            onPress={() => onDeleteElement?.(ElementTypes.Image, image.id)}
                        >
                            <IconIonic name="trash-outline" size={30} color={"blue"} />
                        </TouchableOpacity>}
                    {currentElementTypeRef.current == ElementTypes.Image &&
                        currentEdited.imageId == image.id && <MoveIcon
                            style={{}}
                            position={[
                                (image.x + image.width) * ratio.current - 20,
                                (image.y + image.height) * ratio.current - 20,
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
                return <View key={elem.id} style={{ position: "absolute", left: elem.x * ratio.current, top: elem.y * ratio.current }}
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
                        const touchPoint = screen2Canvas(e.nativeEvent.pageX, e.nativeEvent.pageY) as SketchPoint
                        onMoveElement?.(MoveTypes.ElementMove, elem.id, touchPoint);
                    }}
                    onResponderRelease={(e) => {
                        isMoving.current = false;
                        onMoveEnd?.(MoveTypes.ElementMove, elem.id)
                    }}
                >
                    {renderElements?.(elem)}
                    {elementsAttr?.(elem)?.showDelete && <TouchableOpacity
                        style={{
                            position: "absolute",
                            zIndex: 1000,
                            left: -20,
                            top: 0,
                        }}
                        onPress={() => onDeleteElement?.(ElementTypes.Element, elem.id)}
                    >
                        <IconIonic name="trash-outline" size={22} color={"blue"} />
                    </TouchableOpacity>}
                </View>
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#f5f5f5",
        //backgroundColor: "white",
    },
    imageStyle: {
        position: "absolute",
        zIndex: 10,
    },
});