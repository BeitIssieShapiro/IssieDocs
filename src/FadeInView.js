import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';

export default function FadeInView({ width, height, duration = 500, style, overflow, children }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isHide, setIsHide] = useState(true);

  useEffect(() => {
    const val = width ? width : height;
    if (val > 0) {
      setIsHide(false);
    }
    Animated.timing(fadeAnim, {
      toValue: width ? width : height,
      duration,
      useNativeDriver: false, // must be false for width/height
    }).start(() => {
      setIsHide(width ? width === 0 : height === 0);
    });
  }, [width, height, duration, fadeAnim]);

  if (isHide) {
    return <View />;
  }
  return (
    <Animated.View
      style={[
        style,
        { overflow: overflow || 'hidden', [width?"width":"height"]: fadeAnim },
      ]}
    >
      {children}
    </Animated.View>
  );
}