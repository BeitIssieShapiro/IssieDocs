import IssieSavePhoto from './IssieSavePhoto'
import {createStackNavigator, createAppContainer} from 'react-navigation';
//import GalleryScreen from './GaleryScreen';
import FolderGallery from './FolderGallery';
import IssieEditPhoto from './IssieEditPhoto';

const MainNavigator = createStackNavigator({
  Home: {screen: FolderGallery},
  SavePhoto: {screen: IssieSavePhoto},
  EditPhoto: {screen: IssieEditPhoto}
});


const App = createAppContainer(MainNavigator);

export default App;
