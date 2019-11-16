import React from 'react';
import { View, Text } from 'react-native'
import { semanticColors } from './elements';
import {
    Linking, ScrollView
} from 'react-native';

export default function IssieAbout(props) {

    const textStyle = { fontSize: 19, color: 'black', textAlign: 'left' }
    const linkStyle = { fontSize: 19, color: 'blue', textAlign: 'left' }
    const titleStyle = { fontSize: 25, fontWeight: 'bold', color: 'black', textAlign: 'left' }
    const headerStyle = { fontSize: 25, fontWeight: 'bold', color: 'black', textAlign: 'center' }

    return <ScrollView style={{ backgroundColor: semanticColors.mainAreaBG, height: '100%', width: '100%' }}>
        <Text style={headerStyle}>IssieDocs</Text>
        <Text > </Text>
        <Text > </Text>

        <Text style={textStyle}>Conceptualized as a digital binder, IssieDocs is an app that allows students to complete and file worksheets, using their iPad. Individual worksheets are uploaded as photos or as PDFs and can be easily edited with text or marked using the pen tool. The worksheets can be filed by subject or saved individually, allowing students to organize their work in a way that works for them. Incorporating inclusive design concepts, IssieDocs is accessible for students with a variety of motor and cognitive abilities, allowing different types of learners to navigate and use the app with minimal assistance. It is especially helpful for students who have difficulty completing writing tasks with a regular pen or pencil. In addition to worksheets, it can be a useful tool for adding text or markings to any photo or pdf.
IssieDocs was developed through the collaboration of The Technology Center of Beit Issie Shapiro and SAP Labs, Israel.</Text>
        <Text > </Text>
        <Text > </Text>

        <Text style={titleStyle}>App features:</Text>
        <Text > </Text>
        <Text style={textStyle}>*Upload worksheets as photos using the camera or photo gallery, or as PDF from email</Text>
        <Text style={textStyle}>* Input text using device keyboard</Text>
        <Text style={textStyle}>  - adjust text size for user’s needs or to match worksheet</Text>
        <Text style={textStyle}>* Mark worksheets using the pen tool</Text>
        <Text style={textStyle}>  - Choose from a variety of colors and pen widths</Text>
        <Text style={textStyle}>* Works in both landscape and portrait orientations</Text>
        <Text style={textStyle}>* Filing</Text>
        <Text style={textStyle}>  - graphically organized</Text>
        <Text style={textStyle}>  - customize folders for filing worksheets</Text>
        <Text style={textStyle}>* Simple and appealing graphics</Text>
        <Text style={textStyle}>* Text labels are paired with graphical icons for greater independence for users with reading difficulties</Text>

        <Text > </Text>
        <Text > </Text>
        <Text > </Text>
        <View style={{flexDirection:'row'}}>
            <Text style={textStyle}>For more information:</Text><Text style={linkStyle}
                onPress={() => Linking.openURL('http://en.beitissie.org.il/tech/')}
            > http://en.beitissie.org.il/tech/</Text>
        </View>
        <Text > </Text>
        <Text style={textStyle}>IssieDocs, developed by The Technology Center, is designed to meet needs we have identified in our work with people with disabilities. It is one of a series of apps we have created that are intended to improve participation and quality of life. </Text>

        <Text > </Text>
        <Text style={textStyle}>The Technology Center at Beit Issie Shapiro serves as a leading hub for promoting innovation and entrepreneurship in the field of Assistive Technology (AT), bringing more accessible and affordable solutions to people with disabilities. We provide consultation and training services to families and professionals and consultation and support to developers and entrepreneurs helping them create apps and products that are accessible to a wider audience including people with disabilities.</Text>

        <Text > </Text>
        <View style={{flexDirection:'row'}}>
            <Text style={textStyle}>For more info about us: http://en.beitissie.org.il</Text>
            <Text style={textStyle}>For more information:</Text><Text style={linkStyle}
                onPress={() => Linking.openURL('http://en.beitissie.org.il')}
            > http://en.beitissie.org.il</Text>
        </View>
        <View style={{flexDirection:'row'}}>
            <Text style={textStyle}>Visit our Blog: Tech it Issie </Text>
            <Text style={textStyle}>For more information:</Text><Text style={linkStyle}
                onPress={() => Linking.openURL('http://en.beitissie.org.il/tech/')}
            > http://en.beitissie.org.il/tech/</Text>
        </View>

        <Text > </Text>
        <Text style={textStyle}>Try out our other apps!</Text>
        <Text > </Text>
        <Text style={textStyle}>  - IssieBoard</Text>
        <Text style={textStyle}>  - 2Talk - AAC</Text>
        <Text style={textStyle}>  - IssieDice</Text>
        <Text style={textStyle}>  - IssieSign</Text>
        <Text style={textStyle}>  - IssieCalc</Text>

    </ScrollView>
}