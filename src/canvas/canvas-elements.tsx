import { GestureResponderHandlers, View } from "react-native";
import { SketchPoint } from "./types";
import Animated from "react-native-reanimated";
import { MyIcon } from "../common/icons";

interface MoveIconProps {
    style: any;
    position: SketchPoint;
    size: number;
    panResponderHandlers: GestureResponderHandlers;
    onSetContext?: () => void;
    icon: string;
    color: string;

}

export function MoveIcon({ style, position, size, panResponderHandlers, onSetContext, icon, color }: MoveIconProps) {
    return <Animated.View style={[
        style,
        { position: "absolute", left: position[0], top: position[1], zIndex: 1000 }]}
        {...panResponderHandlers}
        onStartShouldSetResponder={(e) => {
            onSetContext?.()
            return panResponderHandlers?.onStartShouldSetResponder?.(e) || false;
        }}

    >
        {icon == "resize-bottom-right" ?
            <MyIcon info={{ type: "MDI", name: icon, size, color }} /> :
            <MyIcon info={{ type: "Ionicons", name: icon, size, color }} />
        }
    </Animated.View>
}