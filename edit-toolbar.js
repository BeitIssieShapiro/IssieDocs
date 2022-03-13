// import React, { useState } from 'react';
// import {
//     View, Text
// } from 'react-native';
// import { semanticColors, Spacer, AppText, getIconButton, AppText} from './elements'
// import { translate } from './lang';



// export default function EditToolbar(props) {
//     let textModeState = true;
//     let fontSizeState = 15;
//     let colorState = 'black';
//     let strokeWidthState = 2;

//     const [textMode, setTextMode] = useState(textModeState);

//     let windowW = 500;
//     let spaceBetweenButtons = <Spacer width={23} />
//     let toolbarSideMargin = 0;
//     return (
//         <View style={{
//             flex: 1,  
//             left:props.left, 
//             height: '100%',//dimensions.toolbarHeight, 
//             backgroundColor: 'transparent',
//             zIndex: 30
//         }} >
//             <View style={{
//                 position: 'absolute',
//                 height: '100%',
//                 left: toolbarSideMargin,
//                 right: toolbarSideMargin,
//                 flexDirection: 'row',
//                 alignItems: 'center'
//             }}>
//                 {
//                     getIconButton(() => {
//                         this.state.queue.undo();
//                         this.setState({ needCanvasUpdate: true, needCanavaDataSave: true });
//                     }, semanticColors.editPhotoButton, "undo", 55)
//                 }
//                 {spaceBetweenButtons}
//                 {
//                     getIconButton(() => {
//                         this.state.queue.redo();
//                         this.setState({ needCanvasUpdate: true, needCanavaDataSave: true });
//                     }, semanticColors.editPhotoButton, "redo", 55)
//                 }
//                 { /* text size preview */}

//                 <View style={{
//                     position: 'absolute',
//                     left: windowW / 2 - toolbarSideMargin - 50,
//                     width: 100,
//                     height: '100%',
//                     backgroundColor: 'transparent',//'#eef4fa',
//                     //borderWidth:3,
//                     //borderColor: 'rgba(238,244,250, .7)',
//                     borderRadius: 24.5,
//                     justifyContent: 'center',
//                     alignItems: 'center',
//                     alignContent: 'center'
//                 }}>
//                     {textModeState ?
//                         <AppText style={{
//                             fontSize: fontSizeState,
//                             color: colorState,
//                             textAlignVertical: 'center'
//                         }}>{translate("A B C")}</AppText> :
//                         // <View style={{
//                         //   width: this.state.strokeWidth + 2,
//                         //   height: this.state.strokeWidth + 2,
//                         //   borderRadius: (this.state.strokeWidth + 2) / 2,
//                         //   backgroundColor:  colorState
//                         // }} />

//                         <Svg height="100%" width="100%" viewBox="-30 -30 150 200" preserveAspectRatio="xMidYMid meet">
//                             <Path
//                                 stroke={colorState}
//                                 strokeWidth={(strokeWidthState + 2) * 2}
//                                 d="M93.25 143.84C60.55 100.51 87.43 56.85 80.24 51.37C73.05 45.89 9.35 83.22 1.47 68.49C-6.4 53.77 19.28 8.22 31.61 0"
//                                 fill="none"
//                                 strokeLinecap="round"
//                             />
//                         </Svg>
//                     }
//                 </View>

//                 <View style={{
//                     position: 'absolute', top: 0, right: props.right, height: '100%',
//                     flexDirection: 'row', alignItems: 'center'
//                 }} >
//                     {
//                         getIconButton(() => this.setState({
//                             showColorPicker: !this.state.showColorPicker,
//                             showTextSizePicker: false,
//                             showBrushSizePicker: false
//                         }), semanticColors.editPhotoButton, "color-lens", 55)
//                     }
//                     {spaceBetweenButtons}
                    
//                     {
//                         getIconButton(() => this.onBrushButtonPicker(),
//                              textModeState ? semanticColors.editPhotoButton :  colorState, "edit", 55, false, 45, ! textModeState) //(20 + this.state.strokeWidth * 3))
//                     }
//                     {spaceBetweenButtons}
//                     {
//                         getIconButton(() => this.onTextButtonPicker(),
//                              textModeState ?  colorState : semanticColors.editPhotoButton, translate("A"), 55, true, 45,  textModeState)
//                     }
//                 </View>
//             </View>
//         </View>
//     );
// }