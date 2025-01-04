import { GestureResponderHandlers, View } from "react-native";
import { SketchPoint } from "./types";
import IconIonic from 'react-native-vector-icons/Ionicons';
import IconMCI from 'react-native-vector-icons/MaterialCommunityIcons';

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
    return <View style={[
        style,
        { position: "absolute", left: position[0], top: position[1], zIndex: 1000 }]}
        {...panResponderHandlers}
        onStartShouldSetResponder={(e) => {
            onSetContext?.()
            return panResponderHandlers?.onStartShouldSetResponder?.(e) || false;
        }}

    >
        {icon == "resize-bottom-right" ?
            <IconMCI name={icon} size={size} color={color} />
            : <IconIonic name={icon} size={size} color={color} />}
    </View>
}