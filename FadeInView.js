import React, { useState, useEffect, View } from 'react';
import { Animated} from 'react-native';

const FadeInView = (props) => {
  const [fadeAdmin] = useState(new Animated.Value(0))  // Initial value for opacity: 0

  React.useEffect(() => {
    Animated.timing(
      fadeAdmin,
      {
        toValue: props.height,
        duration: 500,
      }
    ).start();
  }, [])

  return (
    <Animated.View                 // Special animatable View
      style={[props.style, {
        overflow: "hidden",
        height: fadeAdmin,
        opacity: fadeAdmin,         // Bind opacity to animated value
      }]}
    >
      {props.children}
    </Animated.View>
  );
}

export default FadeInView;
