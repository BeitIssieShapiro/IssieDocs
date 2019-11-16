import React, { useState, useEffect, View } from 'react';
import { Animated} from 'react-native';

const FadeInView = (props) => {
  const [fadeAdmin] = useState(new Animated.Value(0))  // Initial value for opacity: 0

  React.useEffect(() => {
    Animated.timing(
      fadeAdmin,
      {
        toValue: props.width?props.width:props.height,
        duration: props.duration || 500,
      }
    ).start();
  }, [props.height, props.width])

  return (
    <Animated.View                 // Special animatable View
      style={[props.style, {
        overflow: "hidden",
        opacity: fadeAdmin,         // Bind opacity to animated value
      }, props.width?{width:fadeAdmin}:{height:fadeAdmin}]}
    >
      {props.children}
    </Animated.View>
  );
}

export default FadeInView;
