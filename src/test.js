import { useState } from "react";
import { View, TextInput, Button } from "react-native";

export function TestCmp(props) {
    const [val, setVal] = useState("")

    const handleTextChange = (newText) => {
        console.log("Text change", newText)
        setVal(newText)
    }
    return <View style={{width:"100%", height:"100%"}}>
        <TextInput 
            onChangeText={handleTextChange}
            style={{width:100, height:50, backgroundColor:"yellow"}}
            value={val}
            multiline={true}
            autoFocus
        
        />

        <Button onPress={()=>setVal("abc")} title="Reset"></Button>
    </View>
}