/* global setInterval, clearInterval */
import React, { useState, useEffect } from "react";
import {
    View,
    StyleSheet,
    Text,
    Dimensions,
    TouchableOpacity
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { useAppStatus } from "@store/appState.store.js";
import { usePlayer } from "@store/player.js";
import Toast from "@services/Toast.js";

const { width: vw, height: vh } = Dimensions.get("window");

const handleSetTimer = ms => {
    const now = new Date();
    const target = new Date(now.getTime() + ms);

    usePlayer.getState().setTimer(target.getTime());
    useAppStatus.getState().toggleTimerSelect();
    Toast.show("Timer Set", "success");
};

const handleCancelTimer = () => {
    usePlayer.getState().setTimer(null);
    useAppStatus.getState().toggleTimerSelect();
    Toast.show("Timer Cancelled", "success");
};

const formatTimeLeft = ms => {
    if (!ms || ms <= 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = num => String(num).padStart(2, "0");

    if (hours > 0) {
        return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
};

const WheelPicker = () => {
    const isTimerSelecting = useAppStatus(state => state.isTimerSelecting);
    const timer = usePlayer(state => state.timer);
    const [timeLeft, setTimeLeft] = useState(() => (timer ? Math.max(0, timer - Date.now()) : 0));

    useEffect(() => {
        if (!timer) return;

        const updateCountdown = () => {
            const remaining = Math.max(0, timer - Date.now());
            setTimeLeft(remaining);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [timer]);

    if (!isTimerSelecting) return null;

    const hasActiveTimer = timer != null && timeLeft > 0;

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.titleText}>Sleep Timer</Text>
                <TouchableOpacity
                    onPress={() => useAppStatus.getState().toggleTimerSelect()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Feather name="x" size={18} color="#94a3b8" />
                </TouchableOpacity>
            </View>

            {hasActiveTimer && (
                <View style={styles.activeBox}>
                    <Text style={styles.activeLabel}>Active Countdown</Text>
                    <Text style={styles.timerCountdown}>
                        {formatTimeLeft(timeLeft)}
                    </Text>
                    <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={handleCancelTimer}
                        activeOpacity={0.7}
                    >
                        <Feather name="x-circle" size={15} color="#ef4444" />
                        <Text style={styles.cancelBtnText}>Cancel Timer</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.optionsList}>
                <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => handleSetTimer(1 * 60 * 1000)}
                >
                    <Text style={styles.timeText}>1 min</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => handleSetTimer(5 * 60 * 1000)}
                >
                    <Text style={styles.timeText}>5 min</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => handleSetTimer(10 * 60 * 1000)}
                >
                    <Text style={styles.timeText}>10 min</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => handleSetTimer(30 * 60 * 1000)}
                >
                    <Text style={styles.timeText}>30 min</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => handleSetTimer(60 * 60 * 1000)}
                >
                    <Text style={styles.timeText}>60 min</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => handleSetTimer(2 * 60 * 60 * 1000)}
                >
                    <Text style={styles.timeText}>2 hr</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => handleSetTimer(5 * 60 * 60 * 1000)}
                >
                    <Text style={styles.timeText}>5 hr</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => handleSetTimer(10 * 60 * 60 * 1000)}
                >
                    <Text style={styles.timeText}>10 hr</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#121216ef",
        borderColor: "#2a2a32",
        borderWidth: 1,
        width: vw * 0.65,
        borderRadius: 20,
        position: "absolute",
        bottom: 70 - vh * 0.01,
        right: (vw * 0.1) / 2,
        zIndex: 9999,
        overflow: "hidden",
        padding: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
        elevation: 15
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: "#ffffff15"
    },
    titleText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: 0.8
    },
    activeBox: {
        backgroundColor: "#1e1e24",
        borderRadius: 14,
        padding: 10,
        alignItems: "center",
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#22c55e44"
    },
    activeLabel: {
        fontSize: 10,
        color: "#22c55e",
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5
    },
    timerCountdown: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#ffffff",
        marginVertical: 2,
        fontVariant: ["tabular-nums"]
    },
    cancelBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "#ef44441a",
        borderColor: "#ef444444",
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        marginTop: 4
    },
    cancelBtnText: {
        color: "#ef4444",
        fontSize: 12,
        fontWeight: "600"
    },
    optionsList: {
        gap: 1
    },
    optionItem: {
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderRadius: 8
    },
    timeText: {
        fontSize: 17,
        fontWeight: "600",
        color: "#f8fafc",
        textAlign: "center"
    }
});

export default WheelPicker;
