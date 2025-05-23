import React from "react";
import {
    View,
    Text,
    Dimensions,
    TouchableOpacity,
    StyleSheet
} from "react-native";
import { Entypo } from "@expo/vector-icons";

import { useMultiSelect } from "../store/appState.store.js";

const { height: vh, width: vw } = Dimensions.get("window");

const Navbar = () => {
    const isSelecting = useMultiSelect(state=> state.selectedSongs?.length > 0);
    const reset = useMultiSelect(state=> state.reset);
    const selectedSongsLen = useMultiSelect(state=> state.selectedSongs?.length);

    if (!isSelecting) return;

    return (
        <View style={styles.container}>
            <View style={styles.selectDetsContainer}>
                <Text style={styles.text}>Selected: {selectedSongsLen}</Text>
            </View>
            <View style={styles.toolsContainer}>
                <TouchableOpacity onPress={reset}>
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
        height: vh * 0.045,
        paddingHorizontal: vw * 0.04,
        position: 'absolute',
        zIndex: 999,
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
