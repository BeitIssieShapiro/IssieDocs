import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
import {
    Animated,
    PanResponder,
    View,
    StyleSheet,
    ScrollView,
    Modal,
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
        //trace("registerTarget", id, desc)
        targets.current.push({ id, desc, bounds, onDrop, onDragEnter, onDragExit });
    };

    const unregisterTarget = (id) => {
        //trace("unregisterTarget", id)
        targets.current = targets.current.filter((t) => t.id !== id);
    };

    const findTarget = (x, y) => {
        return targets.current.find(
            (t) => {
                // trace(`find?`, x, y, t.bounds.scrollPos?.current)
                const xOffset = t.bounds.scrollPos && t.bounds.scrollPos.current ? t.bounds.scrollPos.current.x : 0;
                const yOffset = t.bounds.scrollPos && t.bounds.scrollPos.current ? t.bounds.scrollPos.current.y : 0;
                return x > t.bounds.x - xOffset &&
                    x < t.bounds.x - xOffset + t.bounds.width &&
                    y > t.bounds.y - yOffset &&
                    y < t.bounds.y - yOffset + t.bounds.height
            }
        );
    }

    const checkHover = (id, x, y) => {
        const hoverOnItem = findTarget(x, y);

        targets.current.forEach(t => {
            //trace(`hover? ''`, t.bounds.y, y)
            if (t == hoverOnItem) {
                if (t.hover || t.id == id) return;
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

    const handleDrop = (id, x, y, dragState) => {
        const target = findTarget(x, y);
        if (target?.id == id) return; // drop on itself
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

const scrollThreashold = 10;

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
    const [absPosition, setAbsPosition] = useState({ x: 0, y: 0 });
    const activationTimeout = useRef(null);
    const isPanResponderActive = useRef(false);
    const pan = useRef(new Animated.ValueXY()).current; // Position for the ghost frame
    const state = useRef(dragState);

    const viewRef = useRef(null);
    const originalLayout = useRef(null); // Save the layout of the original view
    const localID = useRef(genID());

    const scrollPos = useScrollContext();

    useEffect(() => {
        return () => unregisterTarget(localID.current);
    }, []);


    useEffect(() => {
        state.current = dragState;
    }, [dragState]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponderCapture: (e, gestureState) => {
                //onStartShouldSetPanResponder: (e, gestureState) => {
                isPanResponderActive.current = false;
                if (!isDragSource) return false;
                activationTimeout.current = setTimeout(() => {
                    trace("DDView ready to drag")
                    isPanResponderActive.current = true;
                }, 700);

                return false; // Let parent take precedence initially
            },
            onMoveShouldSetPanResponder: (e, gestureState) => {
                if (isPanResponderActive.current)
                    if (Math.abs(gestureState.dx) < scrollThreashold || Math.abs(gestureState.dy) < scrollThreashold) {
                        trace("DDView about to take the panResponder")
                        setIsDragging(true);
                        return true;
                    } else {
                        isPanResponderActive.current = false;
                    }
                return false;
            },
            onPanResponderTerminationRequest: () => {
                trace("DDView onPanResponderTerminationRequest")
                return !isPanResponderActive.current
            },
            // onMoveShouldSetPanResponder: (e, gestureState) => {
            //     // trace("DDView onMoveShouldSetPanResponder", isPanResponderActive, gestureState.dx, gestureState.dy)
            //     // Detect significant drag gesture
            //     if (isPanResponderActive.current) {
            //         trace("DDView moveShouldSet")
            //         return true; // Allow PanResponder to take control
            //     }
            //     return false; // Let ScrollView continue handling
            // },
            onPanResponderGrant: (e, gestureState) => {
                trace("DDView pan granted")
                setIsDragging(true);

                // Offset the ghost frame to the current touch position
                pan.setOffset({
                    x: 0,
                    y: 0
                });
                pan.setValue({ x: 0, y: -scrollPos?.current.y || 0 });

                onStartDrag?.();

            },
            // onPanResponderMove: Animated.event(
            //     [null, { dx: pan.x, dy: pan.y }],
            //     {
            //         useNativeDriver: false,
            //         listener: (e, gestureState) => {
            //             const { moveX, moveY, x0, y0 } = gestureState;
            //             checkHover(localID.current, moveX, moveY);
            //         },
            //     }
            // ),
            onPanResponderMove: (e, gestureState) => {
                const adjustedDy = gestureState.dy - (scrollPos?.current.y || 0); // Adjust for scroll offset
                pan.setValue({ x: gestureState.dx, y: adjustedDy }); // Update pan manually
            
                const { moveX, moveY } = gestureState;
                checkHover(localID.current, moveX, moveY);
            },
            onPanResponderRelease: (e, gestureState) => {
                if (isDragSource) {
                    const { moveX, moveY } = gestureState;
                    if (handleDrop(localID.current, moveX, moveY, state.current)) {
                        setIsDragging(false);
                    } else {
                        Animated.timing(pan, {
                            toValue: { x: 0, y: -scrollPos?.current.y || 0 },
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
                trace("DDView cleanup")
                clearTimeout(activationTimeout.current);
                isPanResponderActive.current = false;
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

                    if (viewRef.current) {
                        viewRef.current.measureInWindow((absX, absY, width, height) => {
                            if (isTarget) {
                                registerTarget(localID.current, id, { x: absX, y: absY, width, height, scrollPos },
                                    onDrop, onDragEnter, onDragExit);
                            }
                            setAbsPosition({ x: absX, y: absY });
                        });
                    } else {
                        trace('layout called, not yet ref', id)
                    }

                }}
                {...(isDragSource ? panResponder.panHandlers : {})} // Apply handlers only if a isDragSource
                {...props}
            >
                {children}
            </View >

            {/* Ghost Frame */}
            {
                isDragging && (
                    <Modal transparent={true} animationType="none">
                        <Animated.View
                            style={[
                                styles.ghostFrame,
                                {
                                    left: absPosition.x,
                                    top: absPosition.y,
                                    width: originalLayout.current?.width,
                                    height: originalLayout.current?.height,
                                    transform: [{ translateX: pan.x }, { translateY: pan.y }],
                                },
                            ]}
                            {...panResponder.panHandlers} // Ghost handles dragging
                        >
                            {children}
                        </Animated.View>
                    </Modal>
                )
            }
        </>
    );
};


export const DDScrollView = ({ children, style, contentContainerStyle }) => {
    const scrollOffset = useRef({ x: 0, y: 0 }); // Track scroll offset
    const [scrollY, setScrollY] = useState(0);
    const innerViewSizeY = useRef(1000);
    const hostHeight = useRef(1000);
    useEffect(() => {
        scrollOffset.current.y = scrollY;
    }, [scrollY])

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: (e, gestureState) => false,
            onMoveShouldSetPanResponder: (e, gestureState) => {
                if (innerViewSizeY.current <= hostHeight.current) return false;

                if (Math.abs(gestureState.dx) > scrollThreashold || Math.abs(gestureState.dy) > scrollThreashold) {
                    trace("Scroll take the panResponder")
                    return true;
                }
                return false;
            },
            onPanResponderGrant: () => {
                scrollOffset.current.y0 = scrollOffset.current.y;
            },
            onPanResponderMove: (e, gestureState) => {
                let y = scrollOffset.current.y0 - gestureState.dy;
                if (y < 0) {
                    y = 0;
                } else if (y > innerViewSizeY.current - hostHeight.current + 15) {
                    y = innerViewSizeY.current - hostHeight.current + 15;
                }
                setScrollY(y)
            },
            onPanResponderRelease: () => {

            },
        })
    ).current;


    return (
        <View {...panResponder.panHandlers} style={[styles.scrollContainer, style]}
            onLayout={(e) => {
                const { x, y, width, height } = e.nativeEvent.layout;
                hostHeight.current = height;
            }}
        >
            <View style={[contentContainerStyle, {
                transform: [{ translateY: -scrollY }]
            }]}
                onLayout={(e) => {
                    const { x, y, width, height } = e.nativeEvent.layout;
                    innerViewSizeY.current = height;
                }}>
                <ScrollProvider scrollPos={scrollOffset}>
                    {children}
                </ScrollProvider>
            </View>
        </View>
    );
};


const ScrollContext = createContext();

export const ScrollProvider = ({ scrollPos, children }) => {
    return (
        <ScrollContext.Provider value={scrollPos}>
            {children}
        </ScrollContext.Provider>
    );
};

export const useScrollContext = () => useContext(ScrollContext);


const styles = StyleSheet.create({
    scrollContainer: {
        flex: 1,
        overflow: "hidden",
    },
    view: {
        position: 'relative',
    },
    ghostFrame: {
        position: 'absolute',
        zIndex: 9999,
        elevation: 9999,
    },
});