import RNSketchCanvas from 'issie-sketch-canvas';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { colors } from './elements';
import { trace } from './log';


const DEFAULT_STROKE_WIDTH = 5;

function Canvas({
    revision,
    layoutReady,
    width, height,
    zoom,
    scaleRatio,
    isBrushMode,
    isImageMode,
    imagePath,
    SketchEnd,
    SketchStart,
    AfterRender,
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



    const findElementByLocation = useCallback((normXY) => {
        let q = isImageMode ? images : texts;
        //let posField = this.isImageMode() ? "position" : "normPosition";
        const margin = 5; //this.isTextMode() && this.state.fontSize > 60 ? 0 : 5 / scaleRatio


        for (let i = q.length - 1; i >= 0; i--) {
            const elem = isImageMode ? imageScale2Norm(q[i]) : q[i];

            trace("findElementByLocation", elem.text)
            trace("np", elem.normPosition.x, elem.normPosition.y)
            trace("normXY", normXY.x, normXY.y)
            trace("height", elem.height, "width", elem.width)

            const elemY = elem.normPosition.y;
            const normHeight = elem.height;/// this.state.scaleRatio;
            // trace("y-params",
            //   "elemY < normXY.y + 10 + margin", (elemY < normXY.y + 10 + margin) ? true : false,
            //   elemY, normXY.y,
            //   "elemY + elem.height > normXY.y + 10 - margin", (elemY + elem.height > normXY.y + 10 - margin) ? true : false)
            let foundY = elemY < normXY.y + 10 + margin && elemY + normHeight > normXY.y + 10 - margin;
            trace("findElementByLocation eng", elem.text, foundY ? "foundY " + elem.text : "notFoundY")
            const normWidth = elem.width;// /  this.state.scaleRatio;

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

    useImperativeHandle(ref, () => ({
        findElementByLocation,
        canvas,
    }),
        [findElementByLocation]);

    // Canvas Update
    useEffect(() => {
        if (!canvas || !canvas.current || !layoutReady)
            return;

        trace("New UpdateCanvas", "ratio", scaleRatio, "zoom", zoom)

        let q = queue.getAll();
        let canvasTexts = [];
        let canvasImages = [];
        let paths = [];
        //canvas.current.clear();
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
            }
        }

        canvas.current?.getImageIds((ids) => {
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
        });

        canvas.current?.getPathIds((ids) => {
            trace("path ids :", JSON.stringify(ids))

            const idsStatus = ids ? ids.map(id => ({ id, exists: false })) : [];
            paths.forEach(path => {
                canvas.current?.addPath(path, width, height);
                const stat = idsStatus.find(idStat => idStat.id == path.path.id);
                if (stat) {
                    stat.exists = true;
                }
            });
            // delete those paths who are no longer exists in the queue
            idsStatus.filter(idStat => !idStat.exists).forEach(idStat => canvas.current?.deletePath(idStat.id));

            // setTimeout(() => {
            //     paths.forEach(path => canvas.current?.addPath(path))
            //     AfterRender(revision)
            // }, 1);

        });


        setTexts(canvasTexts);
        setImages(canvasImages);
    }, [revision, scaleRatio, currentTextElemId, width, height]);

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
            onSketchStart={SketchStart}
            strokeColors={[{ color: colors.black }]}
            defaultStrokeIndex={0}
            defaultStrokeWidth={DEFAULT_STROKE_WIDTH}
        />);
}

export default forwardRef(Canvas);