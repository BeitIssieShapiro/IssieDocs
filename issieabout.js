import React from 'react';
import { View } from 'react-native'
import {
    semanticColors, getHeaderBackButton,
    globalStyles, AppText
} from './elements';

import {
    Linking, ScrollView
} from 'react-native';

export default function IssieAbout(props) {

    const textStyle = { fontFamily: 'ArialMT', fontSize: 14, color: '#5c5c5c', textAlign: 'left', marginLeft: 20 }
    const linkStyle = { fontFamily: 'ArialMT', fontSize: 14, color: 'blue', textAlign: 'left' }
    const titleStyle = { fontFamily: 'ArialMT', fontSize: 14, fontWeight: 'bold', color: '#183d72', textAlign: 'left', marginLeft: 20 }
    const headerStyle = { fontFamily: 'Bradley Hand', fontSize: 55, fontWeight: 'bold' }

    return <ScrollView style={{ backgroundColor: semanticColors.mainAreaBG, height: '100%', width: '100%' }}>

        <View style={{ flexDirection: 'row', alignSelf: 'center' }}><AppText style={[headerStyle, { color: '#fbaa19' }]}>Issie</AppText><AppText style={[headerStyle, { color: '#18b9ed' }]}>Docs</AppText></View>
        <AppText > </AppText>
        <AppText > </AppText>

        <AppText style={textStyle}>Conceptualized as a digital binder, IssieDocs is an app that allows students to complete and file worksheets, using their iPad. Individual worksheets are uploaded as photos or as PDFs and can be easily edited with text or marked using the pen tool. The worksheets can be filed by subject or saved individually, allowing students to organize their work in a way that works for them. Incorporating inclusive design concepts, IssieDocs is accessible for students with a variety of motor and cognitive abilities, allowing different types of learners to navigate and use the app with minimal assistance. It is especially helpful for students who have difficulty completing writing tasks with a regular pen or pencil. In addition to worksheets, it can be a useful tool for adding text or markings to any photo or pdf.
IssieDocs was developed through the collaboration of The Technology Center of Beit Issie Shapiro and SAP Labs, Israel.</AppText>
        <AppText > </AppText>
        <AppText > </AppText>

        <AppText style={titleStyle}>App features:</AppText>
        <AppText > </AppText>
        <AppText style={textStyle}>· Upload worksheets as photos using the camera or photo gallery, or as PDF from email</AppText>
        <AppText style={textStyle}>· Input text using device keyboard</AppText>
        <AppText style={textStyle}>   · adjust text size for user’s needs or to match worksheet</AppText>
        <AppText style={textStyle}>· Mark worksheets using the pen tool</AppText>
        <AppText style={textStyle}>   · Choose from a variety of colors and pen widths</AppText>
        <AppText style={textStyle}>· Works in both landscape and portrait orientations</AppText>
        <AppText style={textStyle}>· Filing</AppText>
        <AppText style={textStyle}>   · graphically organized</AppText>
        <AppText style={textStyle}>   · customize folders for filing worksheets</AppText>
        <AppText style={textStyle}>· Simple and appealing graphics</AppText>
        <AppText style={textStyle}>· AppText labels are paired with graphical icons for greater independence for users with reading difficulties</AppText>

        <AppText > </AppText>
        <AppText > </AppText>
        <AppText > </AppText>
        <View style={{ flexDirection: 'row' }}>
            <AppText style={textStyle}>For more information:</AppText><AppText style={linkStyle}
                onPress={() => Linking.openURL('http://en.beitissie.org.il/tech/')}
            > http://en.beitissie.org.il/tech/</AppText>
        </View>
        <AppText > </AppText>
        <AppText style={textStyle}>IssieDocs, developed by The Technology Center, is designed to meet needs we have identified in our work with people with disabilities. It is one of a series of apps we have created that are intended to improve participation and quality of life. </AppText>

        <AppText > </AppText>
        <AppText style={textStyle}>The Technology Center at Beit Issie Shapiro serves as a leading hub for promoting innovation and entrepreneurship in the field of Assistive Technology (AT), bringing more accessible and affordable solutions to people with disabilities. We provide consultation and training services to families and professionals and consultation and support to developers and entrepreneurs helping them create apps and products that are accessible to a wider audience including people with disabilities.</AppText>

        <AppText > </AppText>
        <View style={{ flexDirection: 'row' }}>
            <AppText style={textStyle}>For more info about us: http://en.beitissie.org.il</AppText>
            <AppText style={textStyle}>For more information:</AppText><AppText style={linkStyle}
                onPress={() => Linking.openURL('http://en.beitissie.org.il')}
            > http://en.beitissie.org.il</AppText>
        </View>
        <View style={{ flexDirection: 'row' }}>
            <AppText style={textStyle}>Visit our Blog: Tech it Issie </AppText>
            <AppText style={textStyle}>For more information:</AppText><AppText style={linkStyle}
                onPress={() => Linking.openURL('http://en.beitissie.org.il/tech/')}
            > http://en.beitissie.org.il/tech/</AppText>
        </View>

        <AppText > </AppText>
        <AppText style={textStyle}>Try out our other apps!</AppText>
        <AppText > </AppText>
        <AppText style={textStyle}>  · IssieBoard</AppText>
        <AppText style={textStyle}>  · 2Talk - AAC</AppText>
        <AppText style={textStyle}>  · IssieDice</AppText>
        <AppText style={textStyle}>  · IssieSign</AppText>
        <AppText style={textStyle}>  · IssieCalc</AppText>
    </ScrollView>

}

IssieAbout.navigationOptions = screenProps => ({
    headerStyle: globalStyles.headerStyle,
    headerTintColor: 'white',
    headerTitleStyle: globalStyles.headerTitleStyle,
    headerLeft: getHeaderBackButton(screenProps.navigation)
})