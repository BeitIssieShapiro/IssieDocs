//import CameraScreenLocal from './CameraScreen'
import IssieSavePhoto from './IssieSavePhoto'
import {createStackNavigator, createAppContainer} from 'react-navigation';
import GalleryScreen from './GaleryScreen';
import IssieEditPhoto from './IssieEditPhoto';

const MainNavigator = createStackNavigator({
  Home: {screen: GalleryScreen},
 // Camera: {screen: CameraScreenLocal},
  SavePhoto: {screen: IssieSavePhoto},
  EditPhoto: {screen: IssieEditPhoto}
});


const App = createAppContainer(MainNavigator);

export default App;
