import React from "react";
import { Text, View } from "react-native";


export function Test({a,b}:{a:string, b:number}) {
    return <View>
        <Text>{a+b}</Text>
    </View>
}