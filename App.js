import React from 'react';

import IssieSavePhoto from './IssieSavePhoto'
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import FolderGallery from './FolderGallery';
import IssieEditPhoto from './IssieEditPhoto';
import IssieAbout from './issieabout'
import IssieCreateFolder from './create-folder';
import { Spacer, globalStyles, getHeaderBackButton, getIconButton } from './elements';

import { fTranslate, translate } from './lang.js';
import {
  View, LogBox, Alert,
  TouchableOpacity, Settings, useWindowDimensions, Text
} from 'react-native';
import { EDIT_TITLE } from './settings'

import TitleEdit from './title-edit.js'

import { Icon } from 'react-native-elements'
import { setIsSimulator } from './device';
import { TextInput } from 'react-native-gesture-handler';
import { MenuProvider } from 'react-native-popup-menu';
import {getFileNameFromPath} from './utils'
import CameraModal from './CameraOverlay';

// const MainNavigator = createStackNavigator({
//   Home: {screen: FolderGallery},
//   SavePhoto: {screen: IssieSavePhoto},
//   EditPhoto: {screen: IssieEditPhoto},
//   About: {screen: IssieAbout},
//   CreateFolder: {screen: IssieCreateFolder}
// });

const Stack = createStackNavigator();
LogBox.ignoreLogs([
  'Require cycle: node_modules/rn-fetch-blob/index.js',
  'Non-serializable values were found in the navigation state',
  'Can\'t perform a React state update',
  'ProgressViewIOS has been extracted'
]);

function execNavParam(nav, name, def) {
  if (nav && nav.params && nav.params[name]) {
    return nav.params[name]();
  }
  return def;
}

function getNavParam(nav, name, def) {
  if (nav && nav.params && nav.params[name]) {
    return nav.params[name];
  }
  return def;
}

const isScreenNarrow = () => useWindowDimensions().width < 500;
const isScreenLow = () => useWindowDimensions().height < 700;
const isMobile = () => this.isScreenNarrow() || this.isScreenLow();

Text.defaultProps = {};
Text.defaultProps.maxFontSizeMultiplier = 1;

TextInput.defaultProps = {};
TextInput.defaultProps.maxFontSizeMultiplier = 1;


