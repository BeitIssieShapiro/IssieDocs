import { trace } from "./log";

let pinchState = {};

export function pinchEnd(obj) {
    pinchState.isZooming = false;
}

export function processPinch(obj, x1, y1, x2, y2) {
    let distance = calcDistance(x1, y1, x2, y2);
    let center = calcCenter(x1, y1, x2, y2);

    if (!pinchState.isZooming) {

        pinchState = {
            isZooming: true,
            initialDistance: distance,
            initialX: center.x,
            initialY: center.y,
            initialTop: obj.state.yOffset,
            initialLeft: obj.state.xOffset,
            initialZoom: obj.state.zoom,
        }

    } else {
        let touchZoom = distance / pinchState.initialDistance;
        let zoom = touchZoom * pinchState.initialZoom > obj.state.minZoom
            ? touchZoom * pinchState.initialZoom : obj.state.minZoom;

        let deltaZoom = zoom - pinchState.initialZoom;
        let offset = calcOffsetByZoom(center, obj.state.canvasW, obj.state.canvasH, deltaZoom);
        trace("deltaZoom:", deltaZoom, "distance", distance, "center", center, "offset", offset)

        trace("pinch: 1:", x1, ",", y1, " 2:", x2, ",", y2)

        let dx = center.x - pinchState.initialX;
        let dy = center.y - pinchState.initialY;
        let xOffset = zoom == 1 ? 0 : pinchState.initialLeft + dx - offset.dx / 2;
        let yOffset = zoom == 1 ? 0 : pinchState.initialTop + dy - offset.dy / 2;
        if (xOffset > 0) {
            xOffset = 0;
        }

        if (yOffset > 0) {
            yOffset = 0;
        }

        obj.setState({
            zoom,
            xOffset,
            yOffset
        });
    }
}



function calcDistance(x1, y1, x2, y2) {
    let dx = Math.abs(x1 - x2)
    let dy = Math.abs(y1 - y2)
    return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
}

function calcCenter(x1, y1, x2, y2) {

    function middle(p1, p2) {
        return p1 > p2 ? p1 - (p1 - p2) / 2 : p2 - (p2 - p1) / 2;
    }

    return {
        x: middle(x1, x2),
        y: middle(y1, y2),
    };
}

function maxOffset(offset, windowDimension, imageDimension) {
    let max = windowDimension - imageDimension;
    if (max >= 0) {
        return 0;
    }
    return offset < max ? max : offset;
}

function calcOffsetByZoom(center, windowWidth, windowHeight, deltaZoom) {

    let xDiff = windowWidth - center.x;
    let yDiff = windowHeight - center.y;

    return {
        dx: xDiff * (deltaZoom),
        dy: yDiff * (deltaZoom),
    }
}