import React from 'react';
import { ImageBackground, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import {Icon} from 'react-native-elements'
import LinearGradient from 'react-native-linear-gradient';

const pictureSize = 150;
const topBar = .38;
const heightBar = .35;

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
      () => this.props.onSelectionToggle(this.props.page, this.state.selected, this, 'file')
    );
  }

  
  
  render() {
    const { page } = this.props;
    const fileName = (page.path.split('\\').pop().split('/').pop().split('.'))[0];
    const pageCount = page.pages.length;
    return (
        <TouchableOpacity
          style={styles.pictureWrapper}
          onLongPress={this.toggleSelection}
          onPress={this.props.onPress}
          activeOpacity={1}
        >
          <ImageBackground
            style={styles.picture}
            source={{ uri:pageCount == 0?page.path:page.pages[0] }}
          >
          {
            this.state.selected && <Icon name="check-circle" size={30} color="#4630EB" />
          }
          </ImageBackground>
          <LinearGradient colors={['#AEC6DD','#749DC5']} style={{
            flex:1, 
            position:'absolute', 
            top:pictureSize*topBar ,
            height:pictureSize*heightBar,
            right:-10,
            left:-10,
            alignContent:'center', alignItems:'center',
            zIndex:2
            }}>
            <Text style={{fontSize:40, color:'#505B64'}}>{fileName + (pageCount>1?'+':'')}</Text>
          </LinearGradient>
          <LinearGradient
          colors={['#325272', '#628EB6']}
          style={{
            flex:1, position:'absolute',
            width:20, height:20,
            left:-5, top: pictureSize * (topBar+heightBar)-10,
            transform :[{ rotate: '-45deg' }],
            zIndex:0
          }}></LinearGradient>  
          <LinearGradient
          colors={['#325272', '#628EB6']}
          style={{
            flex:1, position:'absolute',
            width:20, height:20,
            right:-5, top: pictureSize * (topBar+heightBar)-10,
            transform :[{ rotate: '45deg' }],
            zIndex:0
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
    resizeMode: 'contain',
    zIndex:1
  },
  pictureWrapper: {
    width: pictureSize*4/5,
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