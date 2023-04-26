import React from 'react'
import PropTypes from 'prop-types'
import ReactNative, {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  //ViewPropTypes,
} from 'react-native'
import SketchCanvas from 'issie-sketch-canvas/src/SketchCanvas'
import {ViewPropTypes} from 'deprecated-react-native-prop-types';

import { requestPermissions } from 'issie-sketch-canvas/src/handlePermission';

export default class RNSketchCanvas extends React.Component {
  static propTypes = {
    containerStyle: ViewPropTypes.style,
    canvasStyle: ViewPropTypes.style,
    onStrokeStart: PropTypes.func,
    onStrokeChanged: PropTypes.func,
    onStrokeEnd: PropTypes.func,
    onClosePressed: PropTypes.func,
    onUndoPressed: PropTypes.func,
    onClearPressed: PropTypes.func,
    onPathsChange: PropTypes.func,
    user: PropTypes.string,
    scale: PropTypes.number,

    closeComponent: PropTypes.node,
    eraseComponent: PropTypes.node,
    undoComponent: PropTypes.node,
    clearComponent: PropTypes.node,
    saveComponent: PropTypes.node,
    strokeComponent: PropTypes.func,
    strokeSelectedComponent: PropTypes.func,
    strokeWidthComponent: PropTypes.func,

    strokeColors: PropTypes.arrayOf(PropTypes.shape({ color: PropTypes.string })),
    defaultStrokeIndex: PropTypes.number,
    defaultStrokeWidth: PropTypes.number,

    minStrokeWidth: PropTypes.number,
    maxStrokeWidth: PropTypes.number,
    strokeWidthStep: PropTypes.number,

    savePreference: PropTypes.func,
    onSketchSaved: PropTypes.func,

    text: PropTypes.arrayOf(PropTypes.shape({
      text: PropTypes.string,
      font: PropTypes.string,
      fontSize: PropTypes.number,
      fontColor: PropTypes.string,
      overlay: PropTypes.oneOf(['TextOnSketch', 'SketchOnText']),
      anchor: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
      position: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
      coordinate: PropTypes.oneOf(['Absolute', 'Ratio']),
      alignment: PropTypes.oneOf(['Left', 'Center', 'Right']),
      lineHeightMultiple: PropTypes.number,
    })),
    localSourceImage: PropTypes.shape({ filename: PropTypes.string, directory: PropTypes.string, mode: PropTypes.string }),

    permissionDialogTitle: PropTypes.string,
    permissionDialogMessage: PropTypes.string,
  };

  static defaultProps = {
    containerStyle: null,
    canvasStyle: null,
    onStrokeStart: () => { },
    onStrokeChanged: () => { },
    onStrokeEnd: () => { },
    onClosePressed: () => { },
    onUndoPressed: () => { },
    onClearPressed: () => { },
    onPathsChange: () => { },
    user: null,
    scale: 1,

    closeComponent: null,
    eraseComponent: null,
    undoComponent: null,
    clearComponent: null,
    saveComponent: null,
    strokeComponent: null,
    strokeSelectedComponent: null,
    strokeWidthComponent: null,

    strokeColors: [
      { color: '#000000' },
      { color: '#FF0000' },
      { color: '#00FFFF' },
      { color: '#0000FF' },
      { color: '#0000A0' },
      { color: '#ADD8E6' },
      { color: '#800080' },
      { color: '#FFFF00' },
      { color: '#00FF00' },
      { color: '#FF00FF' },
      { color: '#FFFFFF' },
      { color: '#C0C0C0' },
      { color: '#808080' },
      { color: '#FFA500' },
      { color: '#A52A2A' },
      { color: '#800000' },
      { color: '#008000' },
      { color: '#808000' }],
    alphlaValues: ['33', '77', 'AA', 'FF'],
    defaultStrokeIndex: 0,
    defaultStrokeWidth: 3,

    minStrokeWidth: 3,
    maxStrokeWidth: 15,
    strokeWidthStep: 3,

    savePreference: null,
    onSketchSaved: () => { },

    text: null,
    localSourceImage: null,

    permissionDialogTitle: '',
    permissionDialogMessage: '',
  };


