import React from 'react';
import {
  ImageBackground, StyleSheet, View, TouchableOpacity, Text,
  Alert
} from 'react-native';
import { Icon } from 'react-native-elements'
import LinearGradient from 'react-native-linear-gradient';
const pictureSize = 150;
const topBar = .45;
const heightBar = .55;

export default class Folder extends React.Component {
  state = {
    selected: false,
    image: null,
  };
  _mounted = false;

  componentDidMount() {
    this._mounted = true;
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  static empty = () => {
    return <TouchableOpacity
      style={styles.pictureWrapper}
      activeOpacity={1}
    />
  }

  toggleSelection = () => {
    this.setState(
      { selected: !this.state.selected },
      () => this.props.onSelectionToggle(this.props.uri, this.state.selected, this, 'folder')
    );
  }
  getBackgroundImage = () => {

    if (this.props.files && this.props.files.length > 0) {
      //Alert.alert('File:'+this.props.files[0]);
      return <View style={styles.picture}>
        <ImageBackground
          style={styles.picture}
          source={{ uri: this.props.files[0] }}
        >
          {
            this.state.selected && <Icon name="check-circle" size={30} color="#4630EB" />
          }
        </ImageBackground>
        <View style={[styles.picture, { backgroundColor: 'white', transform: [{ rotate: '6deg' }, { translateY: -10 }], zIndex: 0 }]} />
        <View style={[styles.picture, { backgroundColor: 'white', transform: [{ rotate: '-6deg' }, { translateY: -10 }], zIndex: 0 }]} />

      </View>
    }
    return <View style={[styles.picture, { backgroundColor: 'white' }]}>
    </View>
  }

  render() {
    return (
      <TouchableOpacity
        style={styles.pictureWrapper}
        onLongPress={this.toggleSelection}
        onPress={this.props.onPress}
        activeOpacity={1}
      >
        {this.getBackgroundImage()}
        <LinearGradient colors={['#AEC6DD', '#749DC5']} style={{
          flex: 1, position: 'absolute',
          top: pictureSize * topBar,
          height: pictureSize * heightBar,
          right: -10,
          left: -10,
          alignItems: 'center',
          justifyContent:'center',
          zIndex: 2,
          borderRadius: 5
        }}>
          <Text style={{ fontSize: 45, fontWeight:'bold', color: '#505B64' }}>{this.props.name}</Text>
        </LinearGradient>
        <LinearGradient
          colors={['#325272', '#628EB6']}
          style={{
            flex: 1, position: 'absolute',
            width: 20, height: 20,
            left: -3, top: pictureSize * topBar - 10,
            transform: [{ rotate: '-45deg' }],
            zIndex: 0,
            borderRadius: 5
          }}></LinearGradient>
        <LinearGradient
          colors={['#325272', '#628EB6']}
          style={{
            flex: 1, position: 'absolute',
            width: 20, height: 20,
            right: -3, top: pictureSize * topBar - 10,
            transform: [{ rotate: '45deg' }],
            zIndex: 0
          }}></LinearGradient>
      </TouchableOpacity>
    );
  };
}

const styles = StyleSheet.create({
  picture: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    top: 0,
    borderColor: '#DCDCDB',
    borderWidth: 1,
    resizeMode: 'contain',
    zIndex: 1
  },
  facesContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    top: 0,
  },
  pictureWrapper: {
    width: pictureSize * 4 / 5,
    height: pictureSize,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
  },
  face: {
    borderWidth: 2,
    borderRadius: 2,
    position: 'absolute',
    borderColor: '#FFD700',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  faceText: {
    color: '#FFD700',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: 2,
    fontSize: 10,
    backgroundColor: 'transparent',
  }
});