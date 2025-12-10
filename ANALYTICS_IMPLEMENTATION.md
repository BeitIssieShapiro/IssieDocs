# IssieDocs Analytics Implementation

## Overview

This document provides a comprehensive guide to the Google Analytics implementation in the IssieDocs application. The analytics tracking is designed to help understand which features are most used while maintaining user privacy through data categorization.

## Implementation Summary

### Files Modified

1. **src/common/firebase.ts** - Core analytics infrastructure
2. **src/FolderGallery.js** - Folder and page management tracking
3. **src/settings-ui.js** - Settings and preferences tracking
4. **src/IssieEditPhoto2.tsx** - Editor and canvas tracking
5. **src/canvas/canvas.tsx** - Undo/redo tracking
6. **src/file-context-menu.js** - Context menu tracking

## Analytics Events

### 1. Application Lifecycle

#### application_start
**When**: App launches
**Parameters**:
- `app_language`: User's selected app language (default, hebrew, arabic, english)
- `device_language`: Device's system language (2-letter code)
- `view_mode`: Preferred view mode (list, tiles)
- `folder_mode`: Folder organization preference (column, tree)
- `ruler_enabled`: Whether ruler tool is enabled (1 or 0)
- `marker_enabled`: Whether marker tool is enabled (1 or 0)
- `table_enabled`: Whether table tool is enabled (1 or 0)
- `image_enabled`: Whether image tool is enabled (1 or 0)
- `voice_enabled`: Whether voice tool is enabled (1 or 0)
- `button_design`: Button appearance (color, monochrome)
- `text_buttons`: Text button preference (enabled, disabled)
- `edit_desktop_enabled`: Desktop editing setting (yes, no)

**Purpose**: Understand user demographics and initial configuration preferences

**Note**: Each tool has a separate boolean parameter (1 = enabled, 0 = disabled) for easier filtering and analysis in Google Analytics dashboards.

---

### 2. Settings Management

#### settings_open
**When**: Settings screen opens
**Parameters**: None
**Purpose**: Track settings screen engagement

#### settings_close
**When**: Settings screen closes
**Parameters**: None
**Purpose**: Track settings screen usage duration

#### language_changed
**When**: User changes app language
**Parameters**:
- `from_language`: Previous language
- `to_language`: New language
**Purpose**: Understand language preferences and switching patterns

#### feature_toggled
**When**: User enables/disables a feature (ruler, marker, table, image, voice)
**Parameters**:
- `feature`: Name of the feature (ruler, marker, table, image, voice)
- `enabled`: New state (yes, no)
**Purpose**: Track which features are most/least used

#### app_title_edited
**When**: User changes the app title in settings
**Parameters**: None
**Purpose**: Track customization engagement

---

### 3. Page Management

#### page_created
**When**: New page is created
**Parameters**:
- `method`: How page was created (new, duplicate, import)
**Purpose**: Understand page creation patterns

#### page_opened
**When**: User opens/edits a page
**Parameters**: None
**Purpose**: Track page editing frequency

#### page_deleted
**When**: User deletes a page
**Parameters**:
- `page_count`: Categorized count of remaining pages (0, 1-5, 6-20, 20+)
**Purpose**: Understand content management patterns

#### page_duplicated
**When**: User duplicates a page
**Parameters**: None
**Purpose**: Track duplication feature usage

#### page_shared
**When**: User shares a page
**Parameters**:
- `method`: Sharing method used
**Purpose**: Understand sharing patterns

#### page_navigation
**When**: User navigates between pages in editor
**Parameters**:
- `direction`: Navigation direction (next, previous, specific)
**Purpose**: Track multi-page document usage

#### blank_page_added
**When**: User adds a blank page to a document
**Parameters**: None
**Purpose**: Track page addition patterns

---

### 4. Folder Management

#### folder_created
**When**: New folder is created
**Parameters**: None
**Purpose**: Track folder organization usage

#### folder_opened
**When**: User opens a folder
**Parameters**:
- `item_count`: Categorized count of items in folder (0, 1-5, 6-20, 20+)
**Purpose**: Understand folder usage patterns

#### folder_deleted
**When**: User deletes a folder
**Parameters**: None
**Purpose**: Track folder management patterns

#### folder_renamed
**When**: User renames a folder
**Parameters**: None
**Purpose**: Track folder customization

#### folder_moved
**When**: User moves folder to different location
**Parameters**: None
**Purpose**: Track folder reorganization patterns

---

### 5. Drawing Tools

#### brush_used
**When**: User uses the brush tool
**Parameters**:
- `color`: Categorized color (black, white, red, blue, etc.)
- `size`: Categorized size (thin, medium, thick)
**Purpose**: Understand drawing preferences

