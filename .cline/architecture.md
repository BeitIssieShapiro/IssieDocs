# IssieDocs - Architecture & Code Organization

## Project Structure

### Root Directory
```
IssieDocs/
├── src/                    # Main source code
├── ios/                    # iOS native code
├── android/                # Android native code
├── patches/                # NPM package patches
├── resources/              # Static resources (images, fonts)
├── scripts/                # Utility scripts
└── __tests__/             # Test files
```

## Core Application Files

### Navigation & Main App
- **src/App.js** - Main application entry point with React Navigation Stack Navigator
  - Configures screen routes: Home, EditPhoto, SavePhoto, About, CreateFolder, OpenCamera, OpenLink
  - Sets up MenuProvider for context menus
  - Configures FlashMessage for toast notifications
  - Handles device dimensions for responsive layout

### Main Screens
1. **src/FolderGallery.js** - Home screen
   - Displays folder hierarchy and documents
   - Edit mode for organizing files
   - Drag-and-drop support
   - Search functionality
   - Folder creation and management

2. **src/IssieEditPhoto2.tsx** - Primary canvas editor (TypeScript)
   - Main document editing interface
   - Canvas rendering with Skia
   - Tool mode management
   - Multi-page document support
   - Zoom and pan controls
   - Undo/redo system integration

3. **src/IssieSavePhoto.js** - Save dialog
   - Document naming
   - Folder selection
   - Page preview

4. **src/create-folder.js** - Folder creation dialog
   - Folder naming
   - Icon and color selection

## Canvas System (`src/canvas/`)

### Core Canvas Files
- **canvas.tsx** - Main canvas component
  - Skia-based rendering
  - Touch gesture handling
  - Element rendering orchestration
  - Zoom and pan functionality

- **types.tsx** - TypeScript type definitions
  - `ElementTypes`: Sketch, Text, Line, Image, Table
  - `EditModes`: Brush, Text, Ruler, Image, Table, Marker, Audio, Voice
  - `SketchPath`, `SketchLine`, `SketchText`, `SketchImage`, `SketchTable` interfaces
  - `MoveTypes` and `MoveContext` for element manipulation
  - `TableContext` for table operations

- **canvas-elements.tsx** - Individual element rendering components
  - Renders paths, lines, text, images, tables
  - Handles element-specific interactions

- **text-element.tsx** - Text element handling
  - Text input component
  - Text formatting (size, color, alignment, RTL/LTR)
  - Text box positioning and sizing

- **utils.ts** - Canvas utility functions
  - Coordinate transformations
  - Collision detection
  - Geometric calculations

## File System & Data Management

### File System Module (`src/filesystem.js`)
Core class: `FileSystem`
- Document and folder management
- File I/O operations
- Thumbnail generation
- Metadata handling
- Backup/restore (ZIP archive)
- Image resizing and optimization
- Base64 conversion

Key methods:
- `getRootFolders()` - Load folder hierarchy
- `addFolder()` - Create new folder
- `deleteFolder()` - Remove folder and contents
- `saveThumbnail()` - Generate page thumbnails
- `exportWorksheet()` - Export to ZIP
- `importWorhsheet()` - Import from ZIP
- `RestoreFromBackup()` - Restore from backup

### Settings Management
- **src/settings.js** - Legacy settings (JavaScript)
- **src/new-settings.ts** - Modern settings (TypeScript)
  - Uses MMKV for fast key-value storage
  - Settings: app title, language, view mode, features, colors

## UI Components & Elements

### Core UI Module (`src/elements.js`)
Reusable components:
- `getIconButton()` - Icon button factory
- `getRoundedButton()` - Rounded button with text/icon
- `PageImage()` - Page thumbnail display
- `FileNameDialog()` - File naming dialog
- `RootFolderPicker()` - Folder selection tree
- `TilesView()` - Grid/tile layout
- `FolderIcon()` - Folder icon with customization
- `ColorButton()` - Color selection button

### Toolbar System (`src/editor-toolbar.js`)
- Tool selection (brush, text, ruler, image, table, marker, eraser)
- Color picker
- Text size selector
- Brush/marker size picker
- Table grid configuration
- Responsive layout for narrow screens

## Editing Features

### Undo/Redo System (`src/do-queue.js`)
Class: `DoQueue`
- Stack-based undo/redo
- Operations: text, path, line, image, audio, table
- Draft state management
- Element versioning

### Gesture Handlers (`src/editors-panresponders.js`)
- Element move gestures
- Resize gestures
- Drag-and-drop
- Multi-touch support

### Drawing System
- **src/pinch.js** - Pinch-to-zoom calculations
- Free-form drawing with brush/marker
- Line drawing with ruler tool
- Path smoothing and optimization

## Specialized Features

### Audio System
- **src/audio-elem-new.js** - Modern audio components
- **src/recording.js** - Audio recording utilities
- Record/playback UI components
- Audio file management
- Waveform visualization (`src/audio-progress.js`)

### Camera Integration
- **src/CameraOverlay.js** - Camera interface
- Photo capture
- Image quality handling
- Orientation management

### Drag & Drop (`src/dragdrop.js`)
- Custom drag-and-drop system
- Drop target registration
- Hover state management
- Scroll context for drag operations

### Table Support
- Grid-based tables
- Cell-based text editing
- Row/column resizing
- Table positioning and sizing

## Internationalization

### Language Module (`src/lang.js`)
- RTL/LTR support (Hebrew, English, Arabic)
- Translation system
- Localized folder names and icons
- Direction utilities (`getRowDirection()`, `getFlexStart()`, etc.)

## Utilities

### Helper Modules
- **src/utils.js** - General utilities
  - ID generation
  - Table calculations
  - Point/line geometry
  - Color utilities
  
- **src/device.js** - Device detection
  - Simulator detection
  - Platform-specific handling

- **src/log.js** - Logging utilities
  - Debug tracing
  - Assertions

## Type System (`src/types.ts`)

### Navigation Types
- `RootStackParamList` - Screen navigation parameters

### Edit Modes Enum
Maps editing modes to element types for consistent state management

## State Management

### Approach
- Component state with React hooks
- Context API for global state (drag-drop, scroll position)
- MMKV for persistent settings
- File system as source of truth for documents

### Data Flow
1. User interaction → Event handler
2. State update → Re-render
3. Persist to file system (debounced)
4. Update thumbnails (async)
5. Notify listeners

## Performance Optimizations

- Lazy loading of folders and documents
- Thumbnail caching
- Debounced save operations
- Image resizing before storage
- Skia GPU-accelerated rendering
- MMKV for fast settings access
