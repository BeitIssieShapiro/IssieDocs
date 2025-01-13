import { PathCommand } from "@shopify/react-native-skia";
import { ImageURISource } from "react-native";


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
}

export interface ElementBase {
    id: string;
    editMode?: boolean;
    backup?: any;
}

export interface SketchPath extends ElementBase {
    points: PathCommand[];
    color: string;
    strokeWidth: number;
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
    // coordinates or table cell position
    tableId?: string;
    x: number;
    y: number;
    width?: number;
    height?: number;

}

export interface SketchImage extends ElementBase {
    src?: ImageURISource;
    imageData?:string;
    x: number;
    y: number;
    width: number;
    height: number
}

export interface SketchTable extends ElementBase {
    verticalLines: number[];
    horizontalLines: number[];
    color: string;
    strokeWidth: number;
    strokeDash?: [];
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
    lastPt?:SketchPoint;
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
