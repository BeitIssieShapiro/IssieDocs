import { View, Text } from "react-native";
import { getRowDirection, getRowReverseDirection } from "./lang";
import { dimensions, getFontFamily, globalStyles, semanticColors } from "./elements";

export function TopHeader({ actions, title, titleText, nav }) {
    return <View style={{
        flexDirection: getRowReverseDirection(),
        justifyContent: 'space-between',
        height: dimensions.headerHeight,
        alignItems: "flex-end",
        fontSize: 30, fontWeight: 'bold', fontFamily: getFontFamily(),
        backgroundColor: semanticColors.header,

    }}>
        <View style={{ padding: 5, width: '15%', height: 40, alignItems: 'center' }}>{actions}</View>
        <View style={{ width: '70%', height: 40, alignItems: 'center'}}>
            {titleText && <Text style={[globalStyles.headerThinTitleStyle, getFontFamily()]}>{titleText}</Text>}
            {title}
        </View>
        <View style={{ padding: 5, flexDirection: getRowDirection(), width: '15%', height: 40, alignItems: 'center', justifyContent: "flex-start" }}>{nav}</View>
    </View>
}