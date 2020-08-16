import React from 'react';

import IssieSavePhoto from './IssieSavePhoto'
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import FolderGallery from './FolderGallery';
import IssieEditPhoto from './IssieEditPhoto';
import IssieAbout from './issieabout'
import IssieCreateFolder from './create-folder';
import { Spacer, globalStyles, getHeaderBackButton } from './elements';

import { fTranslate, translate } from './lang.js';
import {
  View, YellowBox, Alert,
  TouchableOpacity, Settings
} from 'react-native';
import { EDIT_TITLE } from './settings'

import TitleEdit from './title-edit.js'

import { Icon } from 'react-native-elements'
import { setIsSimulator } from './utils';

// const MainNavigator = createStackNavigator({
//   Home: {screen: FolderGallery},
//   SavePhoto: {screen: IssieSavePhoto},
//   EditPhoto: {screen: IssieEditPhoto},
//   About: {screen: IssieAbout},
//   CreateFolder: {screen: IssieCreateFolder}
// });

const Stack = createStackNavigator();
YellowBox.ignoreWarnings([
  'Require cycle: node_modules/rn-fetch-blob/index.js',
  'Non-serializable values were found in the navigation state',
  'Can\'t perform a React state update',
  'ProgressViewIOS has been extracted'
]);


function App(props) {
  if (props.isSimulator) {
    setIsSimulator(true)
  }
  return (
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

              return {
                headerTitle: editMode && editTitleSetting == EDIT_TITLE.yes ? (() =>
                  <TitleEdit
                    title={title}
                    onSave={(newTitle) => {
                      Settings.set({ appTitle: newTitle });
                      props.navigation.setParams({saveTitle: true}); //to cause refresh
                    }} />) : undefined,
                title,
                headerStyle: globalStyles.headerStyle,
                headerTintColor: 'white',
                headerTitleStyle: globalStyles.headerTitleStyle,
                //headerLeft: 
                headerRight: (() =>
                  <View style={{ flexDirection: 'row-reverse' }}>
                    <Spacer />
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        let menuHandler = props.route.params.menuHandler;
                        if (menuHandler) {
                          menuHandler();
                        }
                      }
                      }
                    >
                      <Icon name={menuIcon} color='white' size={35} />
                    </TouchableOpacity>
                  </View>)
              };

            }
          }

        />
        <Stack.Screen name="SavePhoto" component={IssieSavePhoto} 
        options= {(props)=>{
            let title = props.route.params.title ||translate("SavePageFormTitle");
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

            let fileName = page.path.replace(/^.*[\\\/]/, '');
            if (fileName.endsWith('.jpg')) {
              fileName = fileName.substr(0, fileName.length - 4);
            }
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
                    style={{flexDirection: 'row', alignItems: 'center' }}>
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
        options= {(props)=>{
          return {
            title: translate("About"),
            headerStyle: globalStyles.headerStyle,
            headerTintColor: 'white',
            headerTitleStyle: globalStyles.headerTitleStyle,
            headerLeft: ()=>getHeaderBackButton(props.navigation)
          }
        }
      }/>
        <Stack.Screen name="CreateFolder" component={IssieCreateFolder} 
        options={(props)=>{
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
        }/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
