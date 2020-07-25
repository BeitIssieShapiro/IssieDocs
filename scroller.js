import React, { useState, useImperativeHandle } from 'react';
import {
    View, PanResponder, Alert, Text
} from 'react-native';
import Animated from 'react-native-reanimated'
var isNumber = function isNumber(value) {
    return value && typeof value === 'number' && isFinite(value);
  }

function useMergeState(initialState) {
    const [state, setState] = useState(initialState);
    const setMergedState = newState =>
        setState(prevState => Object.assign({}, prevState, newState)
        );
    return [state, setMergedState];
}

export default function Scroller(props) {
    if (props.onLayout) {
        props.onLayout.onLayout = (e) => {
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
            setScrollState({ yOffset: newYOffset, begin })
        },

        onPanResponderRelease: (evt, gestureState) => {
            if (gestureState.dx == 0 && gestureState.dy == 0) {
                return
            }
            setScrollState({ ...scrollState, begin: undefined })
        }
    }));

    const { yOffset, childHeight } = scrollState;
    //Alert.alert("offset"+yOffset)

    let height = isNumber(props.height) ? props.height : 800;
    let limit = (childHeight>0 && height < childHeight) ? height - childHeight : -100;
    let yOs = yOffset > limit ? yOffset : limit;
    //Alert.alert("Height:"+height + ",limit:" + limit + ",yos:"+yOs+",yOffset:"+yOffset+","+childHeight)
    return <View 
        onLayout={props.onLayout?undefined:e=>setScrollState({ ...scrollState, childHeight: e.nativeEvent.layout.height })}
        style={ { flexDirection: 'row', width:'100%', height:'100%'}}
        {...panResponder.panHandlers}
    >
        
        <View style={{
            position: 'absolute',
            top: 10,
            left: 0, width: 20, 
            height: height,
            borderRightColor: 'gray', borderRightWidth: 2
        }}><View style={{
            position: 'absolute',
            left: 0, top: (yOs / limit) * (height-40),
            width: 20, height: 40, backgroundColor: 'gray'
        }} />
        </View>
    
        <Animated.View style={[{width:'100%'},props.style,{  transform: [{ translateY: yOs }] }]}>
            {props.children}
        </Animated.View>
    </View>
}
