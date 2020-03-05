import React, { useState } from 'react';
import { Icon } from 'react-native-elements'
import {
    View, Alert, Text, TouchableOpacity, StyleSheet,
    Settings, ScrollView
} from 'react-native';
import {
    semanticColors,
    getIcon, Spacer,
    getRoundedButtonInt
} from './elements'


import FadeInView from './FadeInView'
import { translate } from './lang';

export const VIEW = {
    name: 'viewStyle',
    list: 1,
    tiles: 2
}

export const LANGUAGE = {
    name: 'language',
    default: 1,
    hebrew: 2,
    arabic: 3,
    english: 4
}

export const USE_COLOR = {
    name: 'useColor',
    yes: 1,
    no: 2
}
export const TEXT_BUTTON = {
    name: 'textButtons',
    yes: 1,
    no: 2
}

export const EDIT_TITLE = {
    name: 'editTitle',
    yes: 1,
    no: 2
}

export function getUseColorSetting() {
    return getSetting(USE_COLOR.name, USE_COLOR.yes);
}

export function getUseTextSetting() {
    return getSetting(TEXT_BUTTON.name, TEXT_BUTTON.yes) === TEXT_BUTTON.yes;
}

function getSetting(name, def) {
    let setting = Settings.get(name);
    if (setting === undefined) {
        setting = def;
    }
    return setting;
}


export default function Menu(props) {

    let viewStyleSetting = getSetting(VIEW.name, VIEW.list);
    const [viewStyle, setViewStyle] = useState(viewStyleSetting);

    let langSetting = getSetting(LANGUAGE.name, LANGUAGE.default);
    const [lang, setLang] = useState(langSetting);

    let editTitleSetting = getSetting(EDIT_TITLE.name, EDIT_TITLE.no);
    const [editTitle, setEditTitle] = useState(editTitleSetting);

    let textBtnSetting = getSetting(TEXT_BUTTON.name, TEXT_BUTTON.yes);
    const [textBtn, setTextBtn] = useState(textBtnSetting);

    let useColorSetting = getUseColorSetting();
    const [useColor, setUseColor] = useState(useColorSetting);

    const setView = (view) => {
        let obj = {}
        obj[VIEW.name] = view;
        Settings.set(obj)
        setViewStyle(view);
        props.onViewChange(view);
    }

    const setLanguage = (lang) => {
        let obj = {}
        obj[LANGUAGE.name] = lang;
        Settings.set(obj)
        setLang(lang);
        props.onLanguageChange(lang);
    }

    const setUseColorHandler = (use) => {
        let obj = {}
        obj[USE_COLOR.name] = use;
        Settings.set(obj)
        setUseColor(use);
        props.onFolderColorChange(use);
    }

    const setTextBtnHandler = (tb) => {
        let obj = {}
        obj[TEXT_BUTTON.name] = tb;
        Settings.set(obj)
        setTextBtn(tb);
        props.onTextBtnChange(tb);
    }

    const setEditTitleHandler = (tb) => {
        let obj = {}
        obj[EDIT_TITLE.name] = tb;
        Settings.set(obj)
        setTextBtn(tb);
    }

    return <TouchableOpacity onPress={props.onClose} style={{
        position: 'absolute',
        zIndex: 100, top: 0, left: 0, width: '100%', height: '100%'
    }}>

        <FadeInView
            duration={500}
            width={300}
            style={{
                zIndex: 101, position: 'absolute', height: '100%', right: 0,

                backgroundColor: 'white', borderColor: 'gray', borderWidth: 1
            }}>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'flex-start', alignItems: 'center' }}>
                <Spacer width={11} />
                <Icon name={'close'} onPress={props.onClose} size={45} />
                <Spacer />
                <Text style={styles.SettingsHeaderText}>{translate("Settings")}</Text>
            </View>
            <ScrollView style={{
                flex: 1,
                position: 'absolute', top: '10%',
                width: '100%', height: '90%'
            }}
            >
                <TouchableOpacity activeOpacity={1} style={{ alignItems: 'flex-end' }} >


                    <TouchableOpacity onPress={props.onAbout} style={{ flexDirection: 'row', paddingRight: 25 }}>

                        <Spacer />
                        <Icon name={'info'} size={35} color={semanticColors.titleText} />
                    </TouchableOpacity>
                    {getGroup(props, translate("Language") + ":", [
                        /*{
                            icon: getSvgIcon('lang-system', 45), selected: langSetting == LANGUAGE.default,
                            callback: () => setLanguage(LANGUAGE.default)
                        },*/
                        {
                            icon: <Text style={{ fontSize: 25 }}>עברית</Text>,
                            //getSvgIcon('lang-he', 45), 
                            selected: langSetting == LANGUAGE.hebrew,
                            callback: () => setLanguage(LANGUAGE.hebrew)
                        },
                        {
                            icon: <Text style={{ fontSize: 25 }}>عربيه</Text>,
                            //getSvgIcon('lang-ar', 45), 
                            selected: langSetting == LANGUAGE.arabic,
                            callback: () => setLanguage(LANGUAGE.arabic)
                        }
                        // ,
                        // {
                        //     icon: getSvgIcon('lang-en', 45), selected: langSetting ==  LANGUAGE.english,
                        //     callback: () => setLanguage(LANGUAGE.english)
                        // }
                    ])}
                    {getGroup(props, translate("Display") + ":", [
                        {
                            icon: getIcon('view-list', 45), selected: viewStyleSetting == VIEW.list,
                            callback: () => setView(VIEW.list)
                        },
                        {
                            icon: getIcon('view-module', 45), selected: viewStyleSetting == VIEW.tiles,
                            callback: () => setView(VIEW.tiles)
                        },

                    ])}

                    {getGroup(props, translate("TextInButtons") + ":", [
                        {
                            icon: getButtonWithText(), selected: textBtnSetting === TEXT_BUTTON.yes,
                            callback: () => setTextBtnHandler(TEXT_BUTTON.yes)
                        },
                        {
                            icon: getButtonWithoutText(), selected: textBtnSetting === TEXT_BUTTON.no,
                            callback: () => setTextBtnHandler(TEXT_BUTTON.no)
                        }
                    ])}
                    
                    {getCheckbox(translate("AllowEditTitle"), 
                        () => {
                            let newValue = editTitle == EDIT_TITLE.yes ? EDIT_TITLE.no : EDIT_TITLE.yes;
                            setEditTitle(newValue);
                            setEditTitleHandler(newValue)
                        }, 
                        editTitle == EDIT_TITLE.yes)}

                    
                    {getGroup(props, translate("FolderColors") + ":", [
                        {
                            icon: getIcon("folder", 35, 'red'), selected: useColorSetting === USE_COLOR.yes,
                            callback: () => setUseColorHandler(USE_COLOR.yes)
                        },
                        {
                            icon: getIcon("folder", 35, 'gray'), selected: useColorSetting === USE_COLOR.no,
                            callback: () => setUseColorHandler(USE_COLOR.no)
                        }
                    ])}
                </TouchableOpacity>
            </ScrollView>

        </FadeInView>
    </TouchableOpacity>
}

