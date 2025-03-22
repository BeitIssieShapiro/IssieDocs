import { View, Text } from "react-native";
import { getRowDirection, getRowReverseDirection } from "./lang";
import { AppText, dimensions, getFontFamily, globalStyles, semanticColors } from "./elements";

export function TopHeader({ actions, title, titleText, nav }) {
    return <View style={{
        flexDirection: getRowReverseDirection(),
        justifyContent: 'space-between',
        height: dimensions.headerHeight,
        alignItems: "flex-end",
        fontSize: 30, fontWeight: 'bold', fontFamily: getFontFamily(),
        backgroundColor: semanticColors.header,
        zIndex: 2000,
    }}>
        <View style={{ padding: 5, width: '15%', height: 40, alignItems: 'center' }}>{actions}</View>
        <View style={{ width: '70%', height: 40, alignItems: 'center'}}>
            {titleText && <AppText style={[globalStyles.headerThinTitleStyle, getFontFamily()]}>{titleText}</AppText>}
            {title}
        </View>
        <View style={{ padding: 5, flexDirection: getRowDirection(), width: '15%', height: 40, alignItems: 'center', justifyContent: "flex-start" }}>{nav}</View>
    </View>
}