import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';

export default function FadeInView({ width, height, duration = 500, style, overflow, children }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [hide, setHide] = useState(false);

  useEffect(() => {
    setHide(false);
    Animated.timing(fadeAnim, {
      toValue: width ? width : height,
      duration,
      useNativeDriver: false, // must be false for width/height
    }).start(() => {
      setHide(width ? width === 0 : height === 0);
    });
  }, [width, height, duration, fadeAnim]);

  if (hide) {
    return <View />;
  }

  // const dynamicStyle = width
  //   ? { width: fadeAnim }
  //   : { height: fadeAnim };

  return (
    <Animated.View
      style={[
        style,
        { overflow: overflow || 'hidden',} //[width?"width":"height"]: fadeAnim },
        //dynamicStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}