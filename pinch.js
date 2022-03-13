import { trace } from "./log";

let pinchState = {};

export function pinchEnd(obj) {
    pinchState.isZooming = false;
    pinchState.isResizing = false;
}

export function processPinch(obj, x1, y1, x2, y2, changeState) {
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

        //trace("pinch: 1:", x1, ",", y1, " 2:", x2, ",", y2)
        const deltaZoom = pinchState.initialZoom / zoom;

        let xOffset = zoom == 1 ? 0 : pinchState.initialLeft * deltaZoom - pinchState.initialX * (1 - deltaZoom) - (pinchState.initialX - center.x) * deltaZoom;
        let yOffset = zoom == 1 ? 0 : pinchState.initialTop * deltaZoom - pinchState.initialY * (1 - deltaZoom) - (pinchState.initialY - center.y) * deltaZoom;

        //trace("Xos", xOffset, "Yos", yOffset, "Ileft", pinchState.initialLeft, "Xcenter", center.x, "dZoom", deltaZoom)
        if (xOffset > 0 || zoom === 1) {
            xOffset = 0;
        }

        if (yOffset > 0) {
            yOffset = 0;
        }

        changeState({
            zoom,
            xOffset,
            yOffset
        });
    }
}

export function processResize(obj, x, y) {
    if (!pinchState.isResizing) {
        pinchState = {
            isResizing: true,
            initialWidth: obj.state.currentImageElem.width,
            initialHeight: obj.state.currentImageElem.height,
            initialX: obj.state.xText,
            initialY: obj.state.yText,
            aspectRatio: obj.state.currentImageElem.width / obj.state.currentImageElem.height,
        }
    }

    // keep same aspect ratio:
    const delta = Math.max(x, y);

    return {
        width: pinchState.initialWidth + delta,
        height: pinchState.initialHeight + delta / pinchState.aspectRatio,
        x: pinchState.initialX + delta,
        y: pinchState.initialY,
    };
}

export function calcDistance(x1, y1, x2, y2) {
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

