import React, { useState, useImperativeHandle } from 'react';
import {
    View, PanResponder, Alert, Text
} from 'react-native';
import Animated from 'react-native-reanimated'
import { getRowDirection, getRowDirections } from './lang';
import { trace } from './log';
var isNumber = function isNumber(value) {
    return value && typeof value === 'number' && isFinite(value);
}
const scrollWidth = 15;
function useMergeState(initialState) {
    const [state, setState] = useState(initialState);
    const setMergedState = newState =>
        setState(prevState => Object.assign({}, prevState, newState)
        );
    return [state, setMergedState];
}

export default function Scroller(props) {

    if (props.hidden) {
        return props.children;
    }

    if (props.layoutHost) {
        props.layoutHost.onLayout = (e) => {
            trace("scroller layout", e.nativeEvent.layout)
            setScrollState({ ...scrollState, childHeight: e.nativeEvent.layout.height });
        }
    }
    const [scrollState, setScrollState] = useMergeState({
        begin: undefined,
        yOffset: 0,
        childHeight: 0
    });


    const panResponder = React.useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dy) > 5,
        onStartShouldSetPanResponderCapture: (evt, gestureState) => Math.abs(gestureState.dy) > 5,
        onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dy) > 5,
        onMoveShouldSetPanResponderCapture: (evt, gestureState) => Math.abs(gestureState.dy) > 5,
        onPanResponderMove: (evt, gestureState) => {
            const { begin, yOffset } = scrollState;
            let yOffsetBeginLocal = begin;
            if (!yOffsetBeginLocal) {
                yOffsetBeginLocal = yOffset;
            }
            let newYOffset = yOffsetBeginLocal + gestureState.dy;
            if (newYOffset > 0) {
                newYOffset = 0;
            }
            let height = isNumber(props.height) ? props.height : 800;
            let limit = (childHeight > 0 && height < childHeight) ? height - childHeight : -100;
            if (newYOffset < limit) {
                newYOffset = limit;
            }
            setScrollState({ yOffset: newYOffset, begin })
            if (Math.abs(gestureState.dy) > 2) {
                trace("on scroll", newYOffset)
                props.onScroll && props.onScroll(newYOffset);
            }
        },

        onPanResponderRelease: (evt, gestureState) => {
            props.onScrollComplete && props.onScrollComplete();
            trace("scroll complete")
            if (gestureState.dx == 0 && gestureState.dy == 0) {
                return
            }
            setScrollState({ ...scrollState, begin: undefined })

        }
    }));

    let { yOffset, childHeight } = scrollState;

    if (props.childHeight) {
        childHeight = props.childHeight;
    }

    let height = isNumber(props.height) ? props.height : 800;
    let limit = (childHeight > 0 && height < childHeight) ? height - childHeight : -100;
    trace("scroll-limit", limit)
    let yOs = yOffset;
    

    return <View
        //onLayout={props.onLayout ? undefined : e => setScrollState({ ...scrollState, childHeight: e.nativeEvent.layout.height })}
        style={[{
            
            flexDirection: props.rtl ? 'row' : 'row-reverse',
            width: '100%', height:'100%',
            justifyContent: 'flex-end'
        }, props.top && { top: props.top }]}
        {...panResponder.panHandlers}
    >

        {/**Scroll bar */}
        <View style={[
            {
                position: 'absolute',
                top: 0,

                width: scrollWidth,
                height: height - 10,
                left: 0

            },
            props.rtl ?
                { borderRightColor: 'gray', borderRightWidth: 1 } :
                { borderLeftColor: 'gray', borderLeftWidth: 1 }
        ]}>
            {/**Position marker */}
            <View style={
                {
                    position: 'absolute',
                    top: (yOs / limit) * (height - 40),
                    width: scrollWidth, height: 40,
                    backgroundColor: 'gray',
                    opacity: 0.4,
                    left: 0
                }
            } />
        </View>

        <Animated.View style={[
            props.rtl ?
                { marginLeft: scrollWidth } :
                { marginRight: scrollWidth },
            props.style,
            {
                width: '98%',
                // position: 'absolute',
                // top: yOs,

                transform: [{ translateY: yOs }] 
            }]}>
            {props.children}
        </Animated.View>
    </View>
}
