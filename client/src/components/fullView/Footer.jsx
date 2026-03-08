import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import {
    Feather,
    MaterialCommunityIcons,
    MaterialIcons
} from "@expo/vector-icons";

import { usePlayer } from "@store/player";
import { useAppStatus } from "@store/appState.store.js";
import WheelPicker from "./WheelPicker.jsx";

const toggleTimerSelect = useAppStatus.getState().toggleTimerSelect;
const updateRepeatMode = usePlayer.getState().updateRepeatMode;

const ICON_SIZE = 25;

const RepeatButton = () => {
    const repeatMode = usePlayer(state => state.repeatMode);

    return (
        <>
            {repeatMode == "queue" ? (
                <TouchableOpacity onPress={() => updateRepeatMode("track")}>
                    <Feather name="repeat" size={ICON_SIZE} color="white" />
                </TouchableOpacity>
            ) : repeatMode == "track" ? (
                <TouchableOpacity onPress={() => updateRepeatMode("off")}>
                    <MaterialIcons
                        name="repeat-one"
                        size={ICON_SIZE}
                        color="white"
                    />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity onPress={() => updateRepeatMode("queue")}>
                    <MaterialCommunityIcons
                        name="repeat-off"
                        size={ICON_SIZE}
                        color="white"
                    />
                </TouchableOpacity>
            )}
        </>
    );
};

const Footer = () => {
    return (
        <View style={styles.container}>
            <RepeatButton />
            <TouchableOpacity onPress={() => toggleTimerSelect()}>
                <Feather name="clock" size={ICON_SIZE} color="white" />
            </TouchableOpacity>
            <TouchableOpacity>
                <Feather name="heart" size={ICON_SIZE} color="white" />
            </TouchableOpacity>
            <WheelPicker />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "space-around",
        alignItems: "flex-start",
        flexDirection: "row",
        paddingHorizontal: 50,
        gap: 50,
        marginTop: 25
    }
});

export default Footer;
