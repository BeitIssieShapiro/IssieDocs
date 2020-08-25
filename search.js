import React, { useState } from 'react';
import {
    View, Alert, TextInput
} from 'react-native';
import { Icon } from 'react-native-elements'

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
        <View style={{position:'absolute', left:'6%', top:0}}>
            <Icon name={"search"} size={30} color={"#010101"}/>
        </View>
    </View>
}