import { PanResponder } from "react-native";


export function getElementMovePanResponder({
    getState,
    onMoveElement,
    shouldMoveElement, //callback
    screen2ViewPortX,
    screen2ViewPortY,
    onRelease,
    dragIconSize
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

            const leftDiff = x - getState().viewPortRect.width;
            if (leftDiff > 0) {
                x = getState().viewPortRect.width;
                xOffset -= leftDiff;
            }

            const bottomDiff = y - getState().viewPortRect.height + getState().keyboardHeight
            if (bottomDiff > 0) {
                y = getState().viewPortRect.height - getState().keyboardHeight;
                yOffset -= bottomDiff / 2 //divided by 2 to slow down
            }

            if (y < dragIconSize / 2) {
                if (yOffset < 0) {
                    yOffset -= (y - dragIconSize / 2) / 2 //divided by 2 to slow down
                    if (yOffset > 0) {
                        yOffset = 0;
                    }
                }
                y = dragIconSize / 2;
            }
            x -= dragIconSize / 2
            y -= dragIconSize / 2
            if (x < 25) {
                if (xOffset < 0) {
                    xOffset -= (x - dragIconSize / 2) / 2 //divided by 2 to slow down
                }
                x = 25;
            }

            onMoveElement({
                x, y, yOffset,xOffset
            })

        },
        onPanResponderRelease: (evt, gestureState) => {
            onRelease();
        }
    });
}