function App(props) {

  const windowWidth = useWindowDimensions().width;
  //const windowHeight = useWindowDimensions().height;

  const isScreenNarrow = () => windowWidth < 500;
  //const isScreenLow = () => useWindowDimensions().height < 700;
  //const isMobile = () => this.isScreenNarrow() || this.isScreenLow();


  if (props.isSimulator) {
    setIsSimulator(true)
  }
  return (
    <MenuProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={FolderGallery}
            options={
              (props) => {
                let menuIcon = 'settings';
                let editMode = props.route.params && props.route.params.editMode || false;
                let titleSetting = Settings.get('appTitle');
                if (titleSetting === undefined) {
                  titleSetting = fTranslate("DefaultAppTitle", "IssieDocs");
                }

                let editTitleSetting = Settings.get(EDIT_TITLE.name);
                if (editTitleSetting === undefined) {
                  editTitleSetting = EDIT_TITLE.no;
                }

                let title = titleSetting;
                let titleSavedCallback = { getTitleToSave: undefined };

                return {
                  headerTitle: () =>
                    <TitleEdit
                      title={title}
                      editMode={getNavParam(props.route, "editMode", false) && editTitleSetting == EDIT_TITLE.yes}
                      onSaveCallback={titleSavedCallback}
                    />,
                  headerStyle: globalStyles.headerStyle,
                  headerTintColor: 'white',
                  headerTitleStyle: globalStyles.headerTitleStyle,
                  headerLeft: props.route.params && props.route.params.showHome ? () => getHeaderBackButton(props.route.params.showHome) : undefined,
                  headerRight: (() =>
                    <View style={{ flexDirection: 'row-reverse' }}>
                      {isScreenNarrow() ? null : <Spacer />}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          execNavParam(props.route, "menuHandler", "");
                        }
                        }
                      >
                        <View style={{ flexDirection: 'row' }}>
                          {
                            props.route && props.route.params ?
                              getIconButton(() => {

                                if (execNavParam(props.route, "isEditEnabled")) {
                                  if (editMode && titleSavedCallback.getTitleToSave) {
                                    let newTitle = titleSavedCallback.getTitleToSave();
                                    Settings.set({ appTitle: newTitle });
                                    //props.navigation.setParams({ saveTitle: true }); //to cause refresh
                                  }
                                  execNavParam(props.route, "editHandler", "");
                                }

                              }, execNavParam(props.route, "isEditEnabled", false) ? 'white' : 'gray', getNavParam(props.route, "editMode", false) ? "check" : "edit", 35) : null
                          }
                          {isScreenNarrow() ? null : <Spacer />}
                          <Icon name={menuIcon} color='white' size={35} />

                        </View>
                      </TouchableOpacity>
                    </View>)
                };

              }
            }

          />
          <Stack.Screen name="SavePhoto" component={IssieSavePhoto}
            options={(props) => {
              let title = props.route.params.title || translate("SavePageFormTitle");
              return {
                title: title,
                headerStyle: globalStyles.headerStyle,
                headerTintColor: 'white',
                headerTitleStyle: globalStyles.headerTitleStyle,
                headerLeft: null //()=>getHeaderBackButton(props.navigation)
              }
            }
            }
          />
          <Stack.Screen name="EditPhoto" component={IssieEditPhoto}
            options={(props) => {
              const page = props.route.params.page;
              //let pathParts = page.path.split('/');
              //let isPageOnHome = pathParts[pathParts.length - 2] == DEFAULT_FOLDER_NAME;

              let fileName = getFileNameFromPath(page.path, true);
              
              let multiPageTitleAddition = props.route.params.pageTitleAddition || "";


              return {
                title: fileName + multiPageTitleAddition,
                headerStyle: globalStyles.headerThinStyle,
                headerTintColor: 'white',
                headerTitleStyle: globalStyles.headerThinTitleStyle,
                headerLeft:
                  () => <View >
                    <TouchableOpacity onPress={() => {
                      props.route.params.goHome ? props.route.params.goHome() : {}
                    }}
                      activeOpacity={1}
                      style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {/* <Icon name='keyboard-arrow-left' color='white' size={35} /> */}
                      {/* <Spacer width={10} />*/}
                      <Icon name={'home'} color='white' size={30} />
                    </TouchableOpacity>
                  </View>
              }
            }
            }

          />
          <Stack.Screen name="About" component={IssieAbout}
            options={(props) => {
              return {
                title: translate("About"),
                headerStyle: globalStyles.headerStyle,
                headerTintColor: 'white',
                headerTitleStyle: globalStyles.headerTitleStyle,
                headerLeft: () => getHeaderBackButton(() => props.navigation.pop())
              }
            }
            } />
          <Stack.Screen name="CreateFolder" component={IssieCreateFolder}
            options={(props) => {
              let curFolder = props.route.params.currentFolderName;
              let title = curFolder ? translate("EditFolderFormTitle") : translate("NewFolderFormTitle");
              return {
                title,
                headerStyle: globalStyles.headerStyle,
                headerTintColor: 'white',
                headerTitleStyle: globalStyles.headerTitleStyle,
                headerLeft: null
              }
            }
            } />
            <Stack.Screen name="OpenCamera" component={CameraModal}
            options={(props) => {
              
              return {
                
                title: "Camera",
                headerStyle: globalStyles.headerStyle,
                headerTintColor: 'white',
                headerTitleStyle: globalStyles.headerTitleStyle,
                headerLeft: null
              }
            }
            } />
            
        </Stack.Navigator>
      </NavigationContainer>
    </MenuProvider>
  );
}

export default App;

