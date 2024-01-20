import { PanResponder } from "react-native";
import { trace } from "./log";
import { isRTL } from "./lang";


export function getElementMovePanResponder({
    getState,
    onMoveElement,
    shouldMoveElement, //callback
    screen2ViewPortX,
    screen2ViewPortY,
    onRelease,
    dragIconSize,
}) {
    return PanResponder.create({
        onStartShouldSetPanResponder: (evt, gestureState) => shouldMoveElement(evt, gestureState),
        onStartShouldSetPanResponderCapture: (evt, gestureState) => false,
        onMoveShouldSetPanResponder: (evt, gestureState) => shouldMoveElement(evt, gestureState),
        onMoveShouldSetPanResponderCapture: (evt, gestureState) => false,
        onPanResponderTerminationRequest: (evt, gestureState) => true,
        onPanResponderMove: (evt, gestureState) => {
            let x = screen2ViewPortX(gestureState.moveX);
            let y = screen2ViewPortY(gestureState.moveY);

            let yOffset = getState().yOffset;
            let xOffset = getState().xOffset;

            let repeat = undefined;
            const textElem = getState().currentTextElem;
            const rtl = textElem?.rtl || isRTL();

            const textWidth = textElem?.normWidth || 0;
            const textHeight = textElem?.height || 0;

            // X -Axis
            const rightDiff = x - getState().viewPortRect.width;
            if (rightDiff > 0) {
                trace("move-elem hit right side", rightDiff)
                x = getState().viewPortRect.width;
                xOffset -= 5;
                repeat = { xOffset: -5 }
            }

            trace("move left", "text width", textWidth * getState().scaleRatio)
            if (rtl &&
                (
                    xOffset < 0 && x - textWidth * getState().scaleRatio - 20 < 0 ||
                    x < dragIconSize / 2
                )) {
                trace("move-elem hit left side", rightDiff)
                if (xOffset < 0) {
                    xOffset += 5
                    repeat = { xOffset: 5 }
                    x = textWidth * getState().scaleRatio + 20;
                } else {
                    x = dragIconSize / 2;
                }
                
            }

            if (!rtl && x < 0) {
                trace("x-move-elem hit left side", rightDiff)
                if (xOffset < 0) {
                    xOffset += 5
                    repeat = { xOffset: 5 }
                }
                x = 0; // dragIconSize / 2;
            }

            // Y- Axis
            const bottomDiff = y - getState().viewPortRect.height + getState().keyboardHeight + textHeight - dragIconSize / 2
            trace("move bottomDiff", bottomDiff)
            if (bottomDiff > 0) {
                trace("move elem - hit bottom")
                y -= bottomDiff;
                yOffset -= 5;
                repeat = { yOffset: -5 }
            }

            if (y < dragIconSize / 2) {
                if (yOffset < 0) {
                    yOffset += 5
                    repeat = { yOffset: 5 }
                    //trace("move element - hit top", y, yOffset)
                    if (yOffset > 0) {
                        yOffset = 0;
                    }
                }
                y = dragIconSize / 2;
            }
            if (getState().mode !== 1) {
                x = x + (rtl ? -1 : 1) * (dragIconSize / 2)
                y -= dragIconSize / 2
            }

            onMoveElement({
                x, y, yOffset, xOffset, repeat
            })

        },
        onPanResponderRelease: (evt, gestureState) => {
            onRelease();
        }
    });
}
