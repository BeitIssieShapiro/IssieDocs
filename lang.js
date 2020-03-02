import * as RNLocalize from "react-native-localize";
import { Alert, Settings } from "react-native";
import DeviceInfo from 'react-native-device-info';
import { LANGUAGE } from "./settings";

export var gCurrentLang = { languageTag: "he", isRTL: true }
const DEFAULT_LANG = "he";
let gPrefix = "";

var strings = {
    "he": {
        "DefaultAppTitle": "{1} - שולחן העבודה שלי",
        "MissingFolderName": "חובה להזין שם תיקיה",
        "SaveFolderWithEmptyNameQuestion": "שמירת תיקייה ללא שם?",
        "MissingPageName": "חובה להזין שם לדף",
        "IllegalCharacterInFolderName": "שם תיקיה מכיל תווים לא חוקיים",
        "IllegalCharacterInPageName": "שם הקובץ מכיל תווים לא חוקיים",
        "FolderAlreadyExists": "תיקיה בשם זה כבר קיימת",
        "PageAlreadyExists": "קובץ בשם זה כבר קיים",
        "ShareSuccessful": "שיתוף הסתיים בהצלחה",
        "ActionCancelled": "הפעולה בוטלה",
        "PDFLoadFailed": "טעינת PDF נכשלה",
        "DefaultFolder": "ללא נושא",

        "DeletePageTitle": "מחיקת דף",
        "DeleteFolderTitle": "מחיקת תיקייה",
        "BeforeDeletePageQuestion": "האם למחוק את הדף?",
        "DeleteFoldersAndPagesTitle": "מחיקת תיקיות ודפים",
        "BeforeDeleteFolderQuestion": "מחיקת תיקייה תגרום למחיקת כל הדפים בתוכה, האם למחוק?",
        "BeforeDeleteFoldersAndPagesQuestion": "נבחרה מחיקת דפים ותיקיות. מחיקת התיקיות תמחק את כל הדפים בתוכן. האם להמשיך?",

        "NoPagesYet": "אין עדיין דפים",
        "NoFoldersYet": "אין עדיין תיקיות",

        "SavePageFormTitle": "שמור דף",
        "RenameFormTitle": "שנה שם",
        "DuplicatePageFormTitle": "שכפל דף",
        "MovePageFormTitle": "העבר דף",

        "EditFolderFormTitle": "עריכת שם תיקיה",
        "NewFolderFormTitle": "יצירת תיקיה חדשה",
        "ShareWithTitle": "'שתף בעזרת...'",
        "ShareEmailSubject": "דף עבודה",

        "CameraTitle": "צילום דף עבודה",
        "MediaPickerTitle": "בחירת תמונה",

        //buttons
        "A": "א",
        "A B C": "א ב ג",

        "Menu": "תפריט",
        "Display": "תצוגה",
        "Language": "שפה",
        "TextInButtons":"טקסט בכפתורים",
        "FolderColors":"צבעי תיקיות",
        "Warning": "אזהרה",
        "BtnContinue": "המשך",
        "BtnCancel": "בטל",
        "BtnNextPage": "דף הבא",
        "BtnPreviousPage": "דף קודם",
        "BtnNewFolder": "תיקיה חדשה",
        "BtnAddPage": "דף נוסף",
        "BtnSave": "שמור",
        "BtnShare": "שתף",
        "BtnChangeName": "שנה שם",
        "BtnDelete": "מחק",
        "BtnDuplicate": "הכפל",

        "CaptionPageName": "שם הדף",
        "CaptionFolderNameList": "תיקיה",
        "CaptionFolderNameInput": "שם התיקיה",
        "CaptionFolderColor":"צבע התיקיה", //todo translate
        "NoIcon": "ללא",
        "CaptionIcon": "סמל",

        "ImportProgress": "מייבא דף {1} מתוך {2}",
        "ExportProgress": "מייצא דף {1} מתוך {2}"

    },
    "ar": {
                "DefaultAppTitle": "{1} - للتطبيق الرئيسي",
                "MissingFolderName": "يجب إدخال اسم مجلد",
                "SaveFolderWithEmptyNameQuestion": "حفظ مجلد بدون اسم؟",
                "MissingPageName": "يجب إدخال اسم الصفحة",
                "IllegalCharacterInFolderName": "يحتوي اسم المجلد على أحرف غير صالحة",
                "IllegalCharacterInPageName": "يحتوي اسم الملف على أحرف غير صالحة",
                "FolderAlreadyExists": "يوجد مجلد بهذا الاسم",
                "PageAlreadyExists": "ملف بهذا الاسم موجود",
                "ShareSuccessful": "انتهت المشاركة بنجاح",
                "ActionCancelled": "تم إلغاء الإجراء",
                "PDFLoadFailed": "فشل في تحميل ملف PDF",
                "DefaultFolder": "الغة الرئيسيه للمجلد",

                "DeletePageTitle": "حذف الصفحة",
                "DeleteFolderTitle": "حذف المجلد",
                "BeforeDeletePageQuestion": "حذف الصفحة؟",
                "DeleteFoldersAndPagesTitle": "حذف المجلدات والعناوين",
                "BeforeDeleteFolderQuestion": "حذف المجلد سيؤدي إلى مسح جميع الصفحات داخله, وحذفه",
                "BeforeDeleteFoldersAndPagesQuestion": "اختير حذف الصفحات والمجلدات. حذف المجلدات سيؤدي إلى حذف جميع الصفحات والمحتويات. هل تريد المتابعة؟",

                "NoPagesYet": "لا توجد صفحات حتى الآن",
                "NoFoldersYet": "لا توجد مجلدات حتى الآن",

                "SavePageFormTitle": "حفظ الصفحة",
                "RenameFormTitle": "تغيير العنوان",
                "DuplicatePageFormTitle": "صفحة مكررة",
                "MovePageFormTitle": "نقل الصفحة",

                "EditFolderFormTitle": "تحرير المجلد",
                "NewFolderFormTitle": "إنشاء مجلد جديد",
                "ShareWithTitle": "المشاركة مع ...",
                "ShareEmailSubject": "مشاركة البريد الإلكتروني",

                "CameraTitle": "تصوير ورقة العمل",
                "MediaPickerTitle": "تحديد الصورة",

                "A": "أ",
                "A B C": "أ ب ج",

                "Menu": "القائمة",
                "Display": "العرض",
                "Language": "اللغة",
                "TextInButtons":"نص الزر",
                "FolderColors":"ألوان المجلد",
                "Warning": "تحذير",
                "BtnContinue": "متابعة",
                "BtnCancel": "إلغاء",
                "BtnNextPage": "الصفحة التالية",
                "Btn PreviousPage": "الصفحة السابقة",
                "BtnNewFolder": "مجلد جديد",
                "BtnAddPage": "صفحة أخرى",
                "BtnSave": "حفظ",
                "BtnShare": "مشاركة",
                "BtnChangeName": "إعادة تسمية",
                "BtnDelete": "حذف",
                "BtnDuplicate": "تكرير",

                "CaptionPageName": "اسم الصفحة",
                "CaptionFolderNameList": "مجلد",
                "CaptionFolderNameInput": "اسم المجلد",
                "NoIcon": "بلا",
                "CaptionIcon": "رمز",

                "ImportProgress": "استيراد الصفحة {1} من {2}",
                "ExportProgress": "تصدير الصفحة {1} من {2}"
            }
}

