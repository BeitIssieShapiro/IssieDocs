import React from 'react';
import { View, Text } from 'react-native'
import { semanticColors , getHeaderBackButton, globalStyles} from './elements';

import {
    Linking, ScrollView
} from 'react-native';

export default function IssieAbout(props) {

    const textStyle = { fontFamily:'ArialMT', fontSize: 14, color: '#5c5c5c', textAlign: 'left', marginLeft:20  }
    const linkStyle = { fontFamily:'ArialMT', fontSize: 14, color: 'blue', textAlign: 'left' }
    const titleStyle = { fontFamily:'ArialMT', fontSize: 14, fontWeight: 'bold', color: '#183d72', textAlign: 'left' , marginLeft:20 }
    const headerStyle = { fontFamily: 'Bradley Hand', fontSize: 55, fontWeight: 'bold' }

    return <ScrollView style={{ backgroundColor: semanticColors.mainAreaBG, height: '100%', width: '100%'}}>

        <View style={{flexDirection:'row', alignSelf:'center'}}><Text style={[headerStyle,{color:'#fbaa19'}]}>Issie</Text><Text style={[headerStyle,{color:'#18b9ed'}]}>Docs</Text></View>
        <Text > </Text>
        <Text > </Text>

        <Text style={textStyle}>Conceptualized as a digital binder, IssieDocs is an app that allows students to complete and file worksheets, using their iPad. Individual worksheets are uploaded as photos or as PDFs and can be easily edited with text or marked using the pen tool. The worksheets can be filed by subject or saved individually, allowing students to organize their work in a way that works for them. Incorporating inclusive design concepts, IssieDocs is accessible for students with a variety of motor and cognitive abilities, allowing different types of learners to navigate and use the app with minimal assistance. It is especially helpful for students who have difficulty completing writing tasks with a regular pen or pencil. In addition to worksheets, it can be a useful tool for adding text or markings to any photo or pdf.
IssieDocs was developed through the collaboration of The Technology Center of Beit Issie Shapiro and SAP Labs, Israel.</Text>
        <Text > </Text>
        <Text > </Text>

        <Text style={titleStyle}>App features:</Text>
        <Text > </Text>
        <Text style={textStyle}>· Upload worksheets as photos using the camera or photo gallery, or as PDF from email</Text>
        <Text style={textStyle}>· Input text using device keyboard</Text>
        <Text style={textStyle}>   · adjust text size for user’s needs or to match worksheet</Text>
        <Text style={textStyle}>· Mark worksheets using the pen tool</Text>
        <Text style={textStyle}>   · Choose from a variety of colors and pen widths</Text>
        <Text style={textStyle}>· Works in both landscape and portrait orientations</Text>
        <Text style={textStyle}>· Filing</Text>
        <Text style={textStyle}>   · graphically organized</Text>
        <Text style={textStyle}>   · customize folders for filing worksheets</Text>
        <Text style={textStyle}>· Simple and appealing graphics</Text>
        <Text style={textStyle}>· Text labels are paired with graphical icons for greater independence for users with reading difficulties</Text>

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
        <Text style={textStyle}>  · IssieBoard</Text>
        <Text style={textStyle}>  · 2Talk - AAC</Text>
        <Text style={textStyle}>  · IssieDice</Text>
        <Text style={textStyle}>  · IssieSign</Text>
        <Text style={textStyle}>  · IssieCalc</Text>
{/* 
        <Text style={{fontFamily: 'Academy Engraved LET'}}>Academy Engraved LET </Text>
        <Text style={{fontFamily: 'AcademyEngravedLetPlain'}}>AcademyEngravedLetPlain </Text>
        <Text style={{fontFamily: 'Al Nile'}}>Al Nile </Text>
        <Text style={{fontFamily: 'AlNile-Bold'}}>AlNile-Bold </Text>
        <Text style={{fontFamily: 'American Typewriter'}}>American Typewriter </Text>
        <Text style={{fontFamily: 'AmericanTypewriter-Bold'}}>AmericanTypewriter-Bold </Text>
        <Text style={{fontFamily: 'AmericanTypewriter-Condensed'}}>AmericanTypewriter-Condensed </Text>
        <Text style={{fontFamily: 'AmericanTypewriter-CondensedBold'}}>AmericanTypewriter-CondensedBold </Text>
        <Text style={{fontFamily: 'AmericanTypewriter-CondensedLight'}}>AmericanTypewriter-CondensedLight </Text>
        <Text style={{fontFamily: 'AmericanTypewriter-Light'}}>AmericanTypewriter-Light </Text>
        <Text style={{fontFamily: 'Apple Color Emoji'}}>Apple Color Emoji </Text>
        <Text style={{fontFamily: 'Apple SD Gothic Neo'}}>Apple SD Gothic Neo </Text>
        <Text style={{fontFamily: 'AppleColorEmoji'}}>AppleColorEmoji </Text>
        <Text style={{fontFamily: 'AppleSDGothicNeo-Bold'}}>AppleSDGothicNeo-Bold </Text>
        <Text style={{fontFamily: 'AppleSDGothicNeo-Light'}}>AppleSDGothicNeo-Light </Text>
        <Text style={{fontFamily: 'AppleSDGothicNeo-Medium'}}>AppleSDGothicNeo-Medium </Text>
        <Text style={{fontFamily: 'AppleSDGothicNeo-Regular'}}>AppleSDGothicNeo-Regular </Text>
        <Text style={{fontFamily: 'AppleSDGothicNeo-SemiBold'}}>AppleSDGothicNeo-SemiBold </Text>
        <Text style={{fontFamily: 'AppleSDGothicNeo-Thin'}}>AppleSDGothicNeo-Thin </Text>
        <Text style={{fontFamily: 'AppleSDGothicNeo-UltraLight'}}>AppleSDGothicNeo-UltraLight </Text>
        <Text style={{fontFamily: 'Arial'}}>Arial </Text>
        <Text style={{fontFamily: 'Arial Hebrew'}}>Arial Hebrew </Text>
        <Text style={{fontFamily: 'Arial Rounded MT Bold'}}>Arial Rounded MT Bold </Text>
        <Text style={{fontFamily: 'Arial-BoldItalicMT'}}>Arial-BoldItalicMT </Text>
        <Text style={{fontFamily: 'Arial-BoldMT'}}>Arial-BoldMT </Text>
        <Text style={{fontFamily: 'Arial-ItalicMT'}}>Arial-ItalicMT </Text>
        <Text style={{fontFamily: 'ArialHebrew'}}>ArialHebrew </Text>
        <Text style={{fontFamily: 'ArialHebrew-Bold'}}>ArialHebrew-Bold </Text>
        <Text style={{fontFamily: 'ArialHebrew-Light'}}>ArialHebrew-Light </Text>
        <Text style={{fontFamily: 'ArialMT'}}>ArialMT </Text>
        <Text style={{fontFamily: 'ArialRoundedMTBold'}}>ArialRoundedMTBold </Text>
        <Text style={{fontFamily: 'Avenir'}}>Avenir </Text>
        <Text style={{fontFamily: 'Avenir Next'}}>Avenir Next </Text>
        <Text style={{fontFamily: 'Avenir Next Condensed'}}>Avenir Next Condensed </Text>
        <Text style={{fontFamily: 'Avenir-Black'}}>Avenir-Black </Text>
        <Text style={{fontFamily: 'Avenir-BlackOblique'}}>Avenir-BlackOblique </Text>
        <Text style={{fontFamily: 'Avenir-Book'}}>Avenir-Book </Text>
        <Text style={{fontFamily: 'Avenir-BookOblique'}}>Avenir-BookOblique </Text>
        <Text style={{fontFamily: 'Avenir-Heavy'}}>Avenir-Heavy </Text>
        <Text style={{fontFamily: 'Avenir-HeavyOblique'}}>Avenir-HeavyOblique </Text>
        <Text style={{fontFamily: 'Avenir-Light'}}>Avenir-Light </Text>
        <Text style={{fontFamily: 'Avenir-LightOblique'}}>Avenir-LightOblique </Text>
        <Text style={{fontFamily: 'Avenir-Medium'}}>Avenir-Medium </Text>
        <Text style={{fontFamily: 'Avenir-MediumOblique'}}>Avenir-MediumOblique </Text>
        <Text style={{fontFamily: 'Avenir-Oblique'}}>Avenir-Oblique </Text>
        <Text style={{fontFamily: 'Avenir-Roman'}}>Avenir-Roman </Text>
        <Text style={{fontFamily: 'AvenirNext-Bold'}}>AvenirNext-Bold </Text>
        <Text style={{fontFamily: 'AvenirNext-BoldItalic'}}>AvenirNext-BoldItalic </Text>
        <Text style={{fontFamily: 'AvenirNext-DemiBold'}}>AvenirNext-DemiBold </Text>
        <Text style={{fontFamily: 'AvenirNext-DemiBoldItalic'}}>AvenirNext-DemiBoldItalic </Text>
        <Text style={{fontFamily: 'AvenirNext-Heavy'}}>AvenirNext-Heavy </Text>
        <Text style={{fontFamily: 'AvenirNext-HeavyItalic'}}>AvenirNext-HeavyItalic </Text>
        <Text style={{fontFamily: 'AvenirNext-Italic'}}>AvenirNext-Italic </Text>
        <Text style={{fontFamily: 'AvenirNext-Medium'}}>AvenirNext-Medium </Text>
        <Text style={{fontFamily: 'AvenirNext-MediumItalic'}}>AvenirNext-MediumItalic </Text>
        <Text style={{fontFamily: 'AvenirNext-Regular'}}>AvenirNext-Regular </Text>
        <Text style={{fontFamily: 'AvenirNext-UltraLight'}}>AvenirNext-UltraLight </Text>
        <Text style={{fontFamily: 'AvenirNext-UltraLightItalic'}}>AvenirNext-UltraLightItalic </Text>
        <Text style={{fontFamily: 'AvenirNextCondensed-Bold'}}>AvenirNextCondensed-Bold </Text>
        <Text style={{fontFamily: 'AvenirNextCondensed-BoldItalic'}}>AvenirNextCondensed-BoldItalic </Text>
        <Text style={{fontFamily: 'AvenirNextCondensed-DemiBold'}}>AvenirNextCondensed-DemiBold </Text>
        <Text style={{fontFamily: 'AvenirNextCondensed-DemiBoldItalic'}}>AvenirNextCondensed-DemiBoldItalic </Text>
        <Text style={{fontFamily: 'AvenirNextCondensed-Heavy'}}>AvenirNextCondensed-Heavy </Text>
        <Text style={{fontFamily: 'AvenirNextCondensed-HeavyItalic'}}>AvenirNextCondensed-HeavyItalic </Text>
        <Text style={{fontFamily: 'AvenirNextCondensed-Italic'}}>AvenirNextCondensed-Italic </Text>
        <Text style={{fontFamily: 'AvenirNextCondensed-Medium'}}>AvenirNextCondensed-Medium </Text>
        <Text style={{fontFamily: 'AvenirNextCondensed-MediumItalic'}}>AvenirNextCondensed-MediumItalic </Text>
        <Text style={{fontFamily: 'AvenirNextCondensed-Regular'}}>AvenirNextCondensed-Regular </Text>
        <Text style={{fontFamily: 'AvenirNextCondensed-UltraLight'}}>AvenirNextCondensed-UltraLight </Text>
        <Text style={{fontFamily: 'AvenirNextCondensed-UltraLightItalic'}}>AvenirNextCondensed-UltraLightItalic </Text>
        <Text style={{fontFamily: 'Bangla Sangam MN'}}>Bangla Sangam MN </Text>
        <Text style={{fontFamily: 'Baskerville'}}>Baskerville </Text>
        <Text style={{fontFamily: 'Baskerville-Bold'}}>Baskerville-Bold </Text>
        <Text style={{fontFamily: 'Baskerville-BoldItalic'}}>Baskerville-BoldItalic </Text>
        <Text style={{fontFamily: 'Baskerville-Italic'}}>Baskerville-Italic </Text>
        <Text style={{fontFamily: 'Baskerville-SemiBold'}}>Baskerville-SemiBold </Text>
        <Text style={{fontFamily: 'Baskerville-SemiBoldItalic'}}>Baskerville-SemiBoldItalic </Text>
        <Text style={{fontFamily: 'Bodoni 72'}}>Bodoni 72 </Text>
        <Text style={{fontFamily: 'Bodoni 72 Oldstyle'}}>Bodoni 72 Oldstyle </Text>
        <Text style={{fontFamily: 'Bodoni 72 Smallcaps'}}>Bodoni 72 Smallcaps </Text>
        <Text style={{fontFamily: 'Bodoni Ornaments'}}>Bodoni Ornaments </Text>
        <Text style={{fontFamily: 'BodoniOrnamentsITCTT'}}>BodoniOrnamentsITCTT </Text>
        <Text style={{fontFamily: 'BodoniSvtyTwoITCTT-Bold'}}>BodoniSvtyTwoITCTT-Bold </Text>
        <Text style={{fontFamily: 'BodoniSvtyTwoITCTT-Book'}}>BodoniSvtyTwoITCTT-Book </Text>
        <Text style={{fontFamily: 'BodoniSvtyTwoITCTT-BookIta'}}>BodoniSvtyTwoITCTT-BookIta </Text>
        <Text style={{fontFamily: 'BodoniSvtyTwoOSITCTT-Bold'}}>BodoniSvtyTwoOSITCTT-Bold </Text>
        <Text style={{fontFamily: 'BodoniSvtyTwoOSITCTT-Book'}}>BodoniSvtyTwoOSITCTT-Book </Text>
        <Text style={{fontFamily: 'BodoniSvtyTwoSCITCTT-Book'}}>BodoniSvtyTwoSCITCTT-Book </Text>
        <Text style={{fontFamily: 'Bradley Hand'}}>Bradley Hand </Text>
        <Text style={{fontFamily: 'BradleyHandITCTT-Bold'}}>BradleyHandITCTT-Bold </Text>
        <Text style={{fontFamily: 'Chalkboard SE'}}>Chalkboard SE </Text>
        <Text style={{fontFamily: 'ChalkboardSE-Bold'}}>ChalkboardSE-Bold </Text>
        <Text style={{fontFamily: 'ChalkboardSE-Light'}}>ChalkboardSE-Light </Text>
        <Text style={{fontFamily: 'ChalkboardSE-Regular'}}>ChalkboardSE-Regular </Text>
        <Text style={{fontFamily: 'Chalkduster'}}>Chalkduster </Text>
        <Text style={{fontFamily: 'Chalkduster'}}>Chalkduster </Text>
        <Text style={{fontFamily: 'Cochin'}}>Cochin </Text>
        <Text style={{fontFamily: 'Cochin-Bold'}}>Cochin-Bold </Text>
        <Text style={{fontFamily: 'Cochin-BoldItalic'}}>Cochin-BoldItalic </Text>
        <Text style={{fontFamily: 'Cochin-Italic'}}>Cochin-Italic </Text>
        <Text style={{fontFamily: 'Copperplate'}}>Copperplate </Text>
        <Text style={{fontFamily: 'Copperplate-Bold'}}>Copperplate-Bold </Text>
        <Text style={{fontFamily: 'Copperplate-Light'}}>Copperplate-Light </Text>
        <Text style={{fontFamily: 'Courier'}}>Courier </Text>
        <Text style={{fontFamily: 'Courier New'}}>Courier New </Text>
        <Text style={{fontFamily: 'Courier-Bold'}}>Courier-Bold </Text>
        <Text style={{fontFamily: 'Courier-BoldOblique'}}>Courier-BoldOblique </Text>
        <Text style={{fontFamily: 'Courier-Oblique'}}>Courier-Oblique </Text>
        <Text style={{fontFamily: 'CourierNewPS-BoldItalicMT'}}>CourierNewPS-BoldItalicMT </Text>
        <Text style={{fontFamily: 'CourierNewPS-BoldMT'}}>CourierNewPS-BoldMT </Text>
        <Text style={{fontFamily: 'CourierNewPS-ItalicMT'}}>CourierNewPS-ItalicMT </Text>
        <Text style={{fontFamily: 'CourierNewPSMT'}}>CourierNewPSMT </Text>
        <Text style={{fontFamily: 'Damascus'}}>Damascus </Text>
        <Text style={{fontFamily: 'DamascusBold'}}>DamascusBold </Text>
        <Text style={{fontFamily: 'DamascusLight'}}>DamascusLight </Text>
        <Text style={{fontFamily: 'DamascusMedium'}}>DamascusMedium </Text>
        <Text style={{fontFamily: 'DamascusSemiBold'}}>DamascusSemiBold </Text>
        <Text style={{fontFamily: 'Devanagari Sangam MN'}}>Devanagari Sangam MN </Text>
        <Text style={{fontFamily: 'DevanagariSangamMN'}}>DevanagariSangamMN </Text>
        <Text style={{fontFamily: 'DevanagariSangamMN-Bold'}}>DevanagariSangamMN-Bold </Text>
        <Text style={{fontFamily: 'Didot'}}>Didot </Text>
        <Text style={{fontFamily: 'Didot-Bold'}}>Didot-Bold </Text>
        <Text style={{fontFamily: 'Didot-Italic'}}>Didot-Italic </Text>
        <Text style={{fontFamily: 'DiwanMishafi'}}>DiwanMishafi </Text>
        <Text style={{fontFamily: 'Euphemia UCAS'}}>Euphemia UCAS </Text>
        <Text style={{fontFamily: 'EuphemiaUCAS-Bold'}}>EuphemiaUCAS-Bold </Text>
        <Text style={{fontFamily: 'EuphemiaUCAS-Italic'}}>EuphemiaUCAS-Italic </Text>
        <Text style={{fontFamily: 'Farah'}}>Farah </Text>
        <Text style={{fontFamily: 'Futura'}}>Futura </Text>
        <Text style={{fontFamily: 'Futura-CondensedExtraBold'}}>Futura-CondensedExtraBold </Text>
        <Text style={{fontFamily: 'Futura-CondensedMedium'}}>Futura-CondensedMedium </Text>
        <Text style={{fontFamily: 'Futura-Medium'}}>Futura-Medium </Text>
        <Text style={{fontFamily: 'Futura-MediumItalic'}}>Futura-MediumItalic </Text>
        <Text style={{fontFamily: 'Geeza Pro'}}>Geeza Pro </Text>
        <Text style={{fontFamily: 'GeezaPro-Bold'}}>GeezaPro-Bold </Text>
        <Text style={{fontFamily: 'Georgia'}}>Georgia </Text>
        <Text style={{fontFamily: 'Georgia-Bold'}}>Georgia-Bold </Text>
        <Text style={{fontFamily: 'Georgia-BoldItalic'}}>Georgia-BoldItalic </Text>
        <Text style={{fontFamily: 'Georgia-Italic'}}>Georgia-Italic </Text>
        <Text style={{fontFamily: 'Gill Sans'}}>Gill Sans </Text>
        <Text style={{fontFamily: 'GillSans-Bold'}}>GillSans-Bold </Text>
        <Text style={{fontFamily: 'GillSans-BoldItalic'}}>GillSans-BoldItalic </Text>
        <Text style={{fontFamily: 'GillSans-Italic'}}>GillSans-Italic </Text>
        <Text style={{fontFamily: 'GillSans-Light'}}>GillSans-Light </Text>
        <Text style={{fontFamily: 'GillSans-LightItalic'}}>GillSans-LightItalic </Text>
        <Text style={{fontFamily: 'GillSans-SemiBold'}}>GillSans-SemiBold </Text>
        <Text style={{fontFamily: 'GillSans-SemiBoldItalic'}}>GillSans-SemiBoldItalic </Text>
        <Text style={{fontFamily: 'GillSans-UltraBold'}}>GillSans-UltraBold </Text>
        <Text style={{fontFamily: 'Heiti SC'}}>Heiti SC </Text>
        <Text style={{fontFamily: 'Heiti TC'}}>Heiti TC </Text>
        <Text style={{fontFamily: 'Helvetica'}}>Helvetica </Text>
        <Text style={{fontFamily: 'Helvetica Neue'}}>Helvetica Neue </Text>
        <Text style={{fontFamily: 'Helvetica-Bold'}}>Helvetica-Bold </Text>
        <Text style={{fontFamily: 'Helvetica-BoldOblique'}}>Helvetica-BoldOblique </Text>
        <Text style={{fontFamily: 'Helvetica-Light'}}>Helvetica-Light </Text>
        <Text style={{fontFamily: 'Helvetica-LightOblique'}}>Helvetica-LightOblique </Text>
        <Text style={{fontFamily: 'Helvetica-Oblique'}}>Helvetica-Oblique </Text>
        <Text style={{fontFamily: 'HelveticaNeue-Bold'}}>HelveticaNeue-Bold </Text>
        <Text style={{fontFamily: 'HelveticaNeue-BoldItalic'}}>HelveticaNeue-BoldItalic </Text>
        <Text style={{fontFamily: 'HelveticaNeue-CondensedBlack'}}>HelveticaNeue-CondensedBlack </Text>
        <Text style={{fontFamily: 'HelveticaNeue-CondensedBold'}}>HelveticaNeue-CondensedBold </Text>
        <Text style={{fontFamily: 'HelveticaNeue-Italic'}}>HelveticaNeue-Italic </Text>
        <Text style={{fontFamily: 'HelveticaNeue-Light'}}>HelveticaNeue-Light </Text>
        <Text style={{fontFamily: 'HelveticaNeue-LightItalic'}}>HelveticaNeue-LightItalic </Text>
        <Text style={{fontFamily: 'HelveticaNeue-Medium'}}>HelveticaNeue-Medium </Text>
        <Text style={{fontFamily: 'HelveticaNeue-MediumItalic'}}>HelveticaNeue-MediumItalic </Text>
        <Text style={{fontFamily: 'HelveticaNeue-Thin'}}>HelveticaNeue-Thin </Text>
        <Text style={{fontFamily: 'HelveticaNeue-ThinItalic'}}>HelveticaNeue-ThinItalic </Text>
        <Text style={{fontFamily: 'HelveticaNeue-UltraLight'}}>HelveticaNeue-UltraLight </Text>
        <Text style={{fontFamily: 'HelveticaNeue-UltraLightItalic'}}>HelveticaNeue-UltraLightItalic </Text>
        <Text style={{fontFamily: 'Hiragino Mincho ProN'}}>Hiragino Mincho ProN </Text>
        <Text style={{fontFamily: 'Hiragino Sans'}}>Hiragino Sans </Text>
        <Text style={{fontFamily: 'HiraginoSans-W3'}}>HiraginoSans-W3 </Text>
        <Text style={{fontFamily: 'HiraginoSans-W6'}}>HiraginoSans-W6 </Text>
        <Text style={{fontFamily: 'HiraMinProN-W3'}}>HiraMinProN-W3 </Text>
        <Text style={{fontFamily: 'HiraMinProN-W6'}}>HiraMinProN-W6 </Text>
        <Text style={{fontFamily: 'Hoefler Text'}}>Hoefler Text </Text>
        <Text style={{fontFamily: 'HoeflerText-Black'}}>HoeflerText-Black </Text>
        <Text style={{fontFamily: 'HoeflerText-BlackItalic'}}>HoeflerText-BlackItalic </Text>
        <Text style={{fontFamily: 'HoeflerText-Italic'}}>HoeflerText-Italic </Text>
        <Text style={{fontFamily: 'HoeflerText-Regular'}}>HoeflerText-Regular </Text>
        <Text style={{fontFamily: 'Iowan Old Style'}}>Iowan Old Style </Text>
        <Text style={{fontFamily: 'IowanOldStyle-Bold'}}>IowanOldStyle-Bold </Text>
        <Text style={{fontFamily: 'IowanOldStyle-BoldItalic'}}>IowanOldStyle-BoldItalic </Text>
        <Text style={{fontFamily: 'IowanOldStyle-Italic'}}>IowanOldStyle-Italic </Text>
        <Text style={{fontFamily: 'IowanOldStyle-Roman'}}>IowanOldStyle-Roman </Text>
        <Text style={{fontFamily: 'Kailasa'}}>Kailasa </Text>
        <Text style={{fontFamily: 'Kailasa-Bold'}}>Kailasa-Bold </Text>
        <Text style={{fontFamily: 'Khmer Sangam MN'}}>Khmer Sangam MN </Text>
        <Text style={{fontFamily: 'Kohinoor Bangla'}}>Kohinoor Bangla </Text>
        <Text style={{fontFamily: 'Kohinoor Devanagari'}}>Kohinoor Devanagari </Text>
        <Text style={{fontFamily: 'Kohinoor Telugu'}}>Kohinoor Telugu </Text>
        <Text style={{fontFamily: 'KohinoorBangla-Light'}}>KohinoorBangla-Light </Text>
        <Text style={{fontFamily: 'KohinoorBangla-Regular'}}>KohinoorBangla-Regular </Text>
        <Text style={{fontFamily: 'KohinoorBangla-Semibold'}}>KohinoorBangla-Semibold </Text>
        <Text style={{fontFamily: 'KohinoorDevanagari-Light'}}>KohinoorDevanagari-Light </Text>
        <Text style={{fontFamily: 'KohinoorDevanagari-Regular'}}>KohinoorDevanagari-Regular </Text>
        <Text style={{fontFamily: 'KohinoorDevanagari-Semibold'}}>KohinoorDevanagari-Semibold </Text>
        <Text style={{fontFamily: 'KohinoorTelugu-Light'}}>KohinoorTelugu-Light </Text>
        <Text style={{fontFamily: 'KohinoorTelugu-Medium'}}>KohinoorTelugu-Medium </Text>
        <Text style={{fontFamily: 'KohinoorTelugu-Regular'}}>KohinoorTelugu-Regular </Text>
        <Text style={{fontFamily: 'Lao Sangam MN'}}>Lao Sangam MN </Text>
        <Text style={{fontFamily: 'Malayalam Sangam MN'}}>Malayalam Sangam MN </Text>
        <Text style={{fontFamily: 'MalayalamSangamMN'}}>MalayalamSangamMN </Text>
        <Text style={{fontFamily: 'MalayalamSangamMN-Bold'}}>MalayalamSangamMN-Bold </Text>
        <Text style={{fontFamily: 'Marker Felt'}}>Marker Felt </Text>
        <Text style={{fontFamily: 'MarkerFelt-Thin'}}>MarkerFelt-Thin </Text>
        <Text style={{fontFamily: 'MarkerFelt-Wide'}}>MarkerFelt-Wide </Text>
        <Text style={{fontFamily: 'Menlo'}}>Menlo </Text>
        <Text style={{fontFamily: 'Menlo-Bold'}}>Menlo-Bold </Text>
        <Text style={{fontFamily: 'Menlo-BoldItalic'}}>Menlo-BoldItalic </Text>
        <Text style={{fontFamily: 'Menlo-Italic'}}>Menlo-Italic </Text>
        <Text style={{fontFamily: 'Menlo-Regular'}}>Menlo-Regular </Text>
        <Text style={{fontFamily: 'Mishafi'}}>Mishafi </Text>
        <Text style={{fontFamily: 'Noteworthy'}}>Noteworthy </Text>
        <Text style={{fontFamily: 'Noteworthy-Bold'}}>Noteworthy-Bold </Text>
        <Text style={{fontFamily: 'Noteworthy-Light'}}>Noteworthy-Light </Text>
        <Text style={{fontFamily: 'Optima'}}>Optima </Text>
        <Text style={{fontFamily: 'Optima-Bold'}}>Optima-Bold </Text>
        <Text style={{fontFamily: 'Optima-BoldItalic'}}>Optima-BoldItalic </Text>
        <Text style={{fontFamily: 'Optima-ExtraBlack'}}>Optima-ExtraBlack </Text>
        <Text style={{fontFamily: 'Optima-Italic'}}>Optima-Italic </Text>
        <Text style={{fontFamily: 'Optima-Regular'}}>Optima-Regular </Text>
        <Text style={{fontFamily: 'Oriya Sangam MN'}}>Oriya Sangam MN </Text>
        <Text style={{fontFamily: 'OriyaSangamMN'}}>OriyaSangamMN </Text>
        <Text style={{fontFamily: 'OriyaSangamMN-Bold'}}>OriyaSangamMN-Bold </Text>
        <Text style={{fontFamily: 'Palatino'}}>Palatino </Text>
        <Text style={{fontFamily: 'Palatino-Bold'}}>Palatino-Bold </Text>
        <Text style={{fontFamily: 'Palatino-BoldItalic'}}>Palatino-BoldItalic </Text>
        <Text style={{fontFamily: 'Palatino-Italic'}}>Palatino-Italic </Text>
        <Text style={{fontFamily: 'Palatino-Roman'}}>Palatino-Roman </Text>
        <Text style={{fontFamily: 'Papyrus'}}>Papyrus </Text>
        <Text style={{fontFamily: 'Papyrus-Condensed'}}>Papyrus-Condensed </Text>
        <Text style={{fontFamily: 'Party LET'}}>Party LET </Text>
        <Text style={{fontFamily: 'PartyLetPlain'}}>PartyLetPlain </Text>
        <Text style={{fontFamily: 'PingFang HK'}}>PingFang HK </Text>
        <Text style={{fontFamily: 'PingFang SC'}}>PingFang SC </Text>
        <Text style={{fontFamily: 'PingFang TC'}}>PingFang TC </Text>
        <Text style={{fontFamily: 'PingFangHK-Light'}}>PingFangHK-Light </Text>
        <Text style={{fontFamily: 'PingFangHK-Medium'}}>PingFangHK-Medium </Text>
        <Text style={{fontFamily: 'PingFangHK-Regular'}}>PingFangHK-Regular </Text>
        <Text style={{fontFamily: 'PingFangHK-Semibold'}}>PingFangHK-Semibold </Text>
        <Text style={{fontFamily: 'PingFangHK-Thin'}}>PingFangHK-Thin </Text>
        <Text style={{fontFamily: 'PingFangHK-Ultralight'}}>PingFangHK-Ultralight </Text>
        <Text style={{fontFamily: 'PingFangSC-Light'}}>PingFangSC-Light </Text>
        <Text style={{fontFamily: 'PingFangSC-Medium'}}>PingFangSC-Medium </Text>
        <Text style={{fontFamily: 'PingFangSC-Regular'}}>PingFangSC-Regular </Text>
        <Text style={{fontFamily: 'PingFangSC-Semibold'}}>PingFangSC-Semibold </Text>
        <Text style={{fontFamily: 'PingFangSC-Thin'}}>PingFangSC-Thin </Text>
        <Text style={{fontFamily: 'PingFangSC-Ultralight'}}>PingFangSC-Ultralight </Text>
        <Text style={{fontFamily: 'PingFangTC-Light'}}>PingFangTC-Light </Text>
        <Text style={{fontFamily: 'PingFangTC-Medium'}}>PingFangTC-Medium </Text>
        <Text style={{fontFamily: 'PingFangTC-Regular'}}>PingFangTC-Regular </Text>
        <Text style={{fontFamily: 'PingFangTC-Semibold'}}>PingFangTC-Semibold </Text>
        <Text style={{fontFamily: 'PingFangTC-Thin'}}>PingFangTC-Thin </Text>
        <Text style={{fontFamily: 'PingFangTC-Ultralight'}}>PingFangTC-Ultralight </Text>
        <Text style={{fontFamily: 'Savoye LET'}}>Savoye LET </Text>
        <Text style={{fontFamily: 'SavoyeLetPlain'}}>SavoyeLetPlain </Text>
        <Text style={{fontFamily: 'Sinhala Sangam MN'}}>Sinhala Sangam MN </Text>
        <Text style={{fontFamily: 'SinhalaSangamMN'}}>SinhalaSangamMN </Text>
        <Text style={{fontFamily: 'SinhalaSangamMN-Bold'}}>SinhalaSangamMN-Bold </Text>
        <Text style={{fontFamily: 'Snell Roundhand'}}>Snell Roundhand </Text>
        <Text style={{fontFamily: 'SnellRoundhand-Black'}}>SnellRoundhand-Black </Text>
        <Text style={{fontFamily: 'SnellRoundhand-Bold'}}>SnellRoundhand-Bold </Text>
        <Text style={{fontFamily: 'Symbol'}}>Symbol </Text>
        <Text style={{fontFamily: 'Tamil Sangam MN'}}>Tamil Sangam MN </Text>
        <Text style={{fontFamily: 'TamilSangamMN-Bold'}}>TamilSangamMN-Bold </Text>
        <Text style={{fontFamily: 'Telugu Sangam MN'}}>Telugu Sangam MN </Text>
        <Text style={{fontFamily: 'Thonburi'}}>Thonburi </Text>
        <Text style={{fontFamily: 'Thonburi-Bold'}}>Thonburi-Bold </Text>
        <Text style={{fontFamily: 'Thonburi-Light'}}>Thonburi-Light </Text>
        <Text style={{fontFamily: 'Times New Roman'}}>Times New Roman </Text>
        <Text style={{fontFamily: 'TimesNewRomanPS-BoldItalicMT'}}>TimesNewRomanPS-BoldItalicMT </Text>
        <Text style={{fontFamily: 'TimesNewRomanPS-BoldMT'}}>TimesNewRomanPS-BoldMT </Text>
        <Text style={{fontFamily: 'TimesNewRomanPS-ItalicMT'}}>TimesNewRomanPS-ItalicMT </Text>
        <Text style={{fontFamily: 'TimesNewRomanPSMT'}}>TimesNewRomanPSMT </Text>
        <Text style={{fontFamily: 'Trebuchet MS'}}>Trebuchet MS </Text>
        <Text style={{fontFamily: 'Trebuchet-BoldItalic'}}>Trebuchet-BoldItalic </Text>
        <Text style={{fontFamily: 'TrebuchetMS-Bold'}}>TrebuchetMS-Bold </Text>
        <Text style={{fontFamily: 'TrebuchetMS-Italic'}}>TrebuchetMS-Italic </Text>
        <Text style={{fontFamily: 'Verdana'}}>Verdana </Text>
        <Text style={{fontFamily: 'Verdana-Bold'}}>Verdana-Bold </Text>
        <Text style={{fontFamily: 'Verdana-BoldItalic'}}>Verdana-BoldItalic </Text>
        <Text style={{fontFamily: 'Verdana-Italic'}}>Verdana-Italic </Text>
        <Text style={{fontFamily: 'Zapf Dingbats'}}>Zapf Dingbats </Text>
        <Text style={{fontFamily: 'ZapfDingbatsITC'}}>ZapfDingbatsITC </Text>
        <Text style={{fontFamily: 'Zapfino'}}>Zapfino </Text> */}

        {/**end fonts */}
    </ScrollView>

}

IssieAbout.navigationOptions = screenProps => ({
    headerStyle: globalStyles.headerStyle,
    headerTintColor: 'white',
    headerTitleStyle: globalStyles.headerTitleStyle,
    headerLeft: getHeaderBackButton(screenProps.navigation)
    })