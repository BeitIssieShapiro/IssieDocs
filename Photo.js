import React from 'react';
import { ImageBackground, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import {Icon} from 'react-native-elements'

const pictureSize = 150;

export default class Photo extends React.Component {
  state = {
    selected: false,
    faces: [],
    image: null,
  };
  _mounted = false;

  componentDidMount() {
    this._mounted = true;
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  toggleSelection = () => {
    this.setState(
      { selected: !this.state.selected },
      () => this.props.onSelectionToggle(this.props.uri, this.state.selected)
    );
  }

  

  getImageDimensions = ({ width, height }) => {
    if (width > height) {
      const scaledHeight = pictureSize * height / width;
      return {
        width: pictureSize,
        height: scaledHeight,

        scaleX: pictureSize / width,
        scaleY: scaledHeight / height,

        offsetX: 0,
        offsetY: (pictureSize - scaledHeight) / 2,
      };
    } else {
      const scaledWidth = pictureSize * width / height;
      return {
        width: scaledWidth,
        height: pictureSize,

        scaleX: scaledWidth / width,
        scaleY: pictureSize / height,

        offsetX: (pictureSize - scaledWidth) / 2,
        offsetY: 0,
      };
    }
  };

  
  render() {
    const { uri } = this.props;
    const fileName = (uri.split('\\').pop().split('/').pop().split('.'))[0];
    return (
        <TouchableOpacity
          style={styles.pictureWrapper}
          onLongPress={this.toggleSelection}
          onPress={this.props.onPress}
          activeOpacity={1}
        >
          <ImageBackground
            style={styles.picture}
            source={{ uri }}
          >
          {
            this.state.selected && <Icon name="check-circle" size={30} color="#4630EB" />
          }
          </ImageBackground>
          <Text style={{bottom:0}}>{fileName}</Text>
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
    resizeMode: 'contain',
  },
  pictureWrapper: {
    width: pictureSize,
    height: pictureSize,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
  },
  facesContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    top: 0,
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