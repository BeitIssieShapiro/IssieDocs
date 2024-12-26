import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
import {
    Animated,
    PanResponder,
    View,
    StyleSheet,
} from 'react-native';
import { trace } from './log';
import { genID } from './utils';

// Context for Drag and Drop
const DragDropContext = createContext();

export const DDProvider = ({ children }) => {
    const targets = useRef([]); // Keeps track of all targets

    const registerTarget = (id, desc, bounds, onDrop, onDragEnter, onDragExit) => {
        const target = targets.current.find((t) => t.id === id);
        if (target) {
            trace("updating a registered Target", id, desc)

            target.bounds = bounds;
            target.onDrop = onDrop;
            target.onDragEnter = onDragEnter;
            target.onDragExit = onDragExit;
            return;
        }
        trace("registerTarget", id, desc)
        targets.current.push({ id, desc, bounds, onDrop, onDragEnter, onDragExit });
    };

    const unregisterTarget = (id) => {
        trace("unregisterTarget", id)
        targets.current = targets.current.filter((t) => t.id !== id);
    };

    const findTarget = (x, y) => {
        return targets.current.find(
            (t) =>
                x > t.bounds.x &&
                x < t.bounds.x + t.bounds.width &&
                y > t.bounds.y &&
                y < t.bounds.y + t.bounds.height
        );
    }

    const checkHover = (x, y) => {
        const hoverOnItem = findTarget(x, y);
        targets.current.forEach(t => {
            //trace(`hover? ''`, t.bounds.y, y)
            if (t == hoverOnItem) {
                if (t.hover) return;
                t.hover = true;
                trace("OnDragEnter", t.id)
                t.onDragEnter?.();
            } else {
                if (t.hover) {
                    t.hover = false;
                    trace("OnDragExit", t.id)
                    t.onDragExit?.();
                }
            }
        })

        return hoverOnItem
    };

    const handleDrop = (x, y, dragState) => {
        const target = findTarget(x, y);
        targets.current.forEach(t => {
            if (t.hover) {
                t.onDragExit && t.onDragExit();
            }
            t.hover = false
        });

        if (target && target.onDrop) {
            return target.onDrop(dragState);
        }
        return false;
    };

    return (
        <DragDropContext.Provider
            value={{
                registerTarget,
                unregisterTarget,
                checkHover,
                handleDrop,
            }}
        >
            {children}
        </DragDropContext.Provider>
    );
};

export const useDragDrop = () => useContext(DragDropContext);

export const DDView = ({
    id,
    children,
    onStartDrag,
    onDrop,
    dragState,
    onDragEnter,
    onDragExit,
    dragHoverColor = 'rgba(0, 128, 255, 0.2)',
    style,
    isTarget = false,
    isDragSource = true,
    ...props
}) => {
    const {
        registerTarget,
        unregisterTarget,
        checkHover,
        handleDrop,
    } = useDragDrop();
    const [isDragging, setIsDragging] = useState(false);
    const [isPanResponderActive, setIsPanResponderActive] = useState(false);

    const activationTimeout = useRef(null);
    const pan = useRef(new Animated.ValueXY()).current; // Position for the ghost frame
    const state = useRef(dragState);

    const viewRef = isTarget ? useRef(null) : undefined;
    const originalLayout = useRef(null); // Save the layout of the original view
    const localID = useRef(genID());

    useEffect(() => {
        return () => unregisterTarget(localID.current);
    }, []);


    useEffect(() => {
        state.current = dragState;
    }, [dragState]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: (e, gestureState) => isDragSource,
            onMoveShouldSetPanResponder: (e, gestureState) => isDragSource,
            onPanResponderGrant: (e, gestureState) => {
                // Delay activation of the PanResponder
                const { pageX, pageY } = e.nativeEvent;
                activationTimeout.current = setTimeout(() => {
                    setIsDragging(true);

                    // Offset the ghost frame to the current touch position
                    trace("x-init", pageX, originalLayout.current.x)
                    pan.setOffset({
                        // x: pageX - gestureState.dx - originalLayout.current.x,
                        // y: pageY - gestureState.dy - originalLayout.current.y,
                        x: originalLayout.current.x,
                        y: originalLayout.current.y,
                    });
                    pan.setValue({ x: 0, y: 0 });

                    onStartDrag?.();
                }
                    , 700); // Delay of 300ms

            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                {
                    useNativeDriver: false,
                    listener: (e, gestureState) => {
                        const { moveX, moveY, x0, y0 } = gestureState;
                        checkHover(moveX, moveY);
                    },
                }
            ),
            onPanResponderRelease: (e, gestureState) => {
                if (isDragSource) {
                    const { moveX, moveY } = gestureState;
                    if (handleDrop(moveX, moveY, state.current)) {
                        setIsDragging(false);
                    } else {
                        Animated.timing(pan, {
                            toValue: { x: 0, y: 0 },
                            duration: 300,
                            useNativeDriver: false,
                        }).start(() => {
                            setIsDragging(false);

                        });
                    }
                }
            },
            onPanResponderTerminate: () => {
                // Clean up if gesture is interrupted
                clearTimeout(activationTimeout.current);
                setIsPanResponderActive(false);
            },
        })
    ).current;

    return (
        <>
            {/* Actual View */}
            <View
                ref={viewRef}
                style={[
                    styles.view,
                    style,
                ]}
                onLayout={(e) => {
                    const { x, y, width, height } = e.nativeEvent.layout;
                    originalLayout.current = { x, y, width, height };

                    trace("Layout called", id, x, y)
                    if (isTarget) {
                        if (viewRef?.current) {
                            viewRef.current.measureInWindow((absX, absY, width, height) => {
                                registerTarget(localID.current, id, { x: absX, y: absY, width, height },
                                    onDrop, onDragEnter, onDragExit);
                            });
                        } else {
                            trace('layout called, not yet ref', id)
                        }
                    }
                }}
                {...(isDragSource ? panResponder.panHandlers : {})} // Apply handlers only if a isDragSource
                {...props}
            >
                {children}
            </View>

            {/* Ghost Frame */}
            {isDragging && (
                <Animated.View
                    style={[
                        styles.ghostFrame,
                        {
                            width: originalLayout.current?.width,
                            height: originalLayout.current?.height,
                            transform: [{ translateX: pan.x }, { translateY: pan.y }],
                        },
                    ]}
                    {...panResponder.panHandlers} // Ghost handles dragging
                >
                    {/* {children} */}
                </Animated.View>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    view: {
        position: 'relative',
    },
    ghostFrame: {
        borderColor: "orange",
        borderWidth: 2,
        position: 'absolute',
        zIndex: 9999,
        elevation: 9999,
    },
});