  constructor(props) {
    super(props)

    this.state = {
      color: props.strokeColors[props.defaultStrokeIndex].color,
      strokeWidth: props.defaultStrokeWidth,
      alpha: 'FF'
    }

    this._colorChanged = false
    this._strokeWidthStep = props.strokeWidthStep
    this._alphaStep = -1
  }

  clear() {
    this._sketchCanvas.clear()
  }

  undo() {
    return this._sketchCanvas.undo()
  }

  addPath(data, width, height) {
    this._sketchCanvas.addPath(data, width, height)
  }

  deletePath(id) {
    this._sketchCanvas.deletePath(id)
  }

  addOrSetCanvasImage(data) {
    // todo validate data
    const prefix = data.imageData.indexOf(";base64,");
    if (prefix >=0) {
      data.imageData = data.imageData.substr(prefix+8);
    }

    this._sketchCanvas.addOrSetCanvasImage(data);
  }

  setCanvasImagePosition(data) {
    this._sketchCanvas.setCanvasImagePosition(data);
  }
  clearImages() {
    this._sketchCanvas.clearImages();
  }

  getPathIds(callback) {
    this._sketchCanvas.getPathIds(callback);
  }

  getImageIds(callback) {
    this._sketchCanvas.getImageIds(callback);
  }

  deleteImage(imageId) {
    this._sketchCanvas.deleteImage(imageId);
  }

  detectTextsInBackgroundImage(callback) {
    this._sketchCanvas.detectTextsInBackgroundImage(callback);
  }

  readoutText(text) {
    this._sketchCanvas.readoutText(text);
  }


  export(type, scaleToSize, callback) {
    this._sketchCanvas.export(type, scaleToSize, callback);
  }

  save() {
    if (this.props.savePreference) {
      const p = this.props.savePreference()
      this._sketchCanvas.save(p.imageType, p.transparent, p.folder ? p.folder : '', p.filename, p.includeImage !== false, p.includeText !== false, p.cropToImageSize || false, p.scaleToSize || { width: 0, height: 0 })
    } else {
      const date = new Date()
      this._sketchCanvas.save('png', false, '',
        date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + ('0' + date.getDate()).slice(-2) + ' ' + ('0' + date.getHours()).slice(-2) + '-' + ('0' + date.getMinutes()).slice(-2) + '-' + ('0' + date.getSeconds()).slice(-2),
        true, true, false, { width: 0, height: 0 })
    }
  }

  getBase64(imageType, transparent, includeImage, includeText, cropToImageSize, callback) {
    return this._sketchCanvas.getBase64(imageType, transparent, includeImage, includeText, cropToImageSize, callback);
  }


  nextStrokeWidth() {
    if ((this.state.strokeWidth >= this.props.maxStrokeWidth && this._strokeWidthStep > 0) ||
      (this.state.strokeWidth <= this.props.minStrokeWidth && this._strokeWidthStep < 0))
      this._strokeWidthStep = -this._strokeWidthStep
    this.setState({ strokeWidth: this.state.strokeWidth + this._strokeWidthStep })
  }

  _renderItem = ({ item, index }) => (
    <TouchableOpacity style={{ marginHorizontal: 2.5 }} onPress={() => {
      if (this.state.color === item.color) {
        const index = this.props.alphlaValues.indexOf(this.state.alpha)
        if (this._alphaStep < 0) {
          this._alphaStep = index === 0 ? 1 : -1
          this.setState({ alpha: this.props.alphlaValues[index + this._alphaStep] })
        } else {
          this._alphaStep = index === this.props.alphlaValues.length - 1 ? -1 : 1
          this.setState({ alpha: this.props.alphlaValues[index + this._alphaStep] })
        }
      } else {
        this.setState({ color: item.color })
        this._colorChanged = true
      }
    }}>
      {this.state.color !== item.color && this.props.strokeComponent && this.props.strokeComponent(item.color)}
      {this.state.color === item.color && this.props.strokeSelectedComponent && this.props.strokeSelectedComponent(item.color + this.state.alpha, index, this._colorChanged)}
    </TouchableOpacity>
  )