function getButtonWithText() {
    return getRoundedButtonInt(this.OK, 'check-green', translate("BtnSave"), 30, 30, { width: 150, height: 40 })
}

function getButtonWithoutText() {
    return getRoundedButtonInt(this.OK, 'check-green', "", 30, 30, { width: 40, height: 40 })
}

function getGroup(props, name, items) {
    return <View style={{ width: '100%', paddingTop: 25, paddingRight: 25, alignItems: 'flex-end' }}>
        <Text style={styles.SettingsHeaderText}>{name}</Text>

        {items.map((item, index) =>
            <TouchableOpacity
                key={index}
                style={{ flexDirection: 'row', paddingRight: 35, paddingTop: 15, alignItems: 'center' }}
                onPress={item.callback}
            >
                {item.icon}
                <Spacer />
                <View style={styles.circle}>
                    {item.selected && <View style={styles.checkedCircle} />}
                </View>
            </TouchableOpacity>
        )}

    </View>
}

function getCheckbox(name, callback, selected) {
    return <View style={{ width: '100%', paddingTop: 25, 
        paddingRight: 25, alignItems: 'flex-end' }}>
        <TouchableOpacity
            style={{ flexDirection: 'row-reverse', paddingRight: 35, paddingTop: 15, alignItems: 'center' }}
            onPress={callback}
        >
            <Spacer />
            <View style={styles.circle}>
                {selected && <View style={styles.checkedCircle} />}
            </View>
            <Text style={styles.SettingsHeaderText}>{name}</Text>
        </TouchableOpacity>
    </View>
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