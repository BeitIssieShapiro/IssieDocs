import React from 'react';
import { View, Text } from 'react-native'
import { semanticColors } from './elements';


export default function IssieAbout(props) {

    const textStyle = { fontSize: 18, color: 'black', textAlign: 'right' }
    const titleStyle = { fontSize: 25, fontFace:'bold', color: 'black', textAlign: 'right' }

    return <View style={{ backgroundColor: semanticColors.mainAreaBG, height:'100%', width:'100%' }}>
        <Text style={titleStyle}>אפליקציית IssieDoc</Text>
        <Text style={textStyle}>אפליקציה מבית איזי שפירא. משמשת ילדים עם מוגבליות לבצע מטלות לימודיות</Text>
        <Text style={textStyle}>פותח בשיתוף עם מעבדות SAP בישראל</Text>

    </View>
}