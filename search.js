import React, { useState } from 'react';
import {
    View, Alert, TextInput
} from 'react-native';

import {
     translate
} from "./lang.js"



export default function Search(props) {
    return <View
        style={{ width: '100%', alignItems: 'center' }}
    >
        <TextInput
            placeholder={'  ' + translate("Search")}
            onChangeText={props.onChangeText}
           
            style={{
                fontSize:25,
                width: '90%',
                textAlign: 'right',
                backgroundColor: 'white',
                borderRadius: 15
            }}
            value={props.value}
        />
    </View>
}