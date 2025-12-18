import { GestureResponderHandlers, View } from "react-native";
import { SketchPoint } from "./types";
import Animated from "react-native-reanimated";
import { MyIcon } from "../common/icons";
import { ReactNode, useEffect, useState } from "react";
import React from "react";

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

const sequareSize = 35;

export function Lines({ height }: { height: number }) {
    const [lines, setLines] = useState<ReactNode[]>([])
    useEffect(() => {
        const _lines: ReactNode[] = [];
        let h = sequareSize;
        while (h < height) {
            _lines.push(<View
                key={h}
                style={{
                    position: "absolute",
                    top: h, width: "100%",
                    height: 2,
                    borderStyle: "solid",
                    borderColor: "lightblue",
                    borderWidth: 1
                }}
            />)
            h += sequareSize;
        }
        setLines(_lines);
    }, [height]);

    return lines;
}

export function VLines({ width }: { width: number }) {
    const [lines, setLines] = useState<ReactNode[]>([])
    useEffect(() => {
        const _lines: ReactNode[] = [];
        let h = sequareSize;
        while (h < width) {
            _lines.push(<View
                key={h}
                style={{
                    position: "absolute",
                    left: h, width: 2,
                    height: "100%",
                    borderStyle: "solid",
                    borderColor: "lightblue",
                    borderWidth: 1
                }}
            />)
            h += sequareSize;
        }
        setLines(_lines);
    }, [width]);

    return lines;
}