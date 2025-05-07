import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { FontAwesome5, AntDesign } from "@expo/vector-icons";
import { useAudioPlayerStatus } from "expo-audio";

import { useTrack } from "../context/track.context.js";

const ControllersContainer = () => {
    const { togglePlay, skipToNext, skipToPrevious, player } = useTrack();
    const { playing, isBuffering} = useAudioPlayerStatus(player);

    return (
        <View style={styles.controllsContainer}>
            <TouchableOpacity
                onPress={skipToPrevious}
                style={styles.btnContainer}
            >
                <AntDesign name="stepbackward" size={28} color="white" />
            </TouchableOpacity>
            {playing || isBuffering ? (
                <TouchableOpacity
                    onPress={togglePlay}
                    style={styles.btnContainer}
                >
                    <FontAwesome5 name="pause" size={28} color="white" />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    onPress={togglePlay}
                    style={styles.btnContainer}
                >
                    <FontAwesome5 name="play" size={28} color="white" />
                </TouchableOpacity>
            )}
            <TouchableOpacity onPress={skipToNext} style={styles.btnContainer}>
                <AntDesign name="stepforward" size={28} color="white" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    controllsContainer: {
        width: "70%",
        height: "10%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        alignSelf: "center"
    },
    btnContainer: {
        padding: "8%",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: "50%"
    }
});

export default React.memo(ControllersContainer);
