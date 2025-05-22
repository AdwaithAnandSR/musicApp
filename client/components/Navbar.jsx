import React from "react";
import {
    View,
    Text,
    Dimensions,
    TouchableOpacity,
    StyleSheet
} from "react-native";
import { FontAwesome, Entypo } from "@expo/vector-icons";

import { useAppState } from "../context/appState.context.js";

const { height: vh, width: vw } = Dimensions.get("window");

const Navbar = () => {
    const { isSelecting, selectedSongs, setIsSelecting, setSelectedSongs } =
        useAppState();

    if (!isSelecting) return;

    const disSelectAll = () => {
        setIsSelecting(false);
        setSelectedSongs([]);
    };

    return (
        <View style={styles.container}>
            <View style={styles.selectDetsContainer}>
                <FontAwesome
                    name="check-square-o"
                    size={20}
                    color="rgb(246,7,135)"
                />
                <Text style={styles.text}>{selectedSongs?.length}</Text>
            </View>
            <View style={styles.toolsContainer}>
                <TouchableOpacity onPress={disSelectAll}>
                    <Entypo name="cross" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        height: vh * 0.07,
        paddingHorizontal: vw * 0.04,
    },
    selectDetsContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5
    },
    text: {
        color: "white",
        marginBottom: 3,
        fontWeight: "bold",
        fontSize: vw * 0.05
    },
    toolsContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 20
    }
});

export default Navbar;