  componentDidUpdate() {
    this._colorChanged = false
  }

  async componentDidMount() {
    const isStoragePermissionAuthorized = await requestPermissions(
      this.props.permissionDialogTitle,
      this.props.permissionDialogMessage,
    );
  }

  render() {
    return (
      <View style={this.props.containerStyle}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flexDirection: 'row', flex: 1, justifyContent: 'flex-start' }}>
            {this.props.closeComponent && (
              <TouchableOpacity onPress={() => { this.props.onClosePressed() }}>
                {this.props.closeComponent}
              </TouchableOpacity>)
            }

            {this.props.eraseComponent && (
              <TouchableOpacity onPress={() => { this.setState({ color: '#00000000' }) }}>
                {this.props.eraseComponent}
              </TouchableOpacity>)
            }
          </View>
          <View style={{ flexDirection: 'row', flex: 1, justifyContent: 'flex-end' }}>
            {this.props.strokeWidthComponent && (
              <TouchableOpacity onPress={() => { this.nextStrokeWidth() }}>
                {this.props.strokeWidthComponent(this.state.strokeWidth)}
              </TouchableOpacity>)
            }

            {this.props.undoComponent && (
              <TouchableOpacity onPress={() => { this.props.onUndoPressed(this.undo()) }}>
                {this.props.undoComponent}
              </TouchableOpacity>)
            }

            {this.props.clearComponent && (
              <TouchableOpacity onPress={() => { this.clear(); this.props.onClearPressed() }}>
                {this.props.clearComponent}
              </TouchableOpacity>)
            }

            {this.props.saveComponent && (
              <TouchableOpacity onPress={() => { this.save() }}>
                {this.props.saveComponent}
              </TouchableOpacity>)
            }
          </View>
        </View>
        <SketchCanvas
          ref={ref => this._sketchCanvas = ref}
          width={this.props.width}
          height={this.props.height}
          scale={this.props.scale}
          style={this.props.canvasStyle}
          strokeColor={this.state.color + (this.state.color.length === 9 ? '' : this.state.alpha)}
          onStrokeStart={this.props.onStrokeStart}
          onStrokeChanged={this.props.onStrokeChanged}
          onStrokeEnd={this.props.onStrokeEnd}
          user={this.props.user}
          strokeWidth={this.state.strokeWidth}
          onSketchSaved={(success, path) => this.props.onSketchSaved(success, path)}
          onPathsChange={this.props.onPathsChange}
          text={this.props.text}
          localSourceImage={this.props.localSourceImage}
          permissionDialogTitle={this.props.permissionDialogTitle}
          permissionDialogMessage={this.props.permissionDialogMessage}
          touchEnabled={this.props.touchEnabled}
        />
        <View style={{ flexDirection: 'row' }}>
          <FlatList
            data={this.props.strokeColors}
            extraData={this.state}
            keyExtractor={() => Math.ceil(Math.random() * 10000000).toString()}
            renderItem={this._renderItem}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>
      </View>
    );
  }
};

RNSketchCanvas.MAIN_BUNDLE = SketchCanvas.MAIN_BUNDLE;
RNSketchCanvas.DOCUMENT = SketchCanvas.DOCUMENT;
RNSketchCanvas.LIBRARY = SketchCanvas.LIBRARY;
RNSketchCanvas.CACHES = SketchCanvas.CACHES;

export {
  SketchCanvas
}