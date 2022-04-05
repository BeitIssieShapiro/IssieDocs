import React, { useEffect } from "react";
import { useState } from "react";
import { Alert, Linking, View } from "react-native";
import { Button, TextInput } from "react-native";
import { AppText, getRoundedButton, Spacer } from "./elements";
import { translate } from "./lang";
const disabled = true;

export function OpenLink({ navigation, route }) {
    const [val, setVal] = useState("")
    const [v1, setV1] = useState(Math.floor(Math.random() * 20));
    const [v2, setV2] = useState(Math.floor(Math.random() * 20));
    const url = route.params.url;

    useEffect(() => {
        if (disabled) {
            Linking.openURL(url);
            navigation.goBack();
        }
    }, []);

    if (disabled) {
        return <View/>
    }

    return <View style={{
        height: "100%",
        width: "100%",
        alignItems: 'center',
        backgroundColor: 'white'
    }}>
        <Spacer />
        <AppText>This Area is for an adult Only</AppText>
        <Spacer />
        <AppText>You asked to open '{url}'</AppText>
        <AppText>To open this link, an adult approval is required</AppText>
        <Spacer />
        <AppText>{v1} x {v2} = ?</AppText>
        <TextInput
            style={{ width: 200, fontSize: 25, borderWidth: 1, textAlign: 'center' }}
            value={val} onChangeText={(text) => {
                setVal(text);
            }}></TextInput>
        <Spacer height={25} />
        <View style={{ flexDirection: "row" }}>
            {
                getRoundedButton(() => navigation.goBack(), 'cancel-red', translate("BtnCancel"), 30, 30, { width: 150, height: 40 }, undefined, undefined, false)
            }
            <Spacer />
            {
                getRoundedButton(() => {
                    if (v1 * v2 == parseInt(val)) {
                        Linking.openURL(url);
                        navigation.goBack();
                    } else {
                        Alert.alert("Wrong...");
                    }
                }, 'check-green', "Proceed to website", 30, 30, { width: 350, height: 40 }, undefined, undefined, false)
            }

        </View>

    </View>
}