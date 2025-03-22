import { View } from "react-native";

const filledColor = "green";

export function AudioWaveForm({height, color, progress, infiniteProgress, baseColor, width}) {
    const wave = [15, 30, 15, 15, 30, 15, 15, 30, 15, 15, 30, 15];
    const inc = (width/ 3) / wave.length;

    return <View style={{
        flex: 1,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        maxHeight: height || 100,
        minHeight:height || 100,
    }}>
        {wave.map((w, i) => (<View key={i}
            style={{
                height: w,
                width: inc,
                backgroundColor: progress > 0 ?
                    (wave.length * progress > i ? color || filledColor : baseColor) :
                    infiniteProgress > 0 ?
                        infiniteProgress % wave.length == i ? color || filledColor : baseColor :
                        baseColor,
                marginLeft: inc-2,
                marginRight: inc-2,
                borderRadius: 2,
            }}
        />))}
    </View>
}