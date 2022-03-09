import * as RNLocalize from "react-native-localize";
import { Alert, Settings } from "react-native";
import { LANGUAGE } from "./settings";
import { isSimulator } from "./device";

export var gCurrentLang = { languageTag: "he", isRTL: true }
const DEFAULT_LANG = "he";
let gPrefix = "";

var strings = {
    "he": {
        "StartHere": "הוספת דפים",
        "DesktopEmpty":"שולחן העבודה ריק",
        "Loading":"טוען...",
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
        "DefaultFolder": "כללי", 
        "Search":"חפש",

        "DeletePageTitle": "מחיקת דף",
        "DeleteFolderTitle": "מחיקת תיקייה",
        "BeforeDeletePageQuestion": "האם למחוק את הדף?",
        "BeforeDeleteSubPageQuestion":"מחיקת עמוד {1} מתוך {2}", 

        "DeleteFoldersAndPagesTitle": "מחיקת תיקיות ודפים",
        "BeforeDeleteFolderQuestion": "מחיקת תיקייה תגרום למחיקת כל הדפים בתוכה, האם למחוק?",
        "BeforeDeleteFoldersAndPagesQuestion": "נבחרה מחיקת דפים ותיקיות. מחיקת התיקיות תמחק את כל הדפים בתוכן. האם להמשיך?",

        "NoPagesYet": "התיקיה ריקה",
        "ChooseFolder": "בחר תיקיה",

        "SearchResults": "תוצאות חיפוש",
        "NoSearchResults": "לא נמצאו תיקיות או דפי עבודה המתאימים לחיפוש",

        "SavePageFormTitle": "שמירת דף",
        "RenameFormTitle": "שנה שם",
        "DuplicatePageFormTitle": "שכפל דף",
        "MovePageFormTitle": "העבר דף",

        "EditFolderFormTitle": "עריכת שם תיקיה",
        "NewFolderFormTitle": "יצירת תיקיה חדשה",
        "ShareWithTitle": "'שיתוף בעזרת...'",
        "ShareEmailSubject": "דף עבודה",

        "CameraTitle": "צילום דף עבודה",
        "MediaPickerTitle": "בחירת תמונה",

        //buttons
        "A": "א",
        "A B C": "א ב ג",

        "SortA": "א",
        "SortZ": "ת",
        "Menu": "תפריט",
        "Settings": "הגדרות",
        "About": "עלינו",
        "Display": "תצוגה",
        "Language": "שפה",
        "AllowEditTitle": "עריכת כותרת",
        "TextInButtons": "עיצוב כפתורים",
        "FolderColors": "צבעי תיקיות",
        "Warning": "אזהרה",
        "BtnContinue": "המשך",
        "BtnCancel": "ביטול",
        "BtnNextPage": "הבא",
        "BtnPreviousPage": "הקודם",
        "BtnNewFolder": "תיקיה חדשה",
        "BtnAddPhoto": "בחר תמונה",
        "BtnAddPage": "דף נוסף",
        "BtnSave": "שמירה",
        "BtnShare": "שיתוף",
        "BtnChangeName": "שינוי שם",
        "BtnDelete": "מחיקה",
        "BtnDuplicate": "הכפלה",
        "MenuFromCamera": "מצלמה",
        "MenuFromMediaLib": "ספריית התמונות",
        "MenuNewPageEmpty": "חלק",
        "MenuNewPageLines": "שורות",
        "MenuNewPageMath": "משבצות",
        "EmptyPageName":"דף חדש",

        "CaptionPageName": "שם הדף",
        "CaptionFolderNameList": "תיקיה",
        "CaptionFolderNameInput": "שם התיקיה",
        "CaptionFolderColor": "צבע התיקיה",
        "NoIcon": "ללא",
        "CaptionIcon": "סמל",

        "ImportProgress": "מייבא דף {1} מתוך {2}",
        "ExportProgress": "מייצא דף {1} מתוך {2}",

        "MissingCameraPermission": `לא ניתנה רשות לשימוש במצלמה לאפליקציה
        למתן רשות יש לגשת להגדרות -> פרטיות -> מצלמה, ולאפשר שימוש עבור IssieDocs`, //todo translate

    },
    "ar": {
        "StartHere": "إضافة صفحات",
        "DesktopEmpty":"التطبيق الرئيسي فارغ",
        "Loading":"جار التحميل...",
        "DefaultAppTitle": "{1} - التطبيق الرئيسي",
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
        "DefaultFolder": "عام",
        "Search":"بحث",
        "SearchResults": "نتائج البحث",
        
        "NoSearchResults": "لم يتم العثور على مجلدات أو أوراق عمل بحسب عملية البحث",

        "DeletePageTitle": "حذف الصفحة",
        "DeleteFolderTitle": "حذف المجلد",
        "BeforeDeletePageQuestion": "حذف الصفحة؟",
        "BeforeDeleteSubPageQuestion":"احذف الصفحة {1} من {2}",
        "DeleteFoldersAndPagesTitle": "حذف المجلدات والعناوين",
        "BeforeDeleteFolderQuestion": "حذف المجلد سيؤدي إلى مسح جميع الصفحات داخله, وحذفه",
        "BeforeDeleteFoldersAndPagesQuestion": "اختير حذف الصفحات والمجلدات. حذف المجلدات سيؤدي إلى حذف جميع الصفحات والمحتويات. هل تريد المتابعة؟",

        "NoPagesYet": "المجلد فارغ",
        "ChooseFolder": "اختار مجلد", 
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

        "SortA": "أ",
        "SortZ":"ي",
        "Settings": "الإعدادات",
        "Menu": "القائمة",
        "Display": "العرض",
        "About": "عنا",
        "Language": "اللغة",
        "AllowEditTitle": "تحرير العنوان",
        "TextInButtons": "تصميم الأزرار",
        "CaptionFolderColor": "لون المجلد", 
        "FolderColors": "ألوان المجلد",
        "Warning": "تحذير",
        "BtnContinue": "متابعة",
        "BtnCancel": "إلغاء",
        "BtnNextPage": "التالى",
        "BtnPreviousPage": "السابق",
        "BtnNewFolder": "مجلد جديد",
        "BtnAddPage": "صفحة أخرى",
        "BtnSave": "حفظ",
        "BtnShare": "مشاركة",
        "BtnChangeName": "إعادة تسمية",
        "BtnDelete": "حذف",
        "BtnDuplicate": "تكرير",

        "MenuFromCamera": "الة تصوير",
        "MenuFromMediaLib": "مكتبة الصور",
        "MenuNewPageEmpty": "صفحة فارغة جديدة",
        "MenuNewPageLines": "صفحة مسطرة جديدة",
        "MenuNewPageMath": "صفحة مشبكة جديدة",
        "EmptyPageName":"صفحة جديدة",

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
    "he_gib": [
        { icon: 'svg-math-course', text: 'חשבון' },
        { icon: 'svg-heb-course', text: 'עברית' },
        { icon: 'svg-eng-course', text: 'אנגלית' },
        { icon: 'svg-science-course', text: 'מדעים' },
        { icon: 'svg-torah-course', text: 'תורה' },
        { icon: 'svg-history-course', text: 'היסטוריה' },
        { icon: 'public', text: 'גיאוגרפיה' },
        { icon: 'music-note', text: 'מוזיקה' },
        { icon: 'svg-literature-course', text: 'ספרות' }
    ],
    "he": [
        { icon: 'svg-math-course', text: 'חשבון' },
        { icon: 'svg-heb-course', text: 'עברית' },
        { icon: 'svg-eng-course', text: 'אנגלית' },
        { icon: 'svg-science-course', text: 'מדעים' },
        { icon: 'svg-torah-course', text: 'תורה' },
        { icon: 'account-balance', text: 'היסטוריה' },
        { icon: 'public', text: 'גיאוגרפיה' },
        { icon: 'music-note', text: 'מוזיקה' },
        { icon: 'svg-history-course', text: 'ספרות' }
    ],
    "ar": [
        { icon: 'svg-math-course', text: 'حساب' },
        { icon: 'svg-arabic-course', text: 'عربي' },
        { icon: 'svg-eng-course', text: 'انجليزي' },
        { icon: 'svg-science-course', text: 'علوم' },
        { icon: 'svg-islam-course', text: 'دين' },
        { icon: 'svg-history-course', text: 'تاريخ' },
        { icon: 'public', text: 'جغرافيا' },
        { icon: 'music-note', text: 'موسيقى' },
        { icon: 'svg-literature-course', text: 'أدب' }
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
        //Alert.alert(JSON.stringify(gCurrentLang))
        if (gCurrentLang.languageTag.startsWith("en")) {
            gCurrentLang = { languageTag: "he", isRTL: true }
        }
    } else {
        switch (langSetting) {
            case LANGUAGE.hebrew:
                gCurrentLang = { languageTag: "he", isRTL: true }
                break;
            case LANGUAGE.arabic:
                gCurrentLang = { languageTag: "ar", isRTL: true }
                break;
            case LANGUAGE.english:
                gCurrentLang = { languageTag: "he", isRTL: true }
                break;
            default:
                gCurrentLang = { languageTag: "he", isRTL: true }
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

    if (isSimulator()) {
        //gPrefix = "."
    }
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
        //Alert.alert(gCurrentLang.languageTag)
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