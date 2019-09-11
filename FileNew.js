import React from 'react';
//import { Icon } from 'react-native-elements'
import { View, Alert, Image, Text , TouchableOpacity} from 'react-native';
import {
    colors
} from './elements'
export default function FileNew(props) {
    let imageSrc = props.page.pages.length == 0?props.page.path:props.page.pages[0];
    //Alert.alert(imageSrc)
    return (
        <TouchableOpacity
            key={props.page.name}
            onPress={props.onPress}
            activeOpacity={0.8}
        >
            <View style={{ alignContent: 'center', height: 70 ,borderWidth:1.5, borderColor:"#D1CFCF"}}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
                    {/* <Icon name="computer" size={70} color='#424242' /> */}
                    <View style={{borderWidth:3, borderColor:colors.lightBlue}}>
                        <Image source={{uri:imageSrc}} style={{width:50, height:60}} />
                    </View>
                    <Text style={{ paddingRight:20, fontSize: 40 }}>
                        {removeExt(props.page.name)}
                        {props.count>0?' (' + props.count + ')':''}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

function removeExt(filePath) {
    return (filePath.split('\\').pop().split('/').pop().split('.'))[0];
}