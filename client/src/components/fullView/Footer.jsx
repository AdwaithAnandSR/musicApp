import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import {
    Feather,
    MaterialCommunityIcons,
    MaterialIcons
} from "@expo/vector-icons";

import { usePlayer } from "@store/player";
import { useAppStatus } from "@store/appState.store.js";
import WheelPicker from "./WheelPicker.jsx";

const ICON_SIZE = 25;

const RepeatButton = () => {
    const repeatMode = usePlayer(state => state.repeatMode);
    const updateRepeatMode = usePlayer(state => state.updateRepeatMode);

    const handlePress = () => {
        if (repeatMode === "queue") {
            updateRepeatMode("one");
        } else if (repeatMode === "one") {
            updateRepeatMode("off");
        } else {
            updateRepeatMode("queue");
        }
    };

    return (
        <TouchableOpacity
            style={styles.repeatBtnContainer}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            {repeatMode === "one" ? (
                <MaterialIcons
                    name="repeat-one"
                    size={ICON_SIZE}
                    color="#22c55e"
                />
            ) : repeatMode === "off" ? (
                <MaterialCommunityIcons
                    name="repeat-off"
                    size={ICON_SIZE}
                    color="#64748b"
                />
            ) : (
                <Feather
                    name="repeat"
                    size={ICON_SIZE}
                    color="#22c55e"
                />
            )}
        </TouchableOpacity>
    );
};

const TimerButton = () => {
    const timer = usePlayer(state => state.timer);
    const [timeLeftStr, setTimeLeftStr] = useState("");

    useEffect(() => {
        if (!timer) {
            setTimeLeftStr("");
            return;
        }

        const update = () => {
            const rem = timer - Date.now();
            if (rem <= 0) {
                setTimeLeftStr("");
            } else {
                const totalSec = Math.floor(rem / 1000);
                const mins = Math.floor(totalSec / 60);
                const hrs = Math.floor(mins / 60);
                if (hrs > 0) {
                    setTimeLeftStr(`${hrs}h`);
                } else if (mins > 0) {
                    setTimeLeftStr(`${mins}m`);
                } else {
                    setTimeLeftStr(`${totalSec}s`);
                }
            }
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [timer]);

    const isTimerActive = !!timeLeftStr;

    return (
        <TouchableOpacity
            style={styles.timerBtnContainer}
            onPress={() => useAppStatus.getState().toggleTimerSelect()}
        >
            <Feather
                name="clock"
                size={ICON_SIZE}
                color={isTimerActive ? "#22c55e" : "white"}
            />
            {isTimerActive && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{timeLeftStr}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const Footer = () => {
    return (
        <View style={styles.container}>
            <RepeatButton />
            <TimerButton />
            <TouchableOpacity style={styles.iconBtnContainer}>
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
        alignItems: "center",
        flexDirection: "row",
        paddingHorizontal: 50,
        gap: 50,
        marginTop: 25
    },
    repeatBtnContainer: {
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center"
    },
    timerBtnContainer: {
        width: 32,
        height: 32,
        position: "relative",
        alignItems: "center",
        justifyContent: "center"
    },
    iconBtnContainer: {
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center"
    },
    badge: {
        position: "absolute",
        top: -8,
        right: -12,
        backgroundColor: "#22c55e",
        borderRadius: 8,
        paddingHorizontal: 4,
        paddingVertical: 1,
        minWidth: 16,
        alignItems: "center",
        justifyContent: "center"
    },
    badgeText: {
        color: "#000000",
        fontSize: 9,
        fontWeight: "bold"
    }
});

export default Footer;
