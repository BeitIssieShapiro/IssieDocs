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
    ElementBase,
    ElementTypes,
    MoveContext,
    MoveTypes,
    Offset,
    SketchElement,
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
    isPointOnLineSegment,
    joinPath,
    tableRowHeight,
} from "./utils";
import { TextElement } from "./text-element"; // Example sub-component for text

const TEXT_SEARCH_MARGIN = 0; // 15;
const TABLE_LINE_THRESHOLD = 7;

interface CanvasProps {
    paths?: SketchPath[];
    lines?: SketchLine[];
    texts?: SketchText[];
    images?: SketchImage[];
    elements?: SketchElement[]; // generic elements
    tables?: SketchTable[];

    canvasWidth: number;
    canvasHeight: number;
    zoom: number;
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

    onDeleteElement,
    onTextYOverflow,
    paths,
    texts,
    lines,
    images,
    elements,
    tables,

    imageSource,
    canvasWidth,
    zoom,
    offset,
    minSideMargin,
    canvasHeight,
    currentElementType,
}: CanvasProps) {
    // Refs & State
    const isMoving = useRef(false);
    const canvasRef = useRef<View | null>(null);
    const viewOffset = useRef({ offsetX: 0, offsetY: 0 });
    const canvasOffset = useRef({ x: 0, y: 0 });
    const ratio = useRef(1);
    const zoomRef = useRef(1);
    const [imageSize, setImageSize] = useState<ImageSize | undefined>();
    const [sideMargin, setSideMargin] = useState<number>(minSideMargin);
    const normCanvasSize = useRef<ImageSize>({ width: canvasWidth, height: canvasHeight });


    const startSketchRef = useRef<{
        position: SketchPoint;
        elem?: ElementBase | TableContext;
        initialPosition?: SketchPoint;
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
        canvasOffset.current = offset;
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
                setImageSize({ width: size.width * calcRatio, height: size.height * calcRatio });
                setSideMargin((canvasWidth - size.width * calcRatio) / 2);
            });
        }
    }, [imageSource, canvasHeight, canvasWidth, minSideMargin, canvasWidth]);

    // PanResponder for sketching
    const sketchResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !isMoving.current,
            onMoveShouldSetPanResponder: () => !isMoving.current,
            onPanResponderGrant: (e, gState) => {
                const clickPoint = screen2Canvas(gState.x0, gState.y0);
                startSketchRef.current = { position: clickPoint };

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
                    if (
                        currentElementTypeRef.current === ElementTypes.Sketch ||
                        (!startSketchRef.current.elem && currentElementTypeRef.current === ElementTypes.Line)
                    ) {
                        // Begin new line or sketch
                        onSketchStart(startSketchRef.current.position);
                        startSketchRef.current = null;
                    } else {
                        // Move or resize an element
                        const { initialPosition, elem } = startSketchRef.current;
                        if (initialPosition && elem) {
                            const pos0 = initialPosition;
                            const dx = gState.dx / (zoomRef.current * ratio.current);
                            const dy = gState.dy / (zoomRef.current * ratio.current);
                            const pt: SketchPoint = [pos0[0] + dx, pos0[1] + dy];

                            if ("id" in elem) {
                                onMoveElement(
                                    currentElementTypeRef.current == ElementTypes.Line ? MoveTypes.LineMove : MoveTypes.ImageMove,
                                    elem.id,
                                    pt);
                            } else {
                                onMoveTablePart?.(pt, elem);
                            }
                        }
                        return; // Do not proceed to `onSketchStep` if moving an element
                    }
                }
                onSketchStep(newPoint);
            },
            onPanResponderRelease: (_, gState) => {
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
            (x - viewOffset.current.offsetX) / (zoomRef.current * ratio.current) - canvasOffset.current.x,
            (y - viewOffset.current.offsetY) / (zoomRef.current * ratio.current) - canvasOffset.current.y,
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
        // Generic bounding-box detection
        const inBox = (t: any) =>
            t.x - TEXT_SEARCH_MARGIN < cx &&
            t.width &&
            t.x + t.width + TEXT_SEARCH_MARGIN > cx &&
            t.y - TEXT_SEARCH_MARGIN < cy &&
            t.height &&
            t.y + t.height + TEXT_SEARCH_MARGIN > cy;

        if (currentElementTypeRef.current === ElementTypes.Text) {
            return textsRef.current?.find(inBox);
        }
        if (currentElementTypeRef.current === ElementTypes.Image) {
            return imagesRef.current?.find(inBox);
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
                        { translateX: canvasOffset.current.x * ratio.current },
                        { translateY: canvasOffset.current.y * ratio.current },
                    ],
                },
            ]}
            onLayout={() => {
                setTimeout(() =>
                    canvasRef.current?.measureInWindow((absX, absY) => {
                        console.log("Canvas Layout", absX, absY)
                        viewOffset.current = { offsetX: absX, offsetY: absY };
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
            {lines
                ?.filter((l) => l.editMode)
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
                                color="blue"
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
                                color="blue"
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

            {/* Paths & Lines (Non-edit) */}
            <Svg height="100%" width="100%" style={{ position: "absolute" }}>
                {paths?.map((path) => (
                    <Path
                        key={path.id}
                        d={joinPath(path.points, ratio.current)}
                        stroke={"red"}
                        strokeWidth={path.strokeWidth}
                        fill="none"
                    />
                ))}
                {lines?.map((line) => (
                    <Path
                        key={line.id}
                        d={joinPath([line.from, line.to], ratio.current)}
                        stroke={line.color}
                        strokeWidth={line.strokeWidth}
                        fill="none"
                    />
                ))}
                {/* Tables */}
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
                                        [vLine, horizontalLines[0]],
                                        [vLine, (arrLast(horizontalLines) ?? 0)],
                                    ],
                                    ratio.current
                                )}
                                stroke={table.color}
                                strokeWidth={table.strokeWidth}
                                fill="none"
                            />
                        );
                    }

                    return lines;
                })}
            </Svg>

            {/* Table Move/Resize Icons */}
            {tables?.map((table) => (
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
            {tables?.map((table) => (
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
                        moveContext.current = { type: MoveTypes.TableResize, id: table.id, offsetX: -30, offsetY: -30 };
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
                        source={image.src}
                    />
                    <TouchableOpacity
                        style={{
                            position: "absolute",
                            zIndex: 1000,
                            left: image.x * ratio.current - 30,
                            top: image.y * ratio.current,
                        }}
                        onPress={() => onDeleteElement?.(ElementTypes.Image, image.id)}
                    >
                        <IconIonic name="trash-outline" size={30} color={"blue"} />
                    </TouchableOpacity>
                    <MoveIcon
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
                    />
                </React.Fragment>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#f5f5f5",
        borderColor: "blue",
        borderWidth: 1,
    },
    imageStyle: {
        position: "absolute",
        zIndex: 10,
    },
});