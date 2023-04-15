import React, { useState } from 'react';
import { View, Text, TouchableWithoutFeedback, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  buttonPushed: {
    backgroundColor: '#ccc',
  },
});

const PushButton = ({ onPress, title, isOn }) => {

  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <View style={[styles.button, isOn && styles.buttonPushed]}>
        <Text style={styles.text}>{title}</Text>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default PushButton;
