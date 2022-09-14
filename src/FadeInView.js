import React, { useState, useEffect } from 'react';
import { Animated, View } from 'react-native';
import { trace } from './log';


const FadeInView = (props) => {
  const [fadeAdmin] = useState(new Animated.Value(0))
  const [hide, setHide] = useState(false)
  useEffect(() => {
    setHide(false)

    Animated.timing(
      fadeAdmin,
      {
        toValue: props.width ? props.width : props.height,
        duration: props.duration || 500,
        useNativeDriver: false,
        
      }
    ).start((res)=>{
      setHide(props.width ? props.width == 0:props.height == 0)
    });
  }, [props.height, props.width])

  if (hide) {
    return (<View />);
  }
  return (<Animated.View
      style={[props.style, {
        overflow: "hidden",
        //opacity: fadeAdmin,         // Bind opacity to animated value
      }, props.width ? { width: fadeAdmin } : { height: fadeAdmin }]}
    >
      {props.children}
    </Animated.View>
  );
}

export default FadeInView;