#### marker_used
**When**: User uses the marker/highlighter tool
**Parameters**:
- `color`: Categorized color
- `size`: Categorized size
**Purpose**: Track highlighting usage

#### eraser_used
**When**: User uses the eraser tool
**Parameters**:
- `size`: Categorized size (small, medium, large)
**Purpose**: Track error correction patterns

#### ruler_used
**When**: User uses the ruler tool
**Parameters**: None
**Purpose**: Track structured drawing feature usage

---

### 6. Text Operations

#### text_added
**When**: User adds text to canvas
**Parameters**:
- `font_size`: Categorized size (small, medium, large)
- `has_formatting`: Whether text has formatting (yes, no)
**Purpose**: Understand text usage patterns

#### text_edited
**When**: User edits existing text
**Parameters**:
- `length_category`: Categorized text length (0, 1-10, 11-50, 51-100, 100+)
**Purpose**: Track text editing engagement

#### text_formatted
**When**: User applies formatting to text
**Parameters**:
- `format_type`: Type of formatting (bold, italic, underline, color, size)
**Purpose**: Understand formatting feature usage

---

### 7. Image Operations

#### image_added
**When**: User adds an image to canvas
**Parameters**:
- `source`: Image source (camera, gallery, sticker)
**Purpose**: Track image addition patterns

#### image_resized
**When**: User resizes an image
**Parameters**: None
**Purpose**: Track image manipulation usage

---

### 8. Audio Operations

#### audio_recorded
**When**: User records audio
**Parameters**:
- `duration_category`: Categorized duration (0-1min, 1-5min, 5-15min, 15-30min, 30min+)
**Purpose**: Understand audio feature usage

#### audio_played
**When**: User plays audio
**Parameters**: None
**Purpose**: Track audio playback engagement

---

### 9. Table Operations

#### table_added
**When**: User adds a table to canvas
**Parameters**:
- `rows`: Number of rows
- `columns`: Number of columns
**Purpose**: Track table feature usage

#### table_modified
**When**: User modifies table (add/remove rows/columns)
**Parameters**:
- `action`: Type of modification (add_row, remove_row, add_column, remove_column)
**Purpose**: Understand table editing patterns

---

### 10. Canvas/Editor Interactions

#### zoom_used
**When**: User changes zoom level
**Parameters**:
- `action`: Zoom direction (in, out, reset)
**Purpose**: Track zoom feature usage

#### canvas_panned
**When**: User pans/scrolls the canvas
**Parameters**: None
**Purpose**: Track navigation within large documents

#### undo_used
**When**: User performs undo
**Parameters**: None
**Purpose**: Track error correction patterns

#### redo_used
**When**: User performs redo
**Parameters**: None
**Purpose**: Track workflow patterns

---

### 11. Navigation & UI

#### search_performed
**When**: User searches for pages/folders
**Parameters**:
- `has_results`: Whether search returned results (yes, no)
**Purpose**: Track search feature effectiveness

#### sort_changed
**When**: User changes sort order
**Parameters**:
- `sort_type`: New sort order (date, name, custom)
**Purpose**: Understand organization preferences

#### view_mode_changed
**When**: User switches between list and tile views
**Parameters**:
- `from_mode`: Previous mode (list, tiles)
- `to_mode`: New mode (list, tiles)
**Purpose**: Track view preference changes

#### folder_mode_change
**When**: User switches folder view mode
**Parameters**:
- `from_mode`: Previous mode (column, tree)
- `to_mode`: New mode (column, tree)
**Purpose**: Track folder navigation preference

---

### 12. Import/Export

#### backup_created
**When**: User creates a backup
**Parameters**:
- `item_count`: Categorized count of backed up items
**Purpose**: Track backup feature usage

#### backup_restored
**When**: User restores from backup
**Parameters**: None
**Purpose**: Track backup restoration patterns

#### file_imported
**When**: User imports files
**Parameters**:
- `file_type`: Type of imported file (pdf, image, etc.)
**Purpose**: Track import feature usage

#### worksheet_exported
**When**: User exports worksheet
**Parameters**:
- `format`: Export format (pdf, image, etc.)
**Purpose**: Track export feature usage

---

### 13. Element Operations

#### element_deleted
**When**: User deletes any element from canvas
**Parameters**:
- `element_type`: Type of deleted element (text, image, audio, drawing, table)
**Purpose**: Understand content management patterns

#### subpage_added
**When**: User adds a sub-page
**Parameters**: None
**Purpose**: Track multi-page document usage

#### subpage_deleted
**When**: User deletes a sub-page
**Parameters**: None
**Purpose**: Track page management patterns

---

### 14. Context Menus

#### context_menu_opened
**When**: User opens context menu
**Parameters**:
- `item_type`: Type of item (page, folder)
**Purpose**: Track advanced feature discovery

