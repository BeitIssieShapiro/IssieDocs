import { Settings } from 'react-native';

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

export function getSetting(name, def) {
    let setting = Settings.get(name);
    if (setting === undefined) {
        setting = def;
    }
    return setting;
}