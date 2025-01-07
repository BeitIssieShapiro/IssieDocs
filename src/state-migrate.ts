
import { SketchElement, SketchImage, SketchLine, SketchPath, SketchPoint, SketchTable, SketchText } from "./canvas/types";
import { ImageSize } from "react-native";

export function migrateMetadata(legacyElements: any[], canvasSize: ImageSize, ratio: number): any[] {
    const newElemenets = [] as any[];

    const norm = (p: number, size: ImageSize) => (p * canvasSize.width / size.width) / ratio

    for (let i = 0; i < legacyElements.length; i++) {
        let { elem, type } = legacyElements[i];
        let newElem = undefined;
        if (type === 'text') {
            newElem = {
                id: "" + elem.id,
                text: elem.text,
                rtl: elem.rtl,
                color: elem.fontColor,
                fontSize: elem.fontSize,
                x: elem.normPosition.x,
                y: elem.normPosition.y,
            } as SketchText;

        } else if (type == "tableCellText") {
            newElem = {
                id: "" + elem.id,
                text: elem.text,
                rtl: elem.rtl,
                color: elem.fontColor,
                fontSize: elem.fontSize,
                tableId: elem.tableCell.tableID,
                x: elem.tableCell.col,
                y: elem.tableCell.row,
            } as SketchText;
            type = "text";
        } else if (type === 'path') {
            const points = elem.path.data.map((p: string) => {
                const coor = p.split(',').map(pp => parseFloat(pp).toFixed(2) as any)
                return [(coor[0] * canvasSize.width / elem.size.width) / ratio, (coor[1] * canvasSize.height / elem.size.height) / ratio];
            });

            newElem = {
                id: "" + elem.path.id,
                color: elem.path.color,
                strokeWidth: elem.path.width,
                points
            } as SketchPath;

        } else if (type === 'line') {
            newElem = {
                id: "" + elem.id,
                color: elem.color,
                strokeWidth: elem.width,
                from: [norm(elem.x1, elem.screenSize), norm(elem.y1, elem.screenSize)],
                to: [norm(elem.x2, elem.screenSize), norm(elem.y2, elem.screenSize)],
            } as SketchLine;
        } else if (type === 'lineDelete') {
            newElem = {
                id: "" + legacyElements[i].elemID,
            } as SketchLine;
        } else if (type === 'image' || type === 'imagePosition') {
            newElem = {
                id: "" + elem.id,
                x: elem.normPosition.x,
                y: elem.normPosition.y,
                file: elem.file,
                width: elem.width,
                height: elem.height,
            } as any;
        } else if (type === 'imageDelete') {
            newElem = {
                id: "" + elem.id
            } as SketchImage;
        } else if (type === 'table') {
            newElem = {
                id: "" + elem.id,
                color: elem.color,
                strokeWidth: elem.width,
                verticalLines: elem.verticalLines.map((p: number) => (p * canvasSize.width / elem.size.width) / ratio) as number[],
                horizontalLines: elem.horizontalLines.map((p: number) => (p * canvasSize.height / elem.size.height) / ratio) as number[],
                strokeDash: elem.style,
            } as SketchTable;
        } else if (type === 'tableDelete') {
            newElem = {
                id: "" + legacyElements[i].elemID,
            } as SketchTable;
        } else if (type === 'audio' || type === 'audioPosition') {
            newElem = {
                id: "" + elem.id,
                x: elem.normPosition.x,
                y: elem.normPosition.y,
                file: elem.file,
                type: "audio",
            } as SketchElement;
        } else if (type === 'audioDelete') {
            newElem = {
                id: "" + elem.id,
                type: "audio",
            } as SketchElement;
        }

        if (newElem) {
            newElemenets.push({ type, elem: newElem });
        }
    }

    return newElemenets;
}