import IssieSavePhoto from './IssieSavePhoto'
import {createStackNavigator, createAppContainer} from 'react-navigation';
import FolderGallery from './FolderGallery';
import IssieEditPhoto from './IssieEditPhoto';
import IssieAbout from './issieabout'
import IssieCreateFolder from './create-folder';

const MainNavigator = createStackNavigator({
  Home: {screen: FolderGallery},
  SavePhoto: {screen: IssieSavePhoto},
  EditPhoto: {screen: IssieEditPhoto},
  About: {screen: IssieAbout},
  CreateFolder: {screen: IssieCreateFolder}
});


const App = createAppContainer(MainNavigator);

export default App;
