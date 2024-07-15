import { useState } from "react";
import { Text } from "react-native";
import { View, TextInput, Button } from "react-native";





export function TestCmp(props) {
    const [val, setVal] = useState("")

    const handleTextChange = (newText) => {
        console.log("Text change", newText)
        setVal(newText)
    }
    return <View style={{width:"100%", height:"100%", alignItems:"center", justifyContent:"center"}}>
        {/* <TextInput 
            onChangeText={handleTextChange}
            style={{width:100, height:50, backgroundColor:"yellow"}}
            value={val}
            multiline={true}
            autoFocus
        
        /> */}
       {/* <SpecialText text="This is a very long text" style={{width:150, fontSize:26}}></SpecialText> */}
        {/* <Button onPress={()=>setVal("abc")} title="Reset"></Button> */}
    </View>
}