/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import {
  SafeAreaView,
  useColorScheme,
} from 'react-native';

import {
  Colors,
} from 'react-native/Libraries/NewAppScreen';

 import IssieSavePhoto from './IssieSavePhoto'
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import FolderGallery from './FolderGallery';
import IssieEditPhoto from './IssieEditPhoto';
import IssieAbout from './issieabout'
import IssieCreateFolder from './create-folder';
import { Spacer, globalStyles, getHeaderBackButton, getIconButton, getFont, getFontFamily, dimensions, MoreButton } from './elements';

import { fTranslate, getRowDirection, getRowDirections, isRTL, translate } from './lang.js';
import {
  View, LogBox, Alert,
  TouchableOpacity, Settings, useWindowDimensions, Text
} from 'react-native';

import { EDIT_TITLE } from './settings'

import TitleEdit from './title-edit.js'

import { Icon } from "./elements"
import { setIsSimulator } from './device';
import { TextInput } from 'react-native-gesture-handler';
import { MenuProvider } from 'react-native-popup-menu';
import CameraModal from './CameraOverlay';
import { SvgIcon } from './svg-icons';
import FlashMessage from "react-native-flash-message";
import { OpenLink } from './parental-gate';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Can\'t perform a React state update',
  //'ProgressViewIOS has been extracted',
  'Cannot update during an existing state transition'
]);
const Stack = createStackNavigator();

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


Text.defaultProps = {};
Text.defaultProps.maxFontSizeMultiplier = 1;

TextInput.defaultProps = {};
TextInput.defaultProps.maxFontSizeMultiplier = 1;



const App = (props) => {
  const windowWidth = useWindowDimensions().width;
  const windowHeight = useWindowDimensions().height;
  //const windowHeight = useWindowDimensions().height;

  const isScreenNarrow = () => windowWidth < 500;
  const isScreenLow = () => windowHeight < 700;
  const isMobile = () => isScreenNarrow() || isScreenLow();


  if (props.isSimulator) {
    setIsSimulator(true)
  }

  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <MenuProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ gestureEnabled: false }}>
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
                const headerNav = props.route.params && props.route.params.showHome ? () => getHeaderBackButton(props.route.params.showHome) : undefined;
                const HeaderButtons = (() =>
                  <View style={{ flexDirection: 'row-reverse' }}>
                    {isScreenNarrow() ? null : <Spacer />}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        execNavParam(props.route, "menuHandler", "");
                        //execNavParam(props.route, "betaFeatures", "");
                      }
                      }
                    >
                      <View style={{ flexDirection: getRowDirection() }}>
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
                return {
                  headerTitle: () =>
                    <TitleEdit
                      title={title}
                      editMode={getNavParam(props.route, "editMode", false) && editTitleSetting == EDIT_TITLE.yes}
                      onSaveCallback={titleSavedCallback}
                    />,
                  headerStyle: globalStyles.headerStyle,
                  headerTintColor: 'white',
                  headerTitleStyle: [globalStyles.headerTitleStyle, getFontFamily()],
                  headerRight: isRTL() ? HeaderButtons : headerNav,
                  headerLeft: isRTL() ? headerNav : HeaderButtons,
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
                headerTitleStyle: [globalStyles.headerTitleStyle, getFontFamily()],
                headerLeft: null //()=>getHeaderBackButton(props.navigation)
              }
            }
            }
          />
          <Stack.Screen name="EditPhoto" component={IssieEditPhoto}
            initialParams={{ headerHeight: isMobile() ? dimensions.headerHeight : dimensions.thinHeaderHeight }}
            options={(props) => {
              const page = props.route.params.page;
              //let pathParts = page.path.split('/');
              //let isPageOnHome = pathParts[pathParts.length - 2] == DEFAULT_FOLDER_NAME;

              let fileName = page.name;

              let multiPageTitleAddition = props.route.params.pageTitleAddition || "";
              const headerNav = () => (<View style={{ flex: 1, flexDirection: getRowDirection() }}>
                <TouchableOpacity onPress={() => {
                  props.route.params.goHome ? props.route.params.goHome() : {}
                }}
                  activeOpacity={1}
                  style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <SvgIcon name='home' color='white' size={30} />
                </TouchableOpacity>
                <Spacer />
                <MoreButton 
                size={30} color={"white"} 
                 onPress={() => {
                  props.route.params.onMoreMenu ? props.route.params.onMoreMenu() : {}
                }} />
              </View>);
              const headerName = () => <Text style={[globalStyles.headerThinTitleStyle, getFontFamily()]}>{fileName + multiPageTitleAddition}</Text>

              return {
                title: "",//fileName + multiPageTitleAddition,
                headerLayoutPreset: 'right',
                headerStyle: isMobile() ? globalStyles.headerStyle : globalStyles.headerThinStyle,
                headerTintColor: 'white',
                headerTitleStyle: [globalStyles.headerThinTitleStyle, getFontFamily()],
                headerRight: isRTL() ? headerName : headerNav,
                headerLeft: isRTL() ? headerNav : headerName
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
                headerTitleStyle: [globalStyles.headerTitleStyle, getFontFamily()],
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
                headerTitleStyle: [globalStyles.headerTitleStyle, getFontFamily()],
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
                headerTitleStyle: [globalStyles.headerTitleStyle, getFontFamily()],
                headerLeft: null
              }
            }
            } />

          <Stack.Screen name="OpenLink" component={OpenLink}
            options={(props) => {

              return {

                title: "Open Link",
                headerStyle: globalStyles.headerStyle,
                headerTintColor: 'white',
                headerTitleStyle: [globalStyles.headerTitleStyle, getFontFamily()],
                headerLeft: null
              }
            }
            } />

        </Stack.Navigator>
      </NavigationContainer>


      <FlashMessage position="bottom" style={{
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
        titleStyle={{
          fontFamily: getFont(),
          fontSize: 18,
          textAlign: 'center',
        }} />
    </MenuProvider>
  );
};


export default App;