---

### 15. Screens

#### about_screen_opened
**When**: User opens the About screen
**Parameters**: None
**Purpose**: Track info screen engagement

---

### 16. Custom Selections

#### custom_color_selected
**When**: User selects a custom color from the color wheel picker
**Parameters**:
- `color`: The exact hex color code selected (e.g., "#A3B5C7")
**Purpose**: Track custom color usage to understand if users need colors beyond the preset palette

**Note**: This event only fires when a user creates a custom color using the color wheel, not when selecting from the preset color buttons or recently used colors.

#### custom_text_size_selected
**When**: User selects a custom text size using the slider
**Parameters**:
- `size`: The exact text size selected (e.g., 125, 235)
**Purpose**: Track custom text size usage to understand if preset sizes are sufficient or if users need more flexibility

**Note**: This event only fires when a user uses the slider to select a size that is not one of the preset size buttons. Preset size selections are not tracked.

---

## Privacy & Data Categorization

All sensitive data is categorized before being sent to analytics:

### Categorization Functions

1. **categorizeCount(count)**: Groups counts into ranges (0, 1-5, 6-20, 20+)
2. **categorizeDuration(seconds)**: Groups durations (0-1min, 1-5min, 5-15min, 15-30min, 30min+)
3. **categorizeSize(size, type)**: Groups sizes (small/thin, medium, large/thick)
4. **categorizeColor(color)**: Maps colors to names (black, white, red, blue, etc.)
5. **categorizeTextLength(length)**: Groups text lengths (0, 1-10, 11-50, 51-100, 100+)

### Privacy Principles

- No personal information is collected
- No actual content is sent (text, images, audio)
- All counts and durations are categorized
- Colors are generalized to common names
- File names and paths are never sent
- User identifiers are Firebase-managed (anonymous by default)

---

## Usage Examples

### Tracking a new page creation:

```javascript
import { analyticEvent, AnalyticEvent } from './common/firebase';

// When user creates a page
analyticEvent(AnalyticEvent.page_created, {
    method: 'new'
});
```

### Tracking drawing tool usage:

```javascript
import { analyticEvent, AnalyticEvent, categorizeColor, categorizeSize } from './common/firebase';

// When user uses brush
analyticEvent(AnalyticEvent.brush_used, {
    color: categorizeColor(selectedColor),
    size: categorizeSize(brushSize, 'stroke')
});
```

### Tracking settings changes:

```javascript
import { analyticEvent, AnalyticEvent } from './common/firebase';

// When user toggles a feature
analyticEvent(AnalyticEvent.feature_toggled, {
    feature: 'ruler',
    enabled: 'yes'
});
```

---

## Analytics Dashboard Insights

### Key Metrics to Monitor

1. **Feature Adoption**:
   - Which tools are most/least used (brush, marker, ruler, etc.)
   - Which features are enabled/disabled most often
   - View and folder mode preferences

2. **User Workflows**:
   - How many pages per document (average categorized count)
   - Undo/redo frequency (error rates)
   - Drawing vs text vs image usage ratios

3. **Content Patterns**:
   - Folder organization patterns
   - Page creation methods
   - Content type distribution

4. **User Preferences**:
   - Language distribution
   - View mode preferences
   - Tool settings (color, size preferences)

5. **Engagement Metrics**:
   - Settings access frequency
   - Feature discovery (context menu usage)
   - Advanced feature adoption

---

## Implementation Notes

### Firebase Configuration

The analytics are automatically initialized in `firebaseInit()` which is called at app startup. The implementation includes:

- App Check for security
- Debug mode support during development
- Automatic settings context gathering on app start
- Error handling with fallback events

### Adding New Events

To add a new analytics event:

1. Add the event name to the `AnalyticEvent` enum in `firebase.ts`
2. Call `analyticEvent(AnalyticEvent.your_event_name, params)` at the appropriate location
3. Use categorization functions for any numeric or sensitive data
4. Update this documentation

### Testing Analytics

During development (`__DEV__ = true`):
- Debug mode is automatically enabled
- Events are logged to console
- Use Firebase DebugView in the Analytics dashboard

---

## Maintenance

### Regular Reviews

Periodically review analytics data to:
- Identify unused features for potential removal
- Discover popular features that could be enhanced
- Understand user pain points (high undo rates, etc.)
- Guide feature prioritization

### Event Cleanup

If events are consistently showing zero usage:
- Consider removing the feature
- Investigate if the feature is discoverable
- Evaluate if the event is being triggered correctly

---

## Support

For questions about the analytics implementation, refer to:
- Firebase Analytics documentation: https://firebase.google.com/docs/analytics
- React Native Firebase: https://rnfirebase.io/analytics/usage

---

**Last Updated**: December 2025
**Version**: 1.0
