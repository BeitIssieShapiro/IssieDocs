import React, { useState, useRef } from 'react';
import {
    View, Alert, TextInput
} from 'react-native';
import { Icon } from "./elements"

import {
    translate
} from "./lang.js"
import { Spacer, getIconButton } from './elements.js';

let updateInputText = (iText, fontSize) => {
    if (iText) {
        iText.setNativeProps({ fontSize});

    //   setTimeout(() => {
    //     if (this._textInput) {
    //       this._textInput.setNativeProps({ text: this.state.inputTextValue });
    //     }
    //   }, 50);
    }
  }


export default function Search(props) {
    //const inputEl = useRef(null);

    //setTimeout(() => updateInputText(inputEl.current, 25), 25);
    return <View
        style={{ width: props.width || '100%', alignItems: 'center' }}
    >
        <View style={{
            width: '90%',
            backgroundColor: 'white',
            borderRadius: 15,
            alignItems: 'center',
            alignContent: 'center',
            justifyContent:'center',
        }}>
            <TextInput
                placeholder={'  ' + translate("Search")}
                onChangeText={props.onChangeText}
                allowFontScaling={false}
                //ref={inputEl}
                style={{
                    fontSize: 25,
                    color: 'black',
                    lineHeight: 32,
                    width:'95%',
                    textAlign: props.rtl?'right':'left',
                }}
                value={props.value}
            />
            <View style={[{ position: 'absolute', 
                flexDirection:props.rtl?'row':'row-reverse', 
                    alignItems:'center', justifyContent:'center', alignContent:'center' },props.rtl?{left: '1%'}:{right: '1%'}]}>
                <Icon name={"search"} size={30} color={"#010101"} />
                <Spacer />
                {props.value && props.value.length > 0?getIconButton(()=>props.onChangeText(""), "#010101", "close", 20):null}
            </View>
        </View>
    </View>
}