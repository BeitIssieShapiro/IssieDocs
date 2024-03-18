import RNSketchCanvas from 'issie-sketch-canvas';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { colors, getFont } from './elements';
import { trace } from './log';
import { tableResizeDone } from './pinch';
import { arrLast, calculateTargetBox, isCellInBox, isSameCell, normalizeBox, offsetTableBox, offsetTablePoints, pointOnContinuationOfLine, tableBoxToPoints, tableColWidth, tableRowHeight } from './utils';
import { isRTL } from './lang';


const DEFAULT_STROKE_WIDTH = 5;
export const RESIZE_TABLE_BOX_SIZE = 22;
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
    TableSelection,
    TableSelectionMove,
    ResizeTable,
    queue,
    normFontSize2FontSize,
    imageNorm2Scale,
    imageScale2Norm,
    currentTextElemId,
    SelectedRulerElemId,
    strokeWidth,
    color,
    onTableResizeDuringTextEdit,
    metaDataPath,
}, ref) {
    const [canvas, setCanvas] = useState(React.createRef(null));
    const [texts, setTexts] = useState([]);
    const [images, setImages] = useState([]);
    const [tables, setTables] = useState([]);
    const [paths, setPaths] = useState([]);
    const [tablePhase, setTablePhase] = useState(0);

    useEffect(() => {
        canvas.current?.setState({
            strokeWidth,
            color,
        })
    }, [strokeWidth, color]);

    useEffect(() => {
        canvas.current?.clearImages();
    }, [metaDataPath]);

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
                scaleElem.normWidth = scaleElem.width * scaleElem.fontSize / scaleElem.normFontSize;
            }

            scaleElem.width = scaleElem.normWidth * scaleElem.normFontSize / scaleElem.fontSize;
            trace("scaleElem.width", scaleElem.width)
            scaleElem.position = {
                x: scaleElem.normPosition.x * scaleRatio,
                y: scaleElem.normPosition.y * scaleRatio,
            };
        }
        return scaleElem;
    }, [scaleRatio]);

    const findRulerById = useCallback((id) => {
        return paths.find(p => p.id === id);
    }, [paths]);

    const findRuler = useCallback((normXY, scaleRatio) => {

        return paths.find(p => {
            if (p.x1 == undefined) return false; //not a ruler

            const { x1, y1, x2, y2 } = p;
            const {x,y} = normXY;
            const threshold = 10 / scaleRatio;

            const dx = x2 - x1;
            const dy = y2 - y1;
            const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
            const end1 = (Math.abs(x - x1) < threshold && Math.abs(y - y1) < threshold);
            const end2 = (Math.abs(x - x2) < threshold && Math.abs(y - y2) < threshold);
      
            if (end1 || end2) return true;


            if (t < 0 || t > 1) {
                return false; // (x, y) is outside the segment defined by (x1, y1) and (x2, y2)
            }
            
            let closestX = x1 + t * dx;
            let closestY = y1 + t * dy;
            let distance = Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2);
            
            return distance <= threshold;
        })
    }, [paths]);


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
        findRuler,
        findRulerById,
        canvasTexts,
        canvas,
        canvasTables,
    }),
        [findElementByLocation, findRuler, canvasTexts]);


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
        let canvasPaths = [];

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
                canvasPaths.push(q[i].elem);
            } else if (q[i].type === 'line') {
                canvasPaths = canvasPaths.filter(l => l.id !== q[i].elem.id);
                canvasPaths.push(q[i].elem);
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
                if (txtElem.tableCell.col >= table.verticalLines.length - 1 ||
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
            const result = ResizeTable(TableResizeState, width, height);
            trace("resize table", result)
            if (result.tableChanged) {
                canvasTables = canvasTables.filter(t => t.id !== TableResizeState.table.id);
                canvasTables.push(result.table);
            }
        }

        tableCellTexts.forEach(txtElem => {
            const table = canvasTables.find(t => t.id == txtElem.tableCell.tableID);
            // Adjust cell's texts to current table size and location - todo margin
            txtElem.width = (tableColWidth(table, txtElem.tableCell.col) - table.width) * (width / table.size.width)
            txtElem.height = (tableRowHeight(table, txtElem.tableCell.row) - table.width) * (height / table.size.height)
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
        setPaths(canvasPaths)

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

                const addLine = (id, x1, y1, x2, y2, color, lWidth, screenSize, d, dg, ph, x3, y3) => {
                    const data = [
                        "" + x1 + "," + y1,
                        "" + x2 + "," + y2,
                    ]
                    if (x3) {
                        data.push("" + x3 + "," + y3);
                        data.push("" + x3 + "," + y3);
                    } else {
                        data.push("" + x2 + "," + y2);
                    }

                    canvas.current?.addPath(
                        {
                            path: {
                                id,
                                color,
                                width: lWidth,
                                data,
                                dash: d || 0, dashGap: dg || 0, phase: ph || 0

                            },
                            size: screenSize,
                        }, width, height)
                    const stat = idsStatus.find(idStat => idStat.id == id);
                    if (stat) {
                        stat.exists = true;
                    }
                }

                // box: {from:[x1,y1], to: [x2,y2]}
                const drawBox = (idStart, boxPoints, color, lWidth, tableSize, dash, dashGap, phase) => {
                    const { x1, y1, x2, y2 } = boxPoints;

                    addLine(idStart, x1, y1, x1, y2, color, lWidth, tableSize, dash, dashGap, phase);
                    addLine(idStart + 1, x1, y2, x2, y2, color, lWidth, tableSize, dash, dashGap, phase);
                    addLine(idStart + 2, x2, y2, x2, y1, color, lWidth, tableSize, dash, dashGap, phase);
                    addLine(idStart + 3, x2, y1, x1, y1, color, lWidth, tableSize, dash, dashGap, phase);
                }
                canvasPaths.forEach(path => {
                    if (path?.x1 > 0) { //temp way to know it is a line

                        addLine(path.id, path.x1, path.y1, path.x2, path.y2, path.color, path.width, path.screenSize);

                        if (SelectedRulerElemId === path.id) {
                            
                            const { x1, y1, x2, y2 } = path;
                            const width = Math.max(10, path.width * 2);

                            const end1 = pointOnContinuationOfLine( x1 , y1, x2, y2, width, true);
                            const end2 = pointOnContinuationOfLine( x1 , y1, x2, y2, width, false);

                            addLine(path.id + 1, x1 , y1, end1.x, end1.y, "gray", width, path.screenSize);
                            addLine(path.id + 2, x2 , y2, end2.x, end2.y, "gray", width, path.screenSize);
                           
                        }
                    } else {
                        canvas.current?.addPath(path, width, height);
                        const stat = idsStatus.find(idStat => idStat.id == path.path.id);
                        if (stat) {
                            stat.exists = true;
                        }
                    }
                });


                // Draw all tables
                //trace("draw tables", canvasTables)
                canvasTables.forEach((table) => {

                    const tableSize = table.size;
                    const tableWidth = table.width; // isTableMode ? table.width  : table.width;
                    let style = table.style || "0,0";
                    const styles = style.split(",")
                    const dash = parseInt(styles[0] * tableWidth); //isTableMode ? 10 : 0;
                    const dashGap = parseInt(styles[1] * tableWidth) //isTableMode ? 5 :0 style[1];

                    for (let c = 0; c < table.verticalLines.length; c++) {
                        let x = table.verticalLines[c];
                        addLine(table.id + 100 + c,
                            x, table.horizontalLines[0],
                            x, arrLast(table.horizontalLines),
                            table.color, tableWidth, tableSize, dash, dashGap, tablePhase);
                    }

                    for (let r = 0; r < table.horizontalLines.length; r++) {
                        const y = table.horizontalLines[r];
                        addLine(table.id + 200 + r, table.verticalLines[0], y, arrLast(table.verticalLines), y,
                            table.color, tableWidth, tableSize, dash, dashGap, tablePhase);
                    }


                    // Table selection and moving cells:
                    if (TableSelectionMove) {
                        const normBox = normalizeBox(TableSelection);
                        const targetBox = calculateTargetBox(table, normBox, TableSelectionMove.to);
                        const targetPoints = tableBoxToPoints(table, targetBox, tableWidth);
                        drawBox(table.id + 300, targetPoints, "orange", 4, tableSize, dash, dashGap, tablePhase);

                        // if (!isSameCell(TableSelectionMove.from, TableSelectionMove.to)) {
                        //     // ofset the selection

                        //     drawBox(table.id + 310, boxPoints, "orange", 4, tableSize, dash, dashGap, tablePhase);
                        // } else {
                        //     const boxPoints = tableBoxToPoints(table, normalizeBox(TableSelection), tableWidth);
                        //     drawBox(table.id + 300, boxPoints, "orange", 4, tableSize, dash, dashGap, tablePhase);    
                        // }
                        // draw dragged cells
                        const origSelectionBoxPoints = tableBoxToPoints(table, normBox, 0);
                        const dragBoxPoints = offsetTablePoints(origSelectionBoxPoints, TableSelectionMove.pixelDelta);
                        trace("drag", origSelectionBoxPoints, dragBoxPoints)
                        drawBox(table.id + 320, dragBoxPoints, "gray", 3, tableSize, 3, 3, tablePhase);

                    } else if (TableSelection) {
                        const boxPoints = tableBoxToPoints(table, normalizeBox(TableSelection), tableWidth);
                        drawBox(table.id + 300, boxPoints, "orange", 4, tableSize, dash, dashGap, tablePhase);
                    }


                    //add resize indicators:
                    const bs = RESIZE_TABLE_BOX_SIZE / 2;
                    const os = RESIZE_TABLE_BOX_OFFSET;



                    const drawArrow = (idStart, x1, y1, color, lWidth, ns, ew, l, screenSize) => {
                        if (ns != 0) {
                            addLine(idStart, x1 + ns * l, y1 + ns * l, x1 + ew * l, y1 + ew * l, color, lWidth, screenSize,
                                undefined, undefined, undefined,
                                x1 - ns * l, y1 + ns * l);
                        } else {
                            addLine(idStart, x1 + ew * l, y1 + ew * l, x1, y1, color, lWidth, screenSize,
                                undefined, undefined, undefined,
                                x1 + ew * l, y1 - ew * l);

                        }
                    }


                    if (isTableMode) {
                        const size = 44;
                        const hsize = size / 2;
                        const lineW = 4;
                        const color = "gray"
                        const aSize = 7
                        const rs = 8

                        // resize box bottom/right
                        let x1 = arrLast(table.verticalLines) + os;
                        let y1 = arrLast(table.horizontalLines) + os;

                        let x2 = x1 + lineW / 2
                        let y2 = y1 + lineW / 2
                        addLine(300, x1, y1, x2, y2, color, lineW, tableSize)
                        x1 += rs, x2 += rs, y1 += rs, y2 += rs,
                            addLine(301, x1, y1, x2, y2, color, lineW, tableSize)
                        y1 -= rs, y2 -= rs;
                        addLine(302, x1, y1, x2, y2, color, lineW, tableSize)
                        y1 -= rs, y2 -= rs;
                        addLine(303, x1, y1, x2, y2, color, lineW, tableSize)
                        y1 += 2 * rs, y2 += 2 * rs, x1 -= rs, x2 -= rs;
                        addLine(304, x1, y1, x2, y2, color, lineW, tableSize)
                        x1 -= rs, x2 -= rs;
                        addLine(305, x1, y1, x2, y2, color, lineW, tableSize)

                        // move arrows


                        x1 = table.verticalLines[0] - os - size;
                        y1 = table.horizontalLines[0] //- os - size;

                        x2 = x1 + size;
                        y2 = y1 + size;
                        //drawBox(304, x1, y1, x2, y2, c, 1);
                        addLine(309, x1 + hsize, y1 + 2, x1 + hsize, y2 - 2, color, lineW, tableSize)
                        addLine(310, x1 + 2, y1 + hsize, x2 - 2, y1 + hsize, color, lineW, tableSize);
                        drawArrow(311, x1 + hsize, y1 + 2, color, lineW, 1, 0, aSize, tableSize);
                        drawArrow(313, x1 + hsize, y2 - 2, color, lineW, -1, 0, aSize, tableSize);
                        drawArrow(315, x1 + 2, y1 + hsize, color, lineW, 0, 1, aSize, tableSize);
                        drawArrow(317, x2 - 2, y1 + hsize, color, lineW, 0, -1, aSize, tableSize);
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

    }, [revision, scaleRatio, currentTextElemId, SelectedRulerElemId, width, height,
        isTableMode, tablePhase, TableResizeState, TableSelection, TableSelectionMove]);

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