import React, { useState } from 'react';
import { Icon } from 'react-native-elements'
import {
    View, Alert, Text, TouchableOpacity, StyleSheet,
    Settings
} from 'react-native';
import { getFolderAndIcon, normalizeTitle, semanticColors, FolderTextStyle, folderColors, Spacer } from './elements'

import FadeInView from './FadeInView'



export default function Menu(props) {

    let viewStyleSetting = Settings.get('viewStyle');
    if (viewStyleSetting === undefined) {
        viewStyleSetting = 1;
    }
    const [viewStyle, setViewStyle] = useState(viewStyleSetting);


    return <TouchableOpacity onPress={props.onClose} style={{position:'absolute', 
        zIndex: 100, top:0, left:0, width:'100%', height:'100%'}}>
        <FadeInView
            duration={500}
            width={300}
            style={{
                zIndex: 101, position: 'absolute', height: '100%', right: 0,

                backgroundColor: 'white', borderColor: 'gray', borderWidth: 1
            }}>
            <View style={{ position: 'absolute', alignItems: 'flex-end', top: '3%', height: '5%', width: '100%', borderBottomWidth: 1, borderBottomColor: 'gray' }}>
                <Text style={{ fontSize: 35, color: semanticColors.titleText }}>תפריט</Text>
            </View>
            <View style={{ position: 'absolute', alignItems: 'flex-end', top: '12%', width: '100%' }}>
                <TouchableOpacity onPress={props.onAbout} style={{ flexDirection: 'row' }}>
                    <Text style={{ fontSize: 25, color: semanticColors.titleText }}>עלינו - About us</Text>
                    <Spacer />
                    <Icon name={'info'} size={35} color={semanticColors.titleText} />
                </TouchableOpacity>

                <View style={{ width: '100%', paddingTop: 25, alignItems: 'flex-end' }}>
                    <Text style={styles.SettingsHeaderText}>תצוגת דפים:</Text>

                    <TouchableOpacity
                        style={{ flexDirection: 'row', paddingRight: 35, paddingTop: 15 }}
                        onPress={() => {
                            Settings.set({ viewStyle: 1 })
                            setViewStyle(1);
                        }}
                    >
                        <Text style={styles.radioText}>רשימה</Text>
                        <Spacer />
                        <View style={styles.circle}>
                            {viewStyle == 1 && <View style={styles.checkedCircle} />}
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ flexDirection: 'row', paddingRight: 35, paddingTop: 15 }}
                        onPress={() => {
                            Settings.set({ viewStyle: 2 });
                            setViewStyle(2);
                        }}
                    >
                        <Text style={styles.radioText}>משבצות</Text>
                        <Spacer />
                        <View style={styles.circle}>
                            {viewStyle == 2 && <View style={styles.checkedCircle} />}
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

        </FadeInView>
    </TouchableOpacity>
}

const styles = StyleSheet.create({
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    circle: {
        height: 20,
        width: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ACACAC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkedCircle: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#794F9B',
    },
    SettingsHeaderText: {
        fontSize: 27,
        color: semanticColors.titleText,
        fontWeight: 'bold',
        paddingRight: 10
    },
    radioText: {
        fontSize: 25,
        color: semanticColors.titleText
    }
})