import { trace } from "./log"
import { Settings } from "./new-settings"

export const VIEW = {
    name: 'viewStyle',
    list: 1,
    tiles: 2
}

export const FOLDERS_VIEW = {
    name: 'foldersViewStyle',
    column: 1,
    tree: 2
}


export const LANGUAGE = {
    name: 'language',
    default: 1,
    hebrew: 2,
    arabic: 3,
    english: 4
}

export const FEATURES = {
    name: 'features',
    ruler: 1,
    marker: 2,
    table: 3,
    image: 4,
    voice: 5,
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

export const SCROLL_BUTTONS = {
    name: 'scrollButtons',
    yes: 1,
    no: 2
}

export const LAST_COLORS = {
    name: 'lastColors',
    max: 4
}

export function getUseColorSetting() {
    return getSetting(USE_COLOR.name, USE_COLOR.yes);
}

export function getFeaturesSetting() {
    const features = getSetting(FEATURES.name)
    if (features && Array.isArray(features)) return features;
    return [FEATURES.image, FEATURES.marker, FEATURES.ruler, FEATURES.table, FEATURES.voice];
}

export function getUseTextSetting() {
    return getSetting(TEXT_BUTTON.name, TEXT_BUTTON.yes) === TEXT_BUTTON.yes;
}

export function getSetting(name, def) {
    let setting = Settings.get(name);
    if (isSettingEmpty(setting)) {
        setting = def;
    }
    return setting;
}

export function isSettingEmpty(val) {
    return val == undefined || val == null;
}

