// PinchSession.ts

import { Offset, SketchPoint } from "./types";

export interface PinchHelperEvent {
    zoom: number;
    offset: Offset;
}

export interface ResizeEvent {
    width: number;
    height: number;
    x: number;
    y: number;
}

/** The relevant bits of the "state" you need for pinch & resize. */
export interface PinchInitialState {
    initialOffset: Offset,
    zoom: number;
    minZoom: number;
    p1: SketchPoint
    p2: SketchPoint;
}

interface PinchState {
    /** For pinch (zoom) */
    initialDistance: number;
    initialOffset: Offset;
    initialPosition: Offset;
    initialZoom: number;

    /** For resize */
    initialWidth?: number;
    initialHeight?: number;
    aspectRatio?: number;
    initialXText?: number;
    initialYText?: number;

}

export class PinchSession {
    private pinchState: PinchState;

    constructor(
        private initialObj: PinchInitialState,
        /** Called whenever pinch/zoom changes are calculated */
        private onPinchUpdate?: (event: PinchHelperEvent) => void,
    ) {
        const [x1, y1] = initialObj.p1
        const [x2, y2] = initialObj.p2
        const distance = PinchSession.calcDistance(x1, y1, x2, y2);
        const center = PinchSession.calcCenter(x1, y1, x2, y2);

        this.pinchState = {
            initialOffset: initialObj.initialOffset,
            initialZoom: initialObj.zoom,
            initialDistance: distance,
            initialPosition: center,
        };
    }

    /**
     * Call this on every pinch move event (two-finger gesture).
     * x1,y1 => first finger; x2,y2 => second finger
     */
    public processPinch(p1: SketchPoint, p2: SketchPoint): void {
        const [x1, y1] = p1
        const [x2, y2] = p2


        const distance = PinchSession.calcDistance(x1, y1, x2, y2);
        const center = PinchSession.calcCenter(x1, y1, x2, y2);

        const {
            initialDistance,
            initialOffset,
            initialPosition,
            initialZoom,
        } = this.pinchState;


        // Ratio of current distance to initial distance
        const touchZoom = distance / initialDistance;

        let newZoom = touchZoom * initialZoom;

        if (newZoom < this.initialObj.minZoom) {
            newZoom = this.initialObj.minZoom;
        }

        const shouldMove = newZoom !== 1

        let x = shouldMove ?
            initialOffset.x - (initialPosition.x - center.x) :
            0;

        let y = shouldMove ?
            initialOffset.y - (initialPosition.y - center.y) :
            0;

        // Don't allow positive offset or else the image slides offscreen
        if (x > 0 || newZoom === 1) {
            x = 0;
        }
        if (y > 0) {
            y = 0;
        }

        // Fire the event with new pinch results
        if (this.onPinchUpdate) {
            this.onPinchUpdate({
                zoom: newZoom,
                offset: { x, y }
            });
        }
    }


    // ---------------------------------------------------------------------------
    //                          STATIC UTILITIES
    // ---------------------------------------------------------------------------
    private static calcDistance(x1: number, y1: number, x2: number, y2: number): number {
        const dx = Math.abs(x1 - x2);
        const dy = Math.abs(y1 - y2);
        return Math.sqrt(dx * dx + dy * dy);
    }

    private static calcCenter(x1: number, y1: number, x2: number, y2: number): { x: number; y: number } {
        function middle(p1: number, p2: number) {
            return p1 > p2 ? p1 - (p1 - p2) / 2 : p2 - (p2 - p1) / 2;
        }
        return {
            x: middle(x1, x2),
            y: middle(y1, y2),
        };
    }
}