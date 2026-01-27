import {
  firebaseInit,
  AnalyticEvent,
  analyticEvent,
} from '@beitissieshapiro/issie-shared';
import { debugToken } from './debug-token';
import { NativeModules, Platform } from 'react-native';
export {
  analyticEvent,
  categorizeColor,
  categorizeCount,
  categorizeDuration,
  categorizeSize,
} from '@beitissieshapiro/issie-shared';
export function firebaseLocalInit() {
  firebaseInit(debugToken);

  // Import Settings dynamically to avoid circular dependencies
  Promise.all([import('../settings'), import('../new-settings')])
    .then(([settingsModule, newSettingsModule]) => {
      const {
        LANGUAGE,
        VIEW,
        FOLDERS_VIEW,
        FEATURES,
        USE_COLOR,
        TEXT_BUTTON,
        getFeaturesSetting,
      } = settingsModule;
      const Settings = (newSettingsModule as any).Settings;

      // Gather all settings context
      const lang = Settings.get(LANGUAGE.name);
      const langMap: { [key: number]: string } = {
        [LANGUAGE.default]: 'default',
        [LANGUAGE.hebrew]: 'hebrew',
        [LANGUAGE.arabic]: 'arabic',
        [LANGUAGE.english]: 'english',
      };

      const viewMode = Settings.get(VIEW.name);
      const viewModeMap: { [key: number]: string } = {
        [VIEW.list]: 'list',
        [VIEW.tiles]: 'tiles',
      };

      const folderMode = Settings.get(FOLDERS_VIEW.name);
      const folderModeMap: { [key: number]: string } = {
        [FOLDERS_VIEW.column]: 'column',
        [FOLDERS_VIEW.tree]: 'tree',
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
      const deviceLang =
        Platform.OS === 'ios'
          ? NativeModules.SettingsManager?.settings?.AppleLocale ||
            NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
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
        edit_desktop_enabled: editDesktopEnabled ? 'yes' : 'no',
      });
    })
    .catch(err => {
      console.error('Failed to load settings for analytics', err);
      // Fallback to basic app start event
      analyticEvent(AnalyticEvent.application_start);
    });
}

export enum LocalAnalyticEvent {
  language_changed = 'language_changed',
  feature_toggled = 'feature_toggled',
  app_title_edited = 'app_title_edited',

  // Page Management
  page_created = 'page_created',
  page_opened = 'page_opened',
  page_deleted = 'page_deleted',
  page_duplicated = 'page_duplicated',
  page_shared = 'page_shared',
  page_navigation = 'page_navigation',
  blank_page_added = 'blank_page_added',

  // Folder Management
  folder_created = 'folder_created',
  folder_opened = 'folder_opened',
  folder_deleted = 'folder_deleted',
  folder_renamed = 'folder_renamed',
  folder_moved = 'folder_moved',

  // Drawing Tools
  brush_used = 'brush_used',
  marker_used = 'marker_used',
  eraser_used = 'eraser_used',
  ruler_used = 'ruler_used',

  // Text Operations
  text_added = 'text_added',
  text_edited = 'text_edited',
  text_formatted = 'text_formatted',

  // Image Operations
  image_added = 'image_added',
  image_resized = 'image_resized',

  // Audio Operations
  audio_recorded = 'audio_recorded',
  audio_played = 'audio_played',

  // Table Operations
  table_added = 'table_added',
  table_modified = 'table_modified',

  // Element Deletion (generic)
  element_deleted = 'element_deleted',

  // Sub-page Operations
  subpage_added = 'subpage_added',
  subpage_deleted = 'subpage_deleted',

  // Canvas/Editor Interactions
  zoom_used = 'zoom_used',
  canvas_panned = 'canvas_panned',
  undo_used = 'undo_used',
  redo_used = 'redo_used',

  // Navigation & UI
  sort_changed = 'sort_changed',
  view_mode_changed = 'view_mode_changed',
  folder_mode_change = 'folder_mode_change',

  // Import/Export
  worksheet_exported = 'worksheet_exported',
  folder_exported = 'folder_exported',

  // Context Menus
  context_menu_opened = 'context_menu_opened',

  // Custom Selections
  custom_color_selected = 'custom_color_selected',
  custom_text_size_selected = 'custom_text_size_selected',
}
