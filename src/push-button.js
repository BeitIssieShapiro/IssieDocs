import React, { useEffect, useRef, useState } from 'react';
import { Easing } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { Animated } from 'react-native';
import { View, Text, TouchableWithoutFeedback, StyleSheet } from 'react-native';


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 8,
  },
  basicStyle: {
    height: 25,
    width: 25,
    borderRadius: 20,
    backgroundColor: '#FFF',
    marginTop: 5,
    marginLeft: 5,
  },
  eahcStyles: {
    fontSize: 19,
    color: 'white',
    position: 'absolute',
    top: 6,
    left: 7,
  },

  eahcStylesOf: {
    fontSize: 19,
    color: 'white',
    position: 'absolute',
    top: 6,
    right: 5,
  },
  mainStyes: {
    borderRadius: 30,
    backgroundColor: '#81b0ff',
    height: 35,
    width: 80,
  },

  paragraph: {
    margin: 24,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});


const PushButton2 = ({ onPressCallback, titleOn, titleOff, isOn }) => {
  const positionButton = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(positionButton, {
      toValue: isOn ? 1 : 0,
      duration: 50,
      easing: Easing.ease,
      useNativeDriver: false
    }).start()
  }, [])

  const startAnimToOff = () => {
    Animated.timing(positionButton, {
      toValue: 0,
      duration: 400,
      easing: Easing.ease,
      useNativeDriver: false
    }).start()
  };

  const startAnimToOn = () => {
    Animated.timing(positionButton, {
      toValue: 1,
      duration: 400,
      easing: Easing.ease,
      useNativeDriver: false
    }).start()

  };

  const positionInterPol = positionButton.interpolate({ inputRange: [0, 1], outputRange: [0, 45] })

  const backgroundColorAnim = positionButton.interpolate({ inputRange: [0, 1], outputRange: ["#767577", "#0079FF"] })

  const initialOpacityOn = positionButton.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })

  const initialOpacityOff = positionButton.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })

  const onPress = () => {
    if (isOn) {
      startAnimToOff();
      onPressCallback()
    } else {
      startAnimToOn();
      onPressCallback()
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={{ height: 45, width: 90 }} activeOpacity={0.9} onPress={onPress} >
        <Animated.View style={[styles.mainStyes, {
          backgroundColor: backgroundColorAnim
        }]} >
          <Animated.Text
            style={[
              styles.eahcStyles,
              {
                opacity: initialOpacityOn,
              },
            ]}>
            {titleOn}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.eahcStylesOf,
              {
                opacity: initialOpacityOff,
              },
            ]}>
            {titleOff}
          </Animated.Text>
          <Animated.View style={[styles.basicStyle, {
            transform: [{
              translateX: positionInterPol
            }]
          }]} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );

};


export default PushButton2;