const foldersAndIcons = {
    "he": [
        { icon: 'exposure-plus-1', text: 'חשבון' },
        { icon: 'speaker-notes', text: 'עברית' },
        { icon: 'language', text: 'אנגלית' },
        { icon: 'wb-incandescent', text: 'מדעים' },
        { icon: 'book', text: 'תורה' },
        { icon: 'watch-later', text: 'היסטוריה' },
        { icon: 'public', text: 'גיאוגרפיה' },
        { icon: 'music-note', text: 'מוזיקה' },
        { icon: 'local-library', text: 'ספרות' }
    ],
    "en": [
        { icon: 'language', text: 'אנגלית' },
        { icon: 'music-note', text: 'מוזיקה' },
        { icon: 'pets', text: 'בעלי חיים' },
        { icon: 'exposure-plus-1', text: 'חשבון' },
        { icon: 'wb-incandescent', text: 'מדעים' },
        { icon: 'watch-later', text: 'היסטוריה' },
        { icon: 'book', text: 'תורה' },
        { icon: 'speaker-notes', text: 'לשון' },
        { icon: 'local-bar', text: 'חגים' }
    ],
    "ar": [
        { icon: 'language', text: 'english' },
        { icon: 'music-note', text: 'music' },
        { icon: 'pets', text: 'animals' },
        { icon: 'exposure-plus-1', text: 'الحساب' },
        { icon: 'wb-incandescent', text: 'العلوم' },
        { icon: 'watch-later', text: 'history' },
        { icon: 'book', text: 'Torah' },
        { icon: 'speaker-notes', text: 'tongue' },
        { icon: 'local-bar', text: 'holiday' }
    ]

}


