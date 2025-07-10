import React from "react";
import { TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Entypo } from "@expo/vector-icons";
import { router } from "expo-router"

const { height: vh, width: vw } = Dimensions.get("window");

const FloatingAdd = ({ handlePress }) => {
    return (
        <TouchableOpacity onPress={()=> router.push('secure/others/AddPlaylist')} style={styles.container}>
            <Entypo name="plus" size={24} color="white" />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: vw * 0.15,
        height: vw * 0.15,
        backgroundColor: "rgb(246,7,135)",
        borderRadius: "25%",
        justifyContent: "center",
        alignItems: "center",
        position: "absolute",
        bottom: vh * 0.18,
        right: vw * 0.08
    }
});

export default FloatingAdd;
