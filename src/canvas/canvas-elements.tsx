import { GestureResponderHandlers, PanResponder, View } from "react-native";
import { Offset, SketchPoint } from "./types";
import Animated from "react-native-reanimated";
import { MyIcon } from "../common/icons";
import { ReactNode, useEffect, useRef, useState } from "react";
import React from "react";
import { trace } from "../log";

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

interface CanvasScrollProps {
    offset: Offset;
    canvasHeight: number;
    top: number;
    width: number;
    originalBgImageHeight: number;
    ratio: number;
    zoom: number;
    onScroll: (amount: number) => void;
    onScrollEnd: () => void;
}
const zeroPos = { dx: 0, dy: 0 }

export function CanvasScroll({ offset, top, width, canvasHeight, originalBgImageHeight, ratio, onScroll, onScrollEnd, zoom }: CanvasScrollProps) {
    if (originalBgImageHeight == canvasHeight) return null;
    const yOffsetRef = useRef(0);
    const yInitialOffsetRef = useRef(0);

    useEffect(() => {
        yOffsetRef.current = offset.y;
    }, [offset])

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false, // Do not activate on touch start
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                trace("Move canvas scroll onMoveShouldSet", gestureState.dy)
                const threshold = 2; // Minimum movement in pixels to activate drag
                return Math.abs(gestureState.dx) > threshold || Math.abs(gestureState.dy) > threshold;
            },
            onPanResponderGrant: (e) => {
                yInitialOffsetRef.current = yOffsetRef.current;
            },
            onPanResponderMove: (e, gestureState) => {
                trace("Move canvas scroll", gestureState.dy)
                onScroll(yInitialOffsetRef.current - gestureState.dy / scrollRatio * zoom)
            },
            onPanResponderRelease: (e, gestureState) => {
                onScrollEnd()
            },
        })
    ).current;


    const scrollRatio = originalBgImageHeight / canvasHeight
    const markerSize = scrollRatio * originalBgImageHeight
    const markerTop = offset.y * ratio * scrollRatio;
    return <View
        {...panResponder.panHandlers}
        style={{
            position: "absolute", top, width, height: canvasHeight
        }}
    >
        <View style={{
            width: 16, position: "absolute", borderRadius: 6,
            left: 10, top: 0, height: originalBgImageHeight, backgroundColor: "lightblue",
        }} />
        <View style={{
            width: 10, position: "absolute", borderRadius: 6,
            left: 13, top: -markerTop, height: markerSize, backgroundColor: "blue",
        }} />

    </View>

}