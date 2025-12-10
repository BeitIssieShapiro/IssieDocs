import { ReactNativeFirebaseAppCheckProvider, initializeAppCheck } from '@react-native-firebase/app-check';
import { getApp } from '@react-native-firebase/app';
import { debugToken } from './debug-token.ts';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { logEvent, logAppOpen, logScreenView, getAnalytics } from '@react-native-firebase/analytics';
import { Platform, NativeModules } from 'react-native';
import app from '../../app.json';

const appName = app.name;
let appCheck: any = undefined;
let analytics: any = undefined


export function firebaseInit() {
    // Enable debug mode for react-native-firebase:
    if (__DEV__) (globalThis as any).RNFBDebug = true;

    analytics = getAnalytics();

    const rnfbProvider = new ReactNativeFirebaseAppCheckProvider();
    rnfbProvider.configure({
        android: {
            provider: __DEV__ ? 'debug' : 'playIntegrity',
            debugToken,
        },
        apple: {
            provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
            debugToken,
        }
    });

    initializeAppCheck(getApp(), {
        provider: rnfbProvider,
        isTokenAutoRefreshEnabled: true,
    }).then(ac => {
        appCheck = ac
        console.log("Firebase init complete", debugToken)
        
        // Import Settings dynamically to avoid circular dependencies
        Promise.all([
            import('../settings'),
            import('../new-settings')
        ]).then(([settingsModule, newSettingsModule]) => {
            const { LANGUAGE, VIEW, FOLDERS_VIEW, FEATURES, USE_COLOR, TEXT_BUTTON, getFeaturesSetting } = settingsModule;
            const Settings = (newSettingsModule as any).Settings;
            
            // Gather all settings context
            const lang = Settings.get(LANGUAGE.name);
            const langMap: { [key: number]: string } = {
                [LANGUAGE.default]: 'default',
                [LANGUAGE.hebrew]: 'hebrew',
                [LANGUAGE.arabic]: 'arabic',
                [LANGUAGE.english]: 'english'
            };
            
            const viewMode = Settings.get(VIEW.name);
            const viewModeMap: { [key: number]: string } = {
                [VIEW.list]: 'list',
                [VIEW.tiles]: 'tiles'
            };
            
            const folderMode = Settings.get(FOLDERS_VIEW.name);
            const folderModeMap: { [key: number]: string } = {
                [FOLDERS_VIEW.column]: 'column',
                [FOLDERS_VIEW.tree]: 'tree'
            };
            
            const enabledFeatures = getFeaturesSetting();
            
            // Check which features are enabled
            const rulerEnabled = enabledFeatures.includes(FEATURES.ruler);
            const markerEnabled = enabledFeatures.includes(FEATURES.marker);
            const tableEnabled = enabledFeatures.includes(FEATURES.table);
            const imageEnabled = enabledFeatures.includes(FEATURES.image);
            const voiceEnabled = enabledFeatures.includes(FEATURES.voice);
            
            const useColor = Settings.get(USE_COLOR.name);
            const buttonDesign = useColor === USE_COLOR.yes ? 'color' : 'monochrome';
            
            const useText = Settings.get(TEXT_BUTTON.name);
            const textButtons = useText === TEXT_BUTTON.yes ? 'enabled' : 'disabled';
            
            const editDesktopEnabled = Settings.get('editDesktopEnabled');
            
            // Get device language
            const deviceLang = Platform.OS === 'ios' 
                ? NativeModules.SettingsManager?.settings?.AppleLocale || NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
                : NativeModules.I18nManager?.localeIdentifier;
            
            analyticEvent(AnalyticEvent.application_start, {
                app_language: langMap[lang] || 'default',
                device_language: deviceLang?.substring(0, 2) || 'unknown',
                view_mode: viewModeMap[viewMode] || 'list',
                folder_mode: folderModeMap[folderMode] || 'column',
                ruler_enabled: rulerEnabled ? 1 : 0,
                marker_enabled: markerEnabled ? 1 : 0,
                table_enabled: tableEnabled ? 1 : 0,
                image_enabled: imageEnabled ? 1 : 0,
                voice_enabled: voiceEnabled ? 1 : 0,
                button_design: buttonDesign,
                text_buttons: textButtons,
                edit_desktop_enabled: editDesktopEnabled ? 'yes' : 'no'
            });
        }).catch(err => {
            console.error("Failed to load settings for analytics", err);
            // Fallback to basic app start event
            analyticEvent(AnalyticEvent.application_start);
        });
    });
}

