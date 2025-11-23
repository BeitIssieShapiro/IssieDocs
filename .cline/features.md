# IssieDocs - Features & Functionality

## Core Features

### 1. Document Capture
- **Camera Integration**: Capture documents directly with device camera
- **Photo Library Import**: Import existing photos from device
- **PDF Import**: Import PDF documents and convert to editable pages
- **Multi-page Support**: Create documents with multiple pages

### 2. Canvas Editing Tools

#### Drawing Tools
- **Brush Tool**: Free-form drawing with customizable colors and stroke widths
- **Marker Tool**: Semi-transparent highlighting for emphasis
- **Eraser**: Remove drawing strokes
- **Ruler/Line Tool**: Draw straight lines with measurement indicators

#### Text Editing
- **Rich Text Input**: Add text anywhere on the canvas
- **Font Sizes**: Multiple preset sizes plus custom large text option
- **Text Alignment**: Left, center, right alignment
- **RTL/LTR Support**: Full bidirectional text support for Hebrew, Arabic, English
- **Text Colors**: Multiple color options with recent color memory
- **Text Box Moving**: Drag text to reposition
- **Auto-wrap**: Text automatically wraps to fit width

#### Images
- **Image Insertion**: Add images from camera or library
- **Image Positioning**: Drag to move, pinch to resize
- **Aspect Ratio Preservation**: Maintains image proportions
- **High Quality**: Preserves image quality

#### Tables
- **Grid Tables**: Create tables with customizable rows and columns
- **Cell-based Text**: Type directly in table cells
- **Row/Column Adjustment**: Resize rows and columns by dragging
- **Table Styling**: Customize border color, width, and line style
- **Table Movement**: Drag entire table to reposition

#### Audio
- **Voice Recording**: Record audio notes attached to pages
- **Audio Playback**: Play back recorded audio with waveform visualization
- **Audio Positioning**: Move audio elements on canvas
- **Drag-and-Drop Audio**: Reorganize audio elements

### 3. Document Management

#### Folder Organization
- **Hierarchical Folders**: Create nested folder structures
- **Custom Icons**: Choose from multiple folder icons
- **Color Coding**: Assign colors to folders for visual organization
- **Drag-and-Drop**: Move documents and folders by dragging
- **Folder Breadcrumbs**: Navigate folder hierarchy easily

#### Document Operations
- **Rename**: Rename documents and folders
- **Delete**: Remove documents and folders
- **Move**: Move documents between folders
- **Duplicate**: Create copies of documents
- **Multi-page Management**: Add, delete, reorder pages within documents

### 4. View Modes

#### Zoom and Pan
- **Pinch-to-Zoom**: Zoom in/out with pinch gestures
- **Button Zoom**: Zoom controls for precise zoom levels
- **Pan Navigation**: Scroll canvas when zoomed
- **Auto-center**: Maintains focus while editing

#### Display Modes
- **Tile View**: Grid layout showing thumbnails
- **List View**: Detailed list with larger thumbnails
- **Edit Mode**: Toggle edit mode for reorganizing

### 5. Export and Sharing

#### Export Options
- **Share as Image**: Export individual pages as JPEG images
- **Share as PDF**: Export multi-page documents as PDF
- **Export Folder**: Export entire folders as ZIP archives
- **High Quality**: Maintains original quality in exports

#### Backup and Restore
- **Full Backup**: Backup all documents and folders to ZIP
- **Selective Backup**: Backup specific folders
- **Restore**: Import ZIP backups to restore data
- **Progress Tracking**: Monitor backup/restore progress

### 6. Undo/Redo System
- **Comprehensive History**: Undo/redo for all editing operations
- **Element-level Tracking**: Text, drawings, images, audio, tables
- **Multi-operation Support**: Stack-based undo/redo
- **Draft State**: Save intermediate states

