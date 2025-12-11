// utils.ts
import { ImageURISource, Platform, Image, ImageSize } from "react-native";
import { ElementBase, SketchPoint, SketchTable, SketchText } from "./types";

/** Joins a list of SketchPoints into an SVG path string. */
export function joinPath(points: SketchPoint[], ratio: number): string {
    if (!points.length) return "";
    let path = `M${points[0][0] * ratio} ${points[0][1] * ratio}`;
    for (let i = 1; i < points.length; i++) {
        path += ` L${points[i][0] * ratio} ${points[i][1] * ratio}`;
    }
    return path;
}

/** Computes the angle (0°–180°) between two points. */
export function calculateLineAngle(from: SketchPoint, to: SketchPoint): number {
    const deltaX = to[0] - from[0];
    const deltaY = to[1] - from[1];
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    // Clamp angle to [0..180]
    if (angle < 0) {
        angle += 180;
    } else if (angle > 180) {
        angle -= 180;
    }

    return angle;
}

/** Returns the midpoint between two points. */
export function calculateMidpoint(from: SketchPoint, to: SketchPoint): SketchPoint {
    return [
        (from[0] + to[0]) / 2,
        (from[1] + to[1]) / 2,
    ];
}

/**
 * Returns true if point (px, py) is within `threshold` distance of the line segment from->to.
 */
export function isPointOnLineSegment(
    from: [number, number],
    to: [number, number],
    px: number,
    py: number,
    threshold: number
): boolean {
    const x1 = from[0];
    const y1 = from[1];
    const x2 = to[0];
    const y2 = to[1];

    // Line segment vector
    const dx = x2 - x1;
    const dy = y2 - y1;

    // If the line is actually a single point
    if (dx === 0 && dy === 0) {
        const distPoint = Math.hypot(px - x1, py - y1);
        return distPoint <= threshold;
    }

    // Vector from start of segment to the point
    const dxP = px - x1;
    const dyP = py - y1;

    // Project this vector onto the line (t is a ratio from 0 to 1 if "within" segment)
    const segLenSq = dx * dx + dy * dy;  // length^2 of the line segment
    const t = (dxP * dx + dyP * dy) / segLenSq;

    // If t < 0 => point is before x1,y1
    // If t > 1 => point is past x2,y2
    // Clamp t to [0, 1] so we find the closest point on the segment.
    const tClamped = Math.max(0, Math.min(1, t));

    // Closest point on the segment
    const closestX = x1 + tClamped * dx;
    const closestY = y1 + tClamped * dy;

    // Distance from the point to that closest point
    const dist = Math.hypot(px - closestX, py - closestY);
    return dist <= threshold;
}

/** Returns a point offset from the midpoint, based on angle & distance. */
export function calculateLineTrashPoint(
    from: SketchPoint,
    to: SketchPoint,
    angle: number,
    distance: number
): SketchPoint {
    const [midX, midY] = calculateMidpoint(from, to);
    const radianAngle = (angle * Math.PI) / 180;
    const offsetX = Math.cos(radianAngle) * distance;
    const offsetY = Math.sin(radianAngle) * distance;
    return [midX + offsetX, midY + offsetY];
}

/** Returns the last element in an array. */
export function arrLast<T>(arr?: T[]): T | undefined {
    return arr ? arr[arr.length - 1] : undefined;
}

export function tableRowHeight(table: SketchTable, row: number): number {
    return table.horizontalLines[row + 1] - table.horizontalLines[row];
}

export function tableColWidth(table: SketchTable, col: number): number {
    return table.verticalLines[col + 1] - table.verticalLines[col];
}

export function tableHeight(table: SketchTable): number {
    const lastHLine = arrLast(table.horizontalLines);
    return lastHLine ? lastHLine - table.horizontalLines[0] : 0;
}

export function tableWidth(table: SketchTable): number {
    const lastVLine = arrLast(table.verticalLines);
    return lastVLine ? lastVLine - table.verticalLines[0] : 0;
}

const MIN_LINE_HEIGHT = 15;