var currStrings = strings[DEFAULT_LANG];


export function registerLangEvent() {
    RNLocalize.addEventListener("change", loadLanguage);
    loadLanguage();

}

export function unregisterLangEvent() {
    RNLocalize.removeEventListener("change", loadLanguage)
}

export function loadLanguage() {
    let langSetting = Settings.get('language');
    if (langSetting === undefined || langSetting === LANGUAGE.default) {
        gCurrentLang = RNLocalize.findBestAvailableLanguage(["he", "ar", "en-US", "en"])
    } else {
        switch (langSetting) {
            case LANGUAGE.hebrew:
                gCurrentLang = { languageTag: "he", isRTL: true }
                break;
            case LANGUAGE.arabic:
                gCurrentLang = { languageTag: "ar", isRTL: true }
                break;
            case LANGUAGE.english:
                gCurrentLang = { languageTag: "en", isRTL: false }
                break;
        }
    }
    currStrings = strings[gCurrentLang.languageTag];
    if (!currStrings) {
        //remove the specifics
        let tag = gCurrentLang.languageTag.split("-");

        if (tag.length == 2) {
            currStrings = strings[tag[0]];
        }
        //default
        if (!currStrings) {
            currStrings = strings[DEFAULT_LANG];
        }
    }

    if (DeviceInfo.isEmulator()) {
        gPrefix = "."
    }

    //Alert.alert(JSON.stringify(currStrings));

}

function isRTL() {
    return gCurrentLang.isRTL();
}

export function translate(id, ...args) {
    let s = currStrings[id];
    if (!s) {
        //not found, defaults to hebrew
        s = strings[DEFAULT_LANG][id];
        if (!s) {
            s = id;
        }
    }

    return gPrefix + s;
}

export function fTranslate(id, ...args) {
    return replaceArgs(translate(id), args);
}

export function getLocalizedFoldersAndIcons() {
    let currFoldersAndIcon = foldersAndIcons[gCurrentLang.languageTag];
    if (!currFoldersAndIcon) {
        //remove the specifics
        let tag = gCurrentLang.languageTag.split("-");
        if (tag.length == 2) {
            currFoldersAndIcon = foldersAndIcons[tag[0]];
        }
        //default
        if (!currFoldersAndIcon) {
            currFoldersAndIcon = strings[DEFAULT_LANG];
        }
    }
    return currFoldersAndIcon;
}

function replaceArgs(s, args) {
    return s.replace(/{(\d+)}/g, function (match, number) {
        return typeof args[number - 1] != 'undefined'
            ? args[number - 1]
            : match
            ;
    });
}