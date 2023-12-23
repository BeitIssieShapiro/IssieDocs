import RNSketchCanvas from 'issie-sketch-canvas';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { colors, getFont } from './elements';
import { trace } from './log';
import { tableResizeDone } from './pinch';
import { arrLast } from './utils';
import { isRTL } from './lang';


const DEFAULT_STROKE_WIDTH = 5;
export const RESIZE_TABLE_BOX_SIZE = 10;
export const RESIZE_TABLE_BOX_OFFSET = 2;
function Canvas({
    revision,
    layoutReady,
    width, height,
    zoom,
    scaleRatio,
    isBrushMode,
    isImageMode,
    isTableMode,
    imagePath,
    SketchEnd,
    SketchStart,
    AfterRender,
    TableResizeState,
    ResizeTable,
    queue,
    normFontSize2FontSize,
    imageNorm2Scale,
    imageScale2Norm,
    currentTextElemId,
    strokeWidth,
    color,
    onTableResizeDuringTextEdit
}, ref) {
    const [canvas, setCanvas] = useState(React.createRef(null));
    const [texts, setTexts] = useState([]);
    const [images, setImages] = useState([]);
    const [tables, setTables] = useState([]);
    const [tablePhase, setTablePhase] = useState(0);

    useEffect(() => {
        canvas.current?.setState({
            strokeWidth,
            color,
        })
    }, [strokeWidth, color]);

    const txtElemNorm2Scale = useCallback((txtElem) => {
        const scaleElem = {
            ...txtElem
        }
        if (scaleElem.normFontSize === undefined) {
            //migrate elem
            scaleElem.normFontSize = scaleElem.fontSize;
        }


        scaleElem.fontSize = normFontSize2FontSize(scaleElem.normFontSize)

        if (!scaleElem.tableCell) {
            if (scaleElem.normWidth === undefined) {
                scaleElem.normWidth = scaleElem.width * scaleElem.normFontSize / scaleElem.fontSize;
            }

            scaleElem.width = scaleElem.normWidth * scaleElem.fontSize / scaleElem.normFontSize;
            scaleElem.position = {
                x: scaleElem.normPosition.x * scaleRatio,
                y: scaleElem.normPosition.y * scaleRatio,
            };
        }
        return scaleElem;
    }, [scaleRatio]);



    const findElementByLocation = useCallback((normXY, scaleRatio, table) => {
        let q = isImageMode ? images : texts;
        const margin = 20; //this.isTextMode() && this.state.fontSize > 60 ? 0 : 5 / scaleRatio

        for (let i = q.length - 1; i >= 0; i--) {
            const elem = isImageMode ? imageScale2Norm(q[i]) : q[i];

            if (!isImageMode && elem.tableCell) continue;
            // trace("findElementByLocation", elem.text)
            // trace("np", elem.normPosition.x, elem.normPosition.y)
            // trace("normXY", normXY.x, normXY.y)
            // trace("height", elem.height, "width", elem.width, elem.normWidth, scaleRatio)

            const elemY = elem.normPosition.y;
            const normHeight = elem.height;/// this.state.scaleRatio;
            // trace("y-params",
            //   "elemY < normXY.y + 10 + margin", (elemY < normXY.y + 10 + margin) ? true : false,
            //   elemY, normXY.y,
            //   "elemY + elem.height > normXY.y + 10 - margin", (elemY + elem.height > normXY.y + 10 - margin) ? true : false)
            let foundY = elemY < normXY.y + margin && elemY + normHeight > normXY.y - margin;
            //trace("findElementByLocation eng", elem.text, "click at:", normXY, "elem at:", elem.normPosition, foundY ? "foundY " + elem.text : "notFoundY")
            const normWidth = elem.width / scaleRatio;

            if (elem.rtl) {
                //todo - fix
                if (elem.normPosition.x > normXY.x - margin &&
                    elem.normPosition.x - normWidth < normXY.x + margin
                    && foundY) {
                    return q[i];
                }
            } else {
                if (elem.normPosition.x < normXY.x + margin &&
                    elem.normPosition.x + normWidth > normXY.x - margin
                    && foundY) {
                    //trace("findElementByLocation eng found!")
                    return q[i];
                }
            }
        }

        if (!isImageMode && table) {
            //locate table's cell:
            const normToTableX = (x) => x * scaleRatio / (width / table.size.width);
            const normToTableY = (y) => y * scaleRatio / (height / table.size.height);

            const tX = normToTableX(normXY.x);
            const tY = normToTableY(normXY.y);
            trace("find table cell", tX, tY, table)
            for (let c = 0; c < table.verticalLines.length - 1; c++) {
                if (tX > table.verticalLines[c] && tX < table.verticalLines[c + 1]) {
                    for (let r = 0; r < table.horizontalLines.length - 1; r++) {
                        if (tY > table.horizontalLines[r] && tY < table.horizontalLines[r + 1]) {

                            let tableCellElem = texts.find(elem => elem.tableCell?.tableID == table.id &&
                                elem.tableCell?.col === c && elem.tableCell?.row === r);

                            if (!tableCellElem) {
                                //creates on the fly a tableCellText elem
                                tableCellElem = {
                                    font: getFont(),
                                    rtl: isRTL(),
                                    alignment: isRTL() ? 'Right' : 'Left',
                                    tableCell: {
                                        tableID: table.id,
                                        col: c,
                                        row: r,
                                    }
                                }
                            }
                            return tableCellElem;
                        }
                    }
                    break;
                }
            }
        }

        return undefined;
    }, [texts, images, isImageMode]);

    const canvasTexts = useCallback(() => texts, [texts]);
    const canvasTables = useCallback(() => tables, [tables]);


    useImperativeHandle(ref, () => ({
        findElementByLocation,
        canvasTexts,
        canvas,
        canvasTables,
    }),
        [findElementByLocation, canvasTexts]);

    // Canvas Update
    useEffect(() => {
        if (!canvas || !canvas.current || !layoutReady)
            return;

        //trace("New UpdateCanvas", "ratio", scaleRatio, "zoom", zoom)

        let q = queue.getAll();
        let canvasTexts = [];
        let canvasImages = [];
        let canvasTables = [];
        let tableCellTexts = [];
        let paths = [];
        let table = undefined;

        for (let i = 0; i < q.length; i++) {
            if (q[i].type === 'text' || q[i].type === 'tableCellText') {
                const txtElem = txtElemNorm2Scale(q[i].elem)

                //first try to find same ID and replace, or add it
                let found = false;
                let textArray = q[i].type === 'text' ? canvasTexts : tableCellTexts;

                for (let j = 0; j < textArray.length; j++) {
                    if (textArray[j].id === txtElem.id) {
                        if (txtElem.text?.length == 0) {
                            textArray = textArray.filter(t => t.id !== txtElem.id);
                            if (q[i].type === 'text') {
                                canvasTexts = textArray;
                            } else {
                                tableCellTexts = textArray;
                            }
                        } else {
                            textArray[j] = txtElem;
                        }
                        found = true;
                        break;
                    }
                }
                //avoid showing the current edited text for non table-cell text
                if (!found && (txtElem.id !== currentTextElemId || q[i].type === 'tableCellText')) {
                    //trace("add txtElem", txtElem.id, found)
                    textArray.push(txtElem);
                }
            } else if (q[i].type === 'path') {
                paths.push(q[i].elem);
            } else if (q[i].type === 'image') {
                canvasImages.push(imageNorm2Scale(q[i].elem, scaleRatio));
            } else if (q[i].type === 'imagePosition') {
                const elemIndex = canvasImages.findIndex(ci => ci.id === q[i].elem.id);
                if (elemIndex >= 0) {
                    const updatedImage = { ...canvasImages[elemIndex], ...q[i].elem }
                    canvasImages[elemIndex] = imageNorm2Scale(updatedImage)
                }
            } else if (q[i].type === 'imageDelete') {
                const elemIndex = canvasImages.findIndex(ci => ci.id === q[i].elem.id);
                if (elemIndex >= 0) {
                    canvasImages.splice(elemIndex, 1);
                }
            } else if (q[i].type === 'table') {
                canvasTables = canvasTables.filter(t => t.id !== q[i].elem.id);
                canvasTables.push(q[i].elem);
            } else if (q[i].type === 'tableDelete') {
                canvasTables = canvasTables.filter(t => t.id !== q[i].elemID);
                // delete all cell text related
                tableCellTexts = tableCellTexts.filter(tct => tct.tableCell.tableID !== q[i].elemID)
            }
        }

        // filter and mutate the cell size and the table's line
        tableCellTexts = tableCellTexts
            .sort((a, b) => a.tableCell.row - b.tableCell.row || a.tableCell.col - b.tableCell.col)
            .filter(txtElem => {
                //verify the table exists:
                let table = canvasTables.find(t => t.id == txtElem.tableCell.tableID);
                if (!table) return false;

                if (!table.clone) {
                    // must clone to avoid persistance
                    table = {
                        ...table,
                        horizontalLines: [...table.horizontalLines],
                        minHeights: table.horizontalLines.map(hl => -1),
                        clone: true
                    };

                    canvasTables = canvasTables.filter(t => t.id != table.id);
                    canvasTables.push(table);
                    if (TableResizeState?.table?.id == table.id) {
                        TableResizeState.table = table;
                    }
                }

                //verify the cell in the table exists:
                if (txtElem.tableCell.col >= table.verticalLines.length - 1 &&
                    txtElem.tableCell.row >= table.horizontalLines.length - 1) return false;

                // Adjust table rows to minHeight: 
                const actualNormRowHeight = (table.horizontalLines[txtElem.tableCell.col + 1] - table.horizontalLines[txtElem.tableCell.col] - table.width); //* (height / table.size.height)
                const needToEnlargeBy = txtElem.minHeight - actualNormRowHeight;
                if (needToEnlargeBy > 0) {
                    //resize the row:
                    const tablePageRatio = (height / table.size.height)
                    const maxAvailableRoomToResize = arrLast(table.horizontalLines) * tablePageRatio;
                    const resizeBy = Math.min(maxAvailableRoomToResize, needToEnlargeBy * tablePageRatio);



                    //push all lines 

                    for (let row = txtElem.tableCell.row + 1; row < table.horizontalLines.length; row++) {
                        table.horizontalLines[row] += resizeBy;
                    }
                    // set minHeight
                    table.minHeights[txtElem.tableCell.row] = Math.max(table.minHeights[txtElem.tableCell.row], table.horizontalLines[txtElem.tableCell.row + 1] - table.horizontalLines[txtElem.tableCell.row])
                } else {
                    table.minHeights[txtElem.tableCell.row] = Math.max(table.minHeights[txtElem.tableCell.row], txtElem.minHeight);
                }

                // updates the element if in draft-mode
                if (txtElem.draft) {
                    setTimeout(onTableResizeDuringTextEdit, 10);
                }
                return true;
            });

        if (isTableMode && TableResizeState) {
            const updateTable = ResizeTable(TableResizeState, width, height);
            canvasTables = canvasTables.filter(t => t.id !== TableResizeState.table.id);
            canvasTables.push(updateTable);
        }

        tableCellTexts.forEach(txtElem => {
            const table = canvasTables.find(t => t.id == txtElem.tableCell.tableID);
            // Adjust cell's texts to current table size and location - todo margin
            txtElem.width = (table.verticalLines[txtElem.tableCell.col + 1] - table.verticalLines[txtElem.tableCell.col] - table.width) * (width / table.size.width)
            txtElem.height = (table.horizontalLines[txtElem.tableCell.row + 1] - table.horizontalLines[txtElem.tableCell.row] - table.width) * (height / table.size.height)
            txtElem.normPosition = {
                x: (table.verticalLines[txtElem.tableCell.col + (txtElem.rtl ? 1 : 0)] * (width / table.size.width)) / scaleRatio,
                y: (table.horizontalLines[txtElem.tableCell.row] * (height / table.size.height)) / scaleRatio
            };
            txtElem.position = {
                x: txtElem.normPosition.x * scaleRatio,
                y: txtElem.normPosition.y * scaleRatio
            };
        });

        canvasTexts = canvasTexts.concat(tableCellTexts.filter(tct => tct.id !== currentTextElemId));

        setTexts(canvasTexts);
        setImages(canvasImages);
        setTables(canvasTables);

        const waitFor = [
            new Promise((resolve) => canvas.current?.getImageIds((ids) => {
                const idsStatus = ids ? ids.map(id => ({ id, exists: false })) : [];
                canvasImages.forEach(ci => {

                    const stat = idsStatus.find(idStat => idStat.id === ci.id);
                    if (stat) {
                        const scalePos = {
                            id: ci.id,
                            width: ci.width,
                            height: ci.height,
                            position: ci.position,
                        }

                        canvas?.current?.setCanvasImagePosition(scalePos)
                        stat.exists = true;
                    } else {
                        canvas.current?.addOrSetCanvasImage(ci);
                    }
                });
                // delete those images who are no longer exists in the queue
                idsStatus.filter(idStat => !idStat.exists).forEach(idStat => canvas.current?.deleteImage(idStat.id));
                resolve();
            })),
            new Promise((resolve) => canvas.current?.getPathIds((ids) => {
                //trace("path ids :", JSON.stringify(ids))

                const idsStatus = ids ? ids.map(id => ({ id, exists: false })) : [];
                paths.forEach(path => {
                    canvas.current?.addPath(path, width, height);
                    const stat = idsStatus.find(idStat => idStat.id == path.path.id);
                    if (stat) {
                        stat.exists = true;
                    }
                });

                // Draw all tables
                //trace("draw tables", canvasTables)
                canvasTables.forEach((table) => {

                    const size = table.size;
                    const tableWidth = table.width; // isTableMode ? table.width  : table.width;
                    let style = table.style || "0,0";
                    const styles = style.split(",")
                    const dash = parseInt(styles[0] * tableWidth); //isTableMode ? 10 : 0;
                    const dashGap = parseInt(styles[1] * tableWidth) //isTableMode ? 5 :0 style[1];

                    const addLine = (id, x1, y1, x2, y2, color, lWidth, d, dg, ph) => {
                        canvas.current?.addPath(
                            {
                                path: {
                                    id,
                                    color,
                                    width: lWidth,
                                    data: [
                                        "" + x1 + "," + y1,
                                        "" + x2 + "," + y2,
                                        "" + x2 + "," + y2,
                                    ],
                                    dash: d || 0, dashGap: dg || 0, phase: ph || 0

                                },
                                size
                            }, width, height)
                        const stat = idsStatus.find(idStat => idStat.id == id);
                        if (stat) {
                            stat.exists = true;
                        }
                    }

                    for (let c = 0; c < table.verticalLines.length; c++) {
                        let x = table.verticalLines[c];
                        addLine(table.id + 100 + c,
                            x, table.horizontalLines[0],
                            x, arrLast(table.horizontalLines),
                            table.color, tableWidth, dash, dashGap, tablePhase);
                    }

                    for (let r = 0; r < table.horizontalLines.length; r++) {
                        const y = table.horizontalLines[r];
                        addLine(table.id + 200 + r, table.verticalLines[0], y, arrLast(table.verticalLines), y,
                            table.color, tableWidth, dash, dashGap, tablePhase);
                    }

                    //add resize indicators:
                    const bs = RESIZE_TABLE_BOX_SIZE;
                    const os = RESIZE_TABLE_BOX_OFFSET;

                    const drawBox = (idStart, x1, y1, x2, y2, color, lWidth) => {
                        addLine(idStart, x1, y1, x1, y2, color, lWidth);
                        addLine(idStart + 1, x1, y2, x2, y2, color, lWidth);
                        addLine(idStart + 2, x2, y2, x2, y1, color, lWidth);
                        addLine(idStart + 3, x2, y1, x1, y1, color, lWidth);
                    }

                    const drawArrow = (idStart, x1, y1, color, lWidth, ns, ew,) => {
                        const l = 2; //length
                        //north
                        addLine(idStart, x1 + ew * l, y1 + ew * l, x1 + ns * l, y1 + ns * l, color, lWidth);
                        addLine(idStart + 1, x1 + ew * l, y1 - ew * l, x1 - ns * l, y1 + ns * l, color, lWidth);
                    }


                    if (isTableMode) {
                        let x1 = arrLast(table.verticalLines) + os;
                        let y1 = arrLast(table.horizontalLines) + os;
                        let x2 = x1 + bs;
                        let y2 = y1 + bs;

                        const c = "gray"
                        drawBox(300, x1, y1, x2, y2, c, 1);
                        x1 = table.verticalLines[0] - os - bs * 2;
                        y1 = table.horizontalLines[0] - os - bs * 2;

                        x2 = x1 + bs * 2;
                        y2 = y1 + bs * 2;
                        drawBox(304, x1, y1, x2, y2, c, 1);
                        addLine(309, x1 + bs, y1 + 2, x1 + bs, y2 - 2, "black", 1);
                        addLine(310, x1 + 2, y1 + bs, x2 - 2, y1 + bs, "black", 1);
                        drawArrow(311, x1 + bs, y1 + 2, "black", 1, 1, 0);
                        drawArrow(313, x1 + bs, y2 - 2, "black", 1, -1, 0);
                        drawArrow(315, x1 + 2, y1 + bs, "black", 1, 0, 1);
                        drawArrow(317, x2 - 2, y1 + bs, "black", 1, 0, -1);
                    }
                });


                // delete those paths who are no longer exists in the queue
                idsStatus.filter(idStat => !idStat.exists).forEach(idStat => canvas.current?.deletePath(idStat.id));
                resolve()
            }))
        ]
        Promise.all(waitFor).then(() => {
            AfterRender(revision)
        });

    }, [revision, scaleRatio, currentTextElemId, width, height, isTableMode, tablePhase, TableResizeState]);

    return (
        <RNSketchCanvas
            ref={canvas}
            width={width}
            height={height}
            scale={zoom} //important for path when being drawn to be in correct size
            touchEnabled={isBrushMode}
            text={texts}
            containerStyle={{ flex: 1, backgroundColor: 'transparent', zIndex: 1 }}
            canvasStyle={{ flex: 1, backgroundColor: 'transparent', zIndex: 1 }}
            localSourceImage={{ filename: imagePath, mode: 'AspectFit' }}
            onStrokeEnd={SketchEnd}
            onStrokeStart={SketchStart}
            strokeColors={[{ color: colors.black }]}
            defaultStrokeIndex={0}
            defaultStrokeWidth={DEFAULT_STROKE_WIDTH}
        />);
}

export default forwardRef(Canvas);