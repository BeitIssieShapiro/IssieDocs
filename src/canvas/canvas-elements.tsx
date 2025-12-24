import { GestureResponderHandlers, PanResponder, View } from "react-native";
import { Offset, SketchPoint } from "./types";
import Animated from "react-native-reanimated";
import { MyIcon } from "../common/icons";
import { ReactNode, useEffect, useRef, useState } from "react";
import React from "react";
import { trace } from "../log";
import { semanticColors } from "../elements";

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
    kbHeight: number;
    top: number;
    width: number;
    originalBgImageHeight: number;
    ratio: number;
    zoom: number;
    onScroll: (amount: number) => void;
    onScrollEnd: () => void;
}
export function CanvasScroll({ offset, top, width, canvasHeight, kbHeight, originalBgImageHeight, ratio, onScroll, onScrollEnd, zoom }: CanvasScrollProps) {
    const yOffsetRef = useRef(0);
    const yInitialOffsetRef = useRef(0);

    useEffect(() => {
        yOffsetRef.current = offset.y;
    }, [offset])

    const [scrollRatio, setScrollRatio] = useState<number>(1);
    const scrollRatioRef = useRef(originalBgImageHeight / (canvasHeight - kbHeight));

    useEffect(() => {
        scrollRatioRef.current = (originalBgImageHeight - kbHeight) / canvasHeight;
        setScrollRatio(scrollRatioRef.current)
    }, [originalBgImageHeight, canvasHeight, kbHeight])

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false, // Do not activate on touch start
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                trace("Move canvas scroll onMoveShouldSet", { dy: gestureState.dy, scrollRatio: scrollRatioRef.current, diff: originalBgImageHeight - canvasHeight })
                const threshold = 2; // Minimum movement in pixels to activate drag
                return Math.abs(gestureState.dx) > threshold || Math.abs(gestureState.dy) > threshold;
            },
            onPanResponderGrant: (e) => {
                yInitialOffsetRef.current = yOffsetRef.current;
            },
            onPanResponderMove: (e, gestureState) => {
                trace("Move canvas scroll", { yInitialOffset: yInitialOffsetRef.current, dy: gestureState.dy, sr: scrollRatioRef.current, zoom })
                onScroll(yInitialOffsetRef.current - gestureState.dy / scrollRatioRef.current * zoom)
            },
            onPanResponderRelease: (e, gestureState) => {
                onScrollEnd()
            },
        })
    ).current;
    if (originalBgImageHeight == canvasHeight) return null;


    const scrollHeight = originalBgImageHeight - kbHeight;
    const markerSize = scrollRatio * scrollHeight
    const markerTop = (offset.y / canvasHeight) * scrollHeight * ratio ;
    trace("scroll render", { canvasHeight, ratio, kbHeight, originalBgImageHeight })
    return <View
        {...panResponder.panHandlers}
        style={{
            position: "absolute", top, width, height: scrollHeight
        }}
    >
        <View style={{
            width: 16, position: "absolute", borderRadius: 6,
            left: 10, top: 0, height: scrollHeight, backgroundColor: "lightblue",
        }} />
        <View style={{
            width: 10, position: "absolute", borderRadius: 6,
            left: 13, top: -markerTop + 3, height: markerSize - 6, backgroundColor: semanticColors.actionButton,
        }} />

    </View>

}