export function calcEffectiveHorizontalLines(table: SketchTable, maxHeight: number, texts?: SketchText[]): number[] {
    const tableTexts = texts?.filter(t => t.tableId == table.id);
    const result = [] as number[];

    let maxLinePosition = maxHeight - MIN_LINE_HEIGHT * table.horizontalLines.length - 1;

    let dy = 0;
    for (let i = 0; i < table.horizontalLines.length; i++) {
        if (i > 0) {
            const rowTexts = tableTexts?.filter(t => t.y == i - 1);
            if (rowTexts && rowTexts.length > 0) {
                const rowHeight = tableRowHeight(table, i - 1);
                const maxTextHeight = Math.max(...rowTexts.map(rt => (rt.height ?? 0)));
                if (maxTextHeight > rowHeight) {
                    // enlarge row height and all next rows position
                    dy += maxTextHeight - rowHeight + table.strokeWidth / 2;
                }
            }
        }
        let hl = table.horizontalLines[i] + dy;
        if (hl > maxLinePosition) {
            hl = maxLinePosition;
        }
        result.push(hl);
        maxLinePosition += MIN_LINE_HEIGHT;
    }
    return result;
}

export function getId(prefix: string): string {
    return prefix + Math.random() * 10000;
}

export function inBox(t: any, x: number, y: number, margin: number): boolean {
    // Determine the bounding box based on RTL
    let left: number;
    let right: number;

    if (t.rtl) {
        // If rtl, x is the right edge, so we go from x - width to x
        left = t.x - t.width;
        right = t.x;
    } else {
        // Non-rtl, x is the left edge, so we go from x to x + width
        left = t.x;
        right = t.x + t.width;
    }

    return (
        left - margin < x &&
        right + margin > x &&
        t.y - margin < y &&
        t.height &&
        t.y + t.height + margin > y
    );
}

export function cloneElem(elem: any): any {
    return JSON.parse(JSON.stringify(elem));
}

export function backupElement(elem: ElementBase) {
    console.log("backupElement", elem)
    elem.backup = JSON.stringify(elem);
}

export function restoreElement(elem: ElementBase): ElementBase {
    if (!elem.backup) return elem;
    const backupCopy = JSON.parse(elem.backup);
    delete elem.backup;

    const currentClone = cloneElem(elem);
    Object.assign(elem, backupCopy);

    // console.log("restore to", currentClone)
    return currentClone;
}

export function wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

const findFilePrefix = "org.issieshapiro.issiedocs/files"
const findCachePrefix = "org.issieshapiro.issiedocs/cache";
export function normalizeFoAndroid(imgSrc: ImageURISource | undefined): ImageURISource | undefined {

    let res = imgSrc;
    if (imgSrc && Platform.OS === 'android' && imgSrc.uri && !imgSrc.uri.startsWith("content")) {
        // FileProviderModule.getUriForFile(imgSrc.uri)
        // .then((uri:string) => {
        //   console.log('File URI:', uri);
        // });
        let pos = imgSrc.uri.indexOf(findFilePrefix);
        if (pos >= 0) {
            let uri = "content://org.issieshapiro.issiedocs.provider" + imgSrc.uri.substring(pos + findFilePrefix.length);
            res = { ...imgSrc, uri };
        } else {
            pos = imgSrc.uri.indexOf(findCachePrefix);
            if (pos >= 0) {
                let uri = "content://org.issieshapiro.issiedocs.provider/cache_files" + imgSrc.uri.substring(pos + findCachePrefix.length);
                res = { ...imgSrc, uri };
            }
        }
    }
    //console.log('normalizeFoAndroid:', imgSrc?.uri, "=>", res?.uri);
    return res;
}


export function IIF(defValue: any, ...args: [any, any][]): any {

    for (let i = 0; i < args.length; i++) {
        if (!!args[i][0]) return args[i][1];
    }
    return defValue;
}

export interface CalcRatioResponse {
    ratio: number;
    actualSize: ImageSize;
    actualSideMargin: number;
    originalImageHeight: number;
}

export async function calcRatio(imgPath: string, minSideMargin: number, windowSize: ImageSize, additionalHeight: number): Promise<CalcRatioResponse> {
    if (imgPath) {
        return new Promise((resolve) => {
            setTimeout(() => Image.getSize(imgPath).then((size) => {
                const ratioX = (windowSize.width - minSideMargin * 2) / size.width;
                const ratioY = windowSize.height / size.height;
                let ratio = Math.min(ratioX, ratioY);
                ratio = Math.floor((ratio + Number.EPSILON) * 100) / 100;

                const actualSize = { width: size.width * ratio, height: (size.height + additionalHeight) * ratio };
                const actualSideMargin = (windowSize.width - size.width * ratio) / 2;
                const originalImageHeight = size.height * ratio;
                resolve({
                    ratio,
                    actualSize,
                    actualSideMargin,
                    originalImageHeight,
                })
            }), 0);
        })
    }
    return {
        ratio: 1,
        actualSize: windowSize,
        actualSideMargin: minSideMargin,
        originalImageHeight: windowSize.height,
    };
}
