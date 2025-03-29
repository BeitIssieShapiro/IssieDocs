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
import { Spacer, globalStyles, getHeaderBackButton, getIconButton, getFont, getFontFamily, dimensions, MoreButton, semanticColors } from './elements';

import { fTranslate, getRowDirection, getRowDirections, getRowReverseDirection, isRTL, translate } from './lang.js';
import {
  View, LogBox, Alert,
  TouchableOpacity, useWindowDimensions, Text
} from 'react-native';
import { Settings } from "./new-settings"
import AudioRecorderPlayer from 'react-native-audio-recorder-player';


import { EDIT_TITLE, isSettingEmpty } from './settings'

import TitleEdit from './title-edit.js'

import { Icon } from "./elements"
import { setIsSimulator } from './device';
import { TextInput } from 'react-native-gesture-handler';
import { MenuProvider } from 'react-native-popup-menu';
import CameraModal from './CameraOverlay';
import { SvgIcon } from './svg-icons';
import FlashMessage from "react-native-flash-message";
import { OpenLink } from './parental-gate';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopHeader } from './header';
import { CanvasTest } from './canvas/CanvasTestGround';
import { IssieEditPhoto2 } from './IssieEditPhoto2';

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

export const audioRecorderPlayer = new AudioRecorderPlayer();


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

  // return <TestCmp/>
  //return <Test a="abc" b={1}/>
  //return <CanvasTest />

  return (
    <MenuProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ gestureEnabled: false, headerShown: true, headerStyle: { position: "absolute", zIndex: 2000 } }}>
          <Stack.Screen name="Home" component={FolderGallery}
            options={
              (props) => {
                let editMode = props.route.params && props.route.params.editMode || false;
                let titleSetting = Settings.get('appTitle');
                if (isSettingEmpty(titleSetting)) {
                  titleSetting = fTranslate("DefaultAppTitle", "IssieDocs");
                }

                let editTitleSetting = Settings.get(EDIT_TITLE.name);
                if (isSettingEmpty(editTitleSetting)) {
                  editTitleSetting = EDIT_TITLE.no;
                }

                let title = titleSetting;
                let titleSavedCallback = { getTitleToSave: undefined };
                const header = (() => <TopHeader
                  actions={<View style={{ width: "100%", flexDirection: getRowDirection(), justifyContent: "flex-end", zIndex: 2000 }}>
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
                    {!isScreenNarrow() && <Spacer />}
                    <Icon name="settings" color='white' size={35} onPress={() => execNavParam(props.route, "menuHandler", "")}
                    />

                  </View>
                  }
                  title={<TitleEdit
                    title={title}
                    editMode={getNavParam(props.route, "editMode", false) && editTitleSetting == EDIT_TITLE.yes}
                    onSaveCallback={titleSavedCallback}
                  />}
                  nav={props.route.params?.showHome && getHeaderBackButton(props.route.params.showHome)}
                />
                )
                return {
                  header
                }
              }
            }
          />

          <Stack.Screen name="SavePhoto" component={IssieSavePhoto}
            options={(props) => {
              let title = props.route.params.title || translate("SavePageFormTitle");
              const header = () => <TopHeader titleText={title} />
              return { header };
            }}
          />

          <Stack.Screen name="EditPhoto" component={IssieEditPhoto2}
            initialParams={{ headerHeight: dimensions.headerHeight, insets: props.insets }} // todo calculate better the height?
            options={(props) => {
              const page = props.route.params.page;
              let fileName = page.name;
              let multiPageTitleAddition = props.route.params.pageTitleAddition || "";

              const header = () => <TopHeader
                style={{ zIndex: 2000 }}
                actions={<View />}
                titleText={fileName + multiPageTitleAddition}
                nav={<View style={{ flex: 1, flexDirection: getRowDirection() }}>
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
                </View>} />

              return { header };
            }
            }
          />
          <Stack.Screen name="About" component={IssieAbout}
            options={(props) => {
              const header = () => <TopHeader
                titleText={translate("About")}
                nav={getHeaderBackButton(() => props.navigation.pop())}
              />
              return { header };
            }}
          />

          <Stack.Screen name="CreateFolder" component={IssieCreateFolder}
            options={(props) => {
              let curFolder = props.route.params.currentFolderName;
              let title = curFolder ? translate("EditFolderFormTitle") : translate("NewFolderFormTitle");

              const header = () => <TopHeader
                titleText={title}
              />
              return { header };
            }}
          />


          <Stack.Screen name="OpenCamera" component={CameraModal}
            options={(props) => {
              let title = translate("CameraTitle");

              const header = () => <TopHeader
                titleText={title}
              />
              return { header };
            }}
          />

          <Stack.Screen name="OpenLink" component={OpenLink}
            options={(props) => {
              const header = () => <TopHeader
                titleText={"Open Link"}
              />
              return { header };
            }} />

        </Stack.Navigator>
      </NavigationContainer >


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
    </MenuProvider >
  );
};


export default App;
