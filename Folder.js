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

  onPress = () => {
    if (this.state.selected) {
      this.toggleSelection()
    } else {
      this.props.onPress();
    }
  }

  toggleSelection = () => {
    this.setState(
      { selected: !this.state.selected },
      () => this.props.onSelectionToggle({path:this.props.path}, this.state.selected, this, 'folder')
    );
  }
  getBackgroundImage = () => {
    if (this.props.files && this.props.files.length > 0) {
      return <View style={styles.picture}>
        <ImageBackground
          style={styles.picture}
          source={{ uri: this.props.files[0].path }}
        >
          {
            this.state.selected && <Icon name="check-circle" size={30} color={semanticColors.selectedCheck} />
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
    let folderName = this.props.name;
    let iconName = '';
    let parts = folderName.split("$")
    if (parts.length == 2) {
        folderName = parts[0]
        iconName = parts[1]
    }

    return (
      <TouchableOpacity
        style={styles.pictureWrapper}
        onLongPress={this.toggleSelection}
        onPress={() => this.onPress()}
        activeOpacity={0.8}
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
          <Text style={{ fontSize: 35, fontWeight:'bold', color: '#505B64' }}>{folderName}</Text>
          {iconName && iconName.length>0?<Icon name={iconName} size={40}></Icon>:null}
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
  pictureWrapper: {
    width: pictureSize * 4 / 5,
    height: pictureSize,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
  }
});