import { PathCommand } from "@shopify/react-native-skia";
import { ImageURISource } from "react-native";
import type { TextSpan } from "./text-spans";


export type SketchPoint = [number, number]
export type Offset = {
    x: number;
    y: number;
}

export enum ElementTypes {
    Sketch = "sketch",
    Text = "text",
    Line = "line",
    Image = "image",
    Table = "table",
    Element = "element",
    Cut = "cut",
    Fill = "fill",
}

export interface ElementBase {
    id: string;
    editMode?: boolean;
    backup?: any;
    // Paper pieces: the cut piece this element belongs to (moves, copies and deletes with it).
    // null in a queue entry: moved off its piece, onto the page
    pieceId?: string | null;
    // drawing order: position in the page's queue when created (pieces: when last moved)
    z?: number;
}

export interface SketchPath extends ElementBase {
    points: PathCommand[];
    color: string;
    strokeWidth: number;
    isMarker: boolean;
}

export interface SketchLine extends ElementBase {
    from: SketchPoint;
    to: SketchPoint;
    color: string;
    strokeWidth: number;
}

export interface SketchText extends ElementBase {
    text: string;
    fontSize: number;
    color: string;
    rtl: boolean;
    alignment: string;
    fontFamily?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    // coordinates or table cell position
    tableId?: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    pendingPageHeightIncrease?: number;
    tempTop2CursorHeight?: number;
    // styled ranges overriding the text's own style (see text-spans)
    spans?: TextSpan[];
}

export interface SketchImage extends ElementBase {
    src?: ImageURISource;
    imageData?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    aspectRatio?: number;
    isCutPiece?: boolean;
    // an image in the drawing order (last touched on top); images saved before that are under all ink
    layered?: boolean;
    outline?: SketchPoint[]; // lasso cut pieces: outline as fractions (0..1) of width/height
    // cut pieces: areas cut out of this piece by later cuts, relative to its x/y
    holes?: SketchPoint[][];
    // cut pieces: position the piece's content was laid out at; while dragging, x/y run ahead of it
    originX?: number;
    originY?: number;
}

// Fills (paint) and cuts (holes in the paper) are drawn in the sketch (Skia) layer, ordered by z with the paths
export interface SketchOverlay extends ElementBase {
    kind: "fill" | "cut";
    x: number;
    y: number;
    width: number;
    height: number;
    imageData?: string; // base64 png (fill only)
    points?: SketchPoint[]; // lasso outline (cut only), otherwise the cut is the rect
    color?: string; // fill only
}

export interface SketchTable extends ElementBase {
    verticalLines: number[];
    horizontalLines: number[];
    color: string;
    strokeWidth: number;
    strokeDash?: [number, number];
}

export interface SketchElement extends ElementBase {
    x: number;
    y: number;
    type: string;
    /** Allow any additional string keys with any value. */
    [key: string]: any;
}

export interface SketchElementAttributes {
    showDelete: boolean;
}

export enum MoveTypes {
    Text = "text",
    LineStart = "line-start",
    LineEnd = "line-end",
    LineMove = "line=move",
    ImageMove = "image-move",
    ImageResize = "image-resize",
    TableResize = "table-resize",
    TableMove = "table-move",
    ElementMove = "elem-move",
}

export interface MoveContext {
    id: string;
    type: MoveTypes;
    offsetX: number;
    offsetY: number;
    lastPt?: SketchPoint;
}

export interface TableContext {
    elem: SketchTable;
    cell?: [number, number];
    hLine?: number;
    vLine?: number;
    initialPosition?: SketchPoint
}

export enum TablePart {
    VerticalLine = "vLine",
    HorizontalLine = "hLine",
    TableCell = "table-cell",
}

export interface CurrentEdited {
    lineId?: string;
    textId?: string;
    imageId?: string;
}
