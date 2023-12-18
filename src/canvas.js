import RNSketchCanvas from 'issie-sketch-canvas';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { colors } from './elements';
import { trace } from './log';
import { tableResizeDone } from './pinch';


const DEFAULT_STROKE_WIDTH = 5;

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
    Table,
    ResizeTable,
    queue,
    normFontSize2FontSize,
    imageNorm2Scale,
    imageScale2Norm,
    currentTextElemId,
    strokeWidth,
    color

}, ref) {
    const [canvas, setCanvas] = useState(React.createRef(null));
    const [texts, setTexts] = useState([]);
    const [images, setImages] = useState([]);
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

        if (scaleElem.normWidth === undefined) {
            scaleElem.normWidth = scaleElem.width * scaleElem.normFontSize / scaleElem.fontSize;
        }

        scaleElem.width = scaleElem.normWidth * scaleElem.fontSize / scaleElem.normFontSize;
        scaleElem.position = {
            x: scaleElem.normPosition.x * scaleRatio,
            y: scaleElem.normPosition.y * scaleRatio,
        };
        return scaleElem;
    }, [scaleRatio]);



    const findElementByLocation = useCallback((normXY, scaleRatio) => {
        let q = isImageMode ? images : texts;
        //let posField = this.isImageMode() ? "position" : "normPosition";
        const margin = 5; //this.isTextMode() && this.state.fontSize > 60 ? 0 : 5 / scaleRatio


        for (let i = q.length - 1; i >= 0; i--) {
            const elem = isImageMode ? imageScale2Norm(q[i]) : q[i];

            trace("findElementByLocation", elem.text)
            trace("np", elem.normPosition.x, elem.normPosition.y)
            trace("normXY", normXY.x, normXY.y)
            trace("height", elem.height, "width", elem.width, elem.normWidth, scaleRatio)

            const elemY = elem.normPosition.y;
            const normHeight = elem.height;/// this.state.scaleRatio;
            // trace("y-params",
            //   "elemY < normXY.y + 10 + margin", (elemY < normXY.y + 10 + margin) ? true : false,
            //   elemY, normXY.y,
            //   "elemY + elem.height > normXY.y + 10 - margin", (elemY + elem.height > normXY.y + 10 - margin) ? true : false)
            let foundY = elemY < normXY.y + 10 + margin && elemY + normHeight > normXY.y + 10 - margin;
            trace("findElementByLocation eng", elem.text, foundY ? "foundY " + elem.text : "notFoundY")
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
                    trace("findElementByLocation eng found!")
                    return q[i];
                }
            }
        }

        return undefined;
    }, [texts, images, isImageMode]);

    const canvasTexts = useCallback(() => texts,[texts]);


    useImperativeHandle(ref, () => ({
        findElementByLocation,
        canvasTexts,
        canvas,
    }),
        [findElementByLocation,canvasTexts]);

    // Canvas Update
    useEffect(() => {
        if (!canvas || !canvas.current || !layoutReady)
            return;

        //trace("New UpdateCanvas", "ratio", scaleRatio, "zoom", zoom)

        let q = queue.getAll();
        let canvasTexts = [];
        let canvasImages = [];
        let paths = [];
        let table = undefined;

        for (let i = 0; i < q.length; i++) {
            if (q[i].type === 'text') {
                const txtElem = txtElemNorm2Scale(q[i].elem)

                //first try to find same ID and replace, or add it
                let found = false;

                for (let j = 0; j < canvasTexts.length; j++) {
                    if (canvasTexts[j].id === txtElem.id) {
                        canvasTexts[j] = txtElem;
                        found = true;
                        break;
                    }
                }
                if (!found && txtElem.id != currentTextElemId) {
                    //avoid showing the current edited text
                    canvasTexts.push(txtElem);
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
                table = q[i].elem;
            } else if (q[i].type === 'tableDelete') {
                table = undefined;
            }
        }

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

                if (table) {
                    if (isTableMode && TableResizeState) {
                        table = ResizeTable(table, TableResizeState, width, height);
                    }

                    const size = table.size;
                    const tableWidth = table.width; // isTableMode ? table.width  : table.width;
                    let style = table.style || "0,0";
                    const styles = style.split(",")
                    const dash = parseInt(styles[0] * tableWidth); //isTableMode ? 10 : 0;
                    const dashGap = parseInt(styles[1] * tableWidth) //isTableMode ? 5 :0 style[1];

                    if (isTableMode) {

                        // if (!TableResizeState) {
                        //     setTimeout(() => {
                        //         setTablePhase(oldPhase => {
                        //             if (oldPhase === 9) {
                        //                 return 0.;
                        //             }
                        //             return oldPhase + 3;
                        //         });
                        //     }, 200);
                        // }
                    }

                    const addLength = table.width / 4;
                    for (let c = 0; c < table.verticalLines.length; c++) {
                        let x = table.verticalLines[c] + addLength; 


                        const path = {
                            path: {
                                id: table.id + 100 + c,
                                color: table.color,
                                width: tableWidth,
                                data: [
                                    (x + "," + (table.horizontalLines[0] - addLength)),
                                    (x + "," + (table.horizontalLines[table.horizontalLines.length - 1] + addLength)),
                                    (x + "," + (table.horizontalLines[table.horizontalLines.length - 1] + addLength)),
                                ],
                                dash, dashGap, phase: tablePhase
                            },
                            size
                        }

                        canvas.current?.addPath(path, width, height);
                        const stat = idsStatus.find(idStat => idStat.id == path.path.id);
                        if (stat) {
                            stat.exists = true;
                        }
                    }

                    for (let r = 0; r < table.horizontalLines.length; r++) {
                        const y = table.horizontalLines[r]; 

                        const path = {
                            path: {
                                id: table.id + 200 + r,
                                color: table.color,
                                width: tableWidth,
                                data: [
                                    (table.verticalLines[0] + "," + y),
                                    (table.verticalLines[table.verticalLines.length - 1] + "," + y),
                                    (table.verticalLines[table.verticalLines.length - 1] + "," + y)
                                ],
                                dash, dashGap, phase: tablePhase
                            },
                            size
                        }
                        canvas.current?.addPath(path, width, height);
                        const stat = idsStatus.find(idStat => idStat.id == path.path.id);
                        if (stat) {
                            stat.exists = true;
                        }
                    }
                }

                // delete those paths who are no longer exists in the queue
                idsStatus.filter(idStat => !idStat.exists).forEach(idStat => canvas.current?.deletePath(idStat.id));
                resolve()
            }))
        ]
        Promise.all(waitFor).then(() => AfterRender(revision));

        setTexts(canvasTexts);
        setImages(canvasImages);
    }, [revision, scaleRatio, currentTextElemId, width, height, isTableMode, tablePhase, TableResizeState, Table]);

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