### 7. Internationalization
- **Multiple Languages**: Hebrew, English, Arabic
- **Auto-detection**: Detects device language
- **RTL/LTR Support**: Proper text direction handling
- **Localized UI**: All interface elements translated
- **Localized Folders**: Built-in folders with localized names

### 8. Accessibility Features
- **Touch-friendly**: Large touch targets
- **High Contrast**: Clear visual feedback
- **Audio Feedback**: System sounds for actions
- **Simplified Interface**: Clean, uncluttered design
- **Designed for Special Needs**: Created for users with disabilities

## Advanced Features

### Canvas Features
- **Multi-touch**: Support for simultaneous touch inputs
- **Gesture Recognition**: Sophisticated touch gesture handling
- **GPU Acceleration**: Skia-powered rendering for smooth performance
- **Real-time Preview**: Instant visual feedback while editing

### Text Features
- **Keyboard Integration**: Full keyboard support for iPad
- **Text Selection**: Select and edit existing text
- **Auto-scroll**: Page scrolls when typing near edges
- **Keyboard Avoidance**: Canvas adjusts when keyboard appears
- **Font Customization**: Custom fonts (Alef, DroidSans, Verdana)

### Table Features
- **Cell Navigation**: Navigate between cells while editing
- **Text in Cells**: Full text editing within table cells
- **Table Templates**: Quick table creation with preset sizes
- **Border Styling**: Solid or dashed borders

### Search and Filter
- **Document Search**: Find documents by name
- **Filter by Folder**: Show documents from specific folders
- **Case-insensitive**: Flexible search matching

### Performance Optimizations
- **Lazy Loading**: Load folders and documents on demand
- **Thumbnail Caching**: Fast preview generation
- **Debounced Saves**: Efficient file system operations
- **Image Compression**: Automatic image optimization
- **Background Processing**: Non-blocking operations

## User Interface Features

### Responsive Design
- **Adaptive Layout**: Adjusts to device orientation
- **Portrait/Landscape**: Full support for both orientations
- **Device-specific**: Optimized for iPad and iPhone
- **Screen Size Awareness**: Adapts to different screen sizes

### Toolbar
- **Context-sensitive**: Shows relevant tools for current mode
- **Collapsible**: Maximize canvas space
- **Tool Presets**: Quick access to commonly used settings
- **Color Picker**: Full color palette with recent colors
- **Size Pickers**: Visual size selection for text and brushes

### Navigation
- **Page Navigation**: Previous/Next page buttons
- **Home Button**: Quick return to main screen
- **Back Navigation**: Consistent back button behavior
- **Gesture Navigation**: Swipe gestures for navigation

### Visual Feedback
- **Toast Messages**: Non-intrusive notifications
- **Progress Indicators**: Loading and save progress
- **Selection Indicators**: Clear visual selection states
- **Edit Mode Indicators**: Visual cues for edit mode
- **Drag Previews**: Visual feedback during drag operations

## Settings and Customization

### App Settings
- **App Title**: Customizable app title
- **Language**: Manual language selection
- **View Mode**: Toggle between tile and list views
- **Edit Title**: Enable/disable app title editing
- **Feature Toggles**: Enable/disable specific features

### Color Preferences
- **Recent Colors**: Remembers last 4 used colors
- **Custom Colors**: Full color wheel picker
- **Folder Colors**: Assign colors to folders

### Tool Settings
- **Default Brush Size**: Set preferred brush width
- **Default Text Size**: Set preferred text size
- **Default Marker Size**: Set preferred marker width
- **Line Style**: Choose solid or dashed lines

## Keyboard Shortcuts (iPad with External Keyboard)
- Text editing with full keyboard support
- Navigation improvements with keyboard
- Improved productivity for power users

## Planned Features (from todo.txt)

### High Priority
- Export entire folders
- React Native version migration
- Enhanced search in nested folders
- Image mode UX improvements

### Medium Priority
- Advanced text formatting
- More table features
- Additional drawing tools

### Future Considerations
- Cloud sync
- Collaboration features
- Additional language support
- Custom templates
