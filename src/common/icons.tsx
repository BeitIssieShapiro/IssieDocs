import IconAnt from "@react-native-vector-icons/ant-design"
import IconIonicons from "@react-native-vector-icons/ionicons"
import MDIIcon from "@react-native-vector-icons/material-design-icons"
import MIIcon from "@react-native-vector-icons/material-icons"


const defaultIconColor = "#6E6E6E";

export type IconType = "MDI" | "Ionicons" | "AntDesign" | "MI"

export interface IconProps {
    name: string;
    type?: IconType;
    color?: string;
    size?: number;
}

export function MyIcon({ info, onPress, style }: { info: IconProps, onPress?: () => void, style?: any }) {
    const IconElem = info.type == "Ionicons" ? IconIonicons :
        (info.type == "MDI" ? MDIIcon :
            (info.type == "MI" ? MIIcon : IconAnt));
    // @ts-ignore
    return <IconElem name={info.name} size={info.size || 22} color={info.color || defaultIconColor} style={[{ width: info.size, height: info.size, margin: 0, padding: 0 }, style]} onPress={onPress} />
}

export function MyCloseIcon({ onClose }: { onClose: () => void }) {
    return <MyIcon
        info={{ type: "AntDesign", name: "close", size: 45 }}
        onPress={onClose} />
}
