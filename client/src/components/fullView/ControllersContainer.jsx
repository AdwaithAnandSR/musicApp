import React, { useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { FontAwesome5, AntDesign } from "@expo/vector-icons";

import { useStatus } from "@store/appState.store.js";
import { usePlayer } from "@store/player";

const playPauseIconSize = 28,
    nextPrevIconSize = 33;

const ControllersContainer = () => {
    const resetShowLyrics = useStatus(state => state.resetShowLyrics);

    const playPause = usePlayer(state => state.playPause);
    const isPlaying = usePlayer(state => state.isPlaying);
    const isBuffering = usePlayer(state => state.isBuffering);
    const next = usePlayer(state => state.next);
    const prev = usePlayer(state => state.prev);
    const setRate = usePlayer(state => state.setRate);

    const [speedLabel, setSpeedLabel] = useState(null);
    const holdTimerRef = useRef(null);
    const isHoldingRef = useRef(false);

    const handlePressIn = direction => {
        isHoldingRef.current = false;
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

        holdTimerRef.current = setTimeout(() => {
            isHoldingRef.current = true;
            setSpeedLabel(direction === "next" ? "2x" : "0.5x");
            setRate(2.0);
        }, 220);
    };

    const handlePressOut = direction => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }

        if (isHoldingRef.current) {
            setRate(1.0);
            setSpeedLabel(null);
            isHoldingRef.current = false;
        } else {
            resetShowLyrics();
            if (direction === "next") {
                next();
            } else {
                prev();
            }
        }
    };

    return (
        <View style={styles.outerContainer}>
            {speedLabel && (
                <View style={styles.badgeContainer}>
                    <Text style={styles.speedBadge}>{speedLabel}</Text>
                </View>
            )}
            <View style={styles.controllsContainer}>
                <TouchableOpacity
                    onPressIn={() => handlePressIn("prev")}
                    onPressOut={() => handlePressOut("prev")}
                    activeOpacity={0.7}
                    style={styles.btnContainer}
                >
                    <AntDesign
                        name="step-backward"
                        size={nextPrevIconSize}
                        color="white"
                    />
                </TouchableOpacity>
                {isPlaying || isBuffering ? (
                    <TouchableOpacity
                        onPress={playPause}
                        style={styles.btnContainer}
                    >
                        <FontAwesome5
                            name="pause"
                            size={playPauseIconSize}
                            color="white"
                        />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={playPause}
                        style={styles.btnContainer}
                    >
                        <FontAwesome5
                            name="play"
                            size={playPauseIconSize}
                            color="white"
                        />
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    onPressIn={() => handlePressIn("next")}
                    onPressOut={() => handlePressOut("next")}
                    activeOpacity={0.7}
                    style={styles.btnContainer}
                >
                    <AntDesign
                        name="step-forward"
                        size={nextPrevIconSize}
                        color="white"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        minHeight: 60,
        marginVertical: 10
    },
    badgeContainer: {
        position: "absolute",
        top: -35,
        backgroundColor: "#000000e9",
        borderColor: "#292929e9",
        borderWidth: 1,
        paddingHorizontal: 25,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 99
    },
    speedBadge: {
        color: "white",
        fontWeight: "bold",
        fontSize: 13,
        letterSpacing: 0.5
    },
    controllsContainer: {
        width: "70%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        alignSelf: "center"
    },
    btnContainer: {
        padding: 12,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 40
    }
});

export default React.memo(ControllersContainer);