export async function addUserFeedback(txt: string) {
    const app = getApp()
    const functions = getFunctions(app, "europe-west1");
    const addUserFeedbackFunc = httpsCallable(functions, "addUserFeedback");

    return addUserFeedbackFunc({
        appName: "IssieDocs",
        feedbackText: txt
    });
}

//export type AnalyticEvent = "ApplicationStart" | "SettingsOpen" | "ChangeLanguage" | string;
export enum AnalyticEvent {
    // App Lifecycle
    application_start = "application_start",
    
    // Settings
    settings_open = "settings_open",
    settings_close = "settings_close",
    language_changed = "language_changed",
    feature_toggled = "feature_toggled",
    app_title_edited = "app_title_edited",
    
    // Page Management
    page_created = "page_created",
    page_opened = "page_opened",
    page_deleted = "page_deleted",
    page_duplicated = "page_duplicated",
    page_shared = "page_shared",
    page_navigation = "page_navigation",
    blank_page_added = "blank_page_added",
    
    // Folder Management
    folder_created = "folder_created",
    folder_opened = "folder_opened",
    folder_deleted = "folder_deleted",
    folder_renamed = "folder_renamed",
    folder_moved = "folder_moved",
    
    // Drawing Tools
    brush_used = "brush_used",
    marker_used = "marker_used",
    eraser_used = "eraser_used",
    ruler_used = "ruler_used",
    
    // Text Operations
    text_added = "text_added",
    text_edited = "text_edited",
    text_formatted = "text_formatted",
    
    // Image Operations
    image_added = "image_added",
    image_resized = "image_resized",
    
    // Audio Operations
    audio_recorded = "audio_recorded",
    audio_played = "audio_played",
    
    // Table Operations
    table_added = "table_added",
    table_modified = "table_modified",
    
    // Element Deletion (generic)
    element_deleted = "element_deleted",
    
    // Sub-page Operations
    subpage_added = "subpage_added",
    subpage_deleted = "subpage_deleted",
    
    // Canvas/Editor Interactions
    zoom_used = "zoom_used",
    canvas_panned = "canvas_panned",
    undo_used = "undo_used",
    redo_used = "redo_used",
    
    // Navigation & UI
    search_performed = "search_performed",
    sort_changed = "sort_changed",
    view_mode_changed = "view_mode_changed",
    folder_mode_change = "folder_mode_change",
    
    // Import/Export
    backup_created = "backup_created",
    backup_restored = "backup_restored",
    file_imported = "file_imported",
    worksheet_exported = "worksheet_exported",
    
    // Context Menus
    context_menu_opened = "context_menu_opened",
    
    // Screens
    about_screen_opened = "about_screen_opened",
    
    // Custom Selections
    custom_color_selected = "custom_color_selected",
    custom_text_size_selected = "custom_text_size_selected",
}

// Helper functions for categorizing data (privacy-safe)
export function categorizeCount(count: number): string {
    if (count === 0) return "0";
    if (count <= 5) return "1-5";
    if (count <= 20) return "6-20";
    return "20+";
}

export function categorizeDuration(seconds: number): string {
    if (seconds < 60) return "0-1min";
    if (seconds < 300) return "1-5min";
    if (seconds < 900) return "5-15min";
    if (seconds < 1800) return "15-30min";
    return "30min+";
}

export function categorizeSize(size: number, type: 'font' | 'stroke'): string {
    if (type === 'font') {
        if (size < 20) return "small";
        if (size < 40) return "medium";
        return "large";
    } else { // stroke
        if (size < 3) return "thin";
        if (size < 10) return "medium";
        return "thick";
    }
}

export function categorizeColor(color: string): string {
    const colorMap: { [key: string]: string } = {
        '#000000': 'black',
        '#FFFFFF': 'white',
        '#FF0000': 'red',
        '#0000FF': 'blue',
        '#FFFF00': 'yellow',
        '#00FF00': 'green',
        '#FFA500': 'orange',
        '#800080': 'purple',
        '#FFC0CB': 'pink',
    };
    
    const upperColor = color.toUpperCase().substring(0, 7);
    return colorMap[upperColor] || 'other';
}

export function categorizeTextLength(length: number): string {
    if (length === 0) return "0";
    if (length <= 10) return "1-10";
    if (length <= 50) return "11-50";
    if (length <= 100) return "51-100";
    return "100+";
}

export async function analyticEvent(eventName: AnalyticEvent | string, params?: { [key: string]: any }) {
    if (!analytics) return;

    if (eventName == AnalyticEvent.application_start) {
        // Enhanced with settings context - log as both app_open and with params
        await logAppOpen(analytics);
        if (params && Object.keys(params).length > 0) {
            return logEvent(analytics, eventName, params);
        }
        return;
    }

    return logEvent(analytics, eventName, params)
}
