import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import {
    Feather,
    MaterialCommunityIcons,
    MaterialIcons
} from "@expo/vector-icons";
import TrackPlayer, {
    RepeatMode,
    useRepatMode
} from "react-native-track-player";

import { usePlayerStore } from "../../store/player.store.js";
import { useAppStatus } from "../../store/appState.store.js";
import WheelPicker from "./WheelPicker.jsx";

const toggleTimerSelect = useAppStatus.getState().toggleTimerSelect;
const updateRepeatMode = usePlayerStore.getState().updateRepeatMode;

const ICON_SIZE = 25;

const RepeatButton = () => {
    const repeatMode = usePlayerStore(state => state.repeatMode);

    return (
        <>
            {repeatMode == "queue" ? (
                <TouchableOpacity
                    onPress={async () => {
                        await TrackPlayer.setRepeatMode(RepeatMode.Track);
                        updateRepeatMode("track");
                    }}
                >
                    <Feather name="repeat" size={ICON_SIZE} color="white" />
                </TouchableOpacity>
            ) : repeatMode == "track" ? (
                <TouchableOpacity
                    onPress={async () => {
                        await TrackPlayer.setRepeatMode(RepeatMode.Off);
                        updateRepeatMode("off");
                    }}
                >
                    <MaterialIcons
                        name="repeat-one"
                        size={ICON_SIZE}
                        color="white"
                    />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    onPress={async () => {
                        await TrackPlayer.setRepeatMode(RepeatMode.Queue);
                        updateRepeatMode("queue");
                    }}
                >
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
