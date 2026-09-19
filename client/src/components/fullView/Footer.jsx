import { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    findNodeHandle,
    UIManager,
    Platform
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, runOnJS } from "react-native-reanimated";
import {
    Feather,
    MaterialCommunityIcons,
    MaterialIcons
} from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { usePlayer } from "@store/player";
import SleepTimerPopup from "./SleepTimerPopup.jsx";

const ICON_SIZE = 25;
const LONG_PRESS_DURATION = 300; // ms

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
                <Feather name="repeat" size={ICON_SIZE} color="#22c55e" />
            )}
        </TouchableOpacity>
    );
};

const TimerButton = () => {
    const timer = usePlayer(state => state.timer);
    const [popupVisible, setPopupVisible] = useState(false);
    const [anchorLayout, setAnchorLayout] = useState(null);
    const timerRef = useRef(null);
    const highlightIndexRef = useRef(-1);

    // Shared value for highlighting — passed to popup
    const highlightIndex = useSharedValue(-1);

    const getRemainingStr = targetTimer => {
        if (!targetTimer) return "";
        const rem = targetTimer - Date.now();
        if (rem <= 0) return "";
        const totalSec = Math.floor(rem / 1000);
        const mins = Math.floor(totalSec / 60);
        const hrs = Math.floor(mins / 60);
        if (hrs > 0) return `${hrs}h`;
        if (mins > 0) return `${mins}m`;
        return `${totalSec}s`;
    };

    const [timeLeftStr, setTimeLeftStr] = useState(() =>
        getRemainingStr(timer)
    );

    useEffect(() => {
        if (!timer) {
            setTimeLeftStr("");
            return;
        }

        const update = () => {
            setTimeLeftStr(getRemainingStr(timer));
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [timer]);

    const isTimerActive = !!timeLeftStr;

    // Measure the button position for popup anchoring
    const measureButton = useCallback(() => {
        if (timerRef.current) {
            timerRef.current.measureInWindow((x, y, width, height) => {
                setAnchorLayout({ pageX: x, pageY: y, width, height });
            });
        }
    }, []);

    const lastHapticIdx = useRef(-1);

    const openPopup = useCallback(() => {
        if (timerRef.current) {
            timerRef.current.measureInWindow((x, y, width, height) => {
                setAnchorLayout({ pageX: x, pageY: y, width, height });
                setPopupVisible(true);
            });
        } else {
            setPopupVisible(true);
        }
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch {}
    }, []);

    const closePopup = useCallback(() => {
        setPopupVisible(false);
        highlightIndex.value = -1;
        lastHapticIdx.current = -1;
    }, []);

    const updateHighlightFromPageY = useCallback(
        pageY => {
            const idx = SleepTimerPopup.getIndexFromPageY(pageY, anchorLayout);
            if (idx !== lastHapticIdx.current && idx >= 0)
                lastHapticIdx.current = idx;

            highlightIndex.value = idx;
            highlightIndexRef.current = idx;
        },
        [anchorLayout]
    );

    const handleRelease = useCallback(() => {
        const idx = highlightIndexRef.current;
        if (idx >= 0) {
            SleepTimerPopup.handleSelection(idx);
        }
        highlightIndex.value = -1;
        highlightIndexRef.current = -1;
        lastHapticIdx.current = -1;
        setPopupVisible(false);
    }, [highlightIndex]);

    const timerGesture = Gesture.Pan()
        .activateAfterLongPress(LONG_PRESS_DURATION)
        .onStart(() => {
            "worklet";
            runOnJS(openPopup)();
        })
        .onUpdate(event => {
            "worklet";
            runOnJS(updateHighlightFromPageY)(event.absoluteY);
        })
        .onEnd(() => {
            "worklet";
            runOnJS(handleRelease)();
        });

    return (
        <GestureDetector gesture={timerGesture}>
            <Animated.View
                ref={timerRef}
                style={styles.timerBtnContainer}
                onLayout={measureButton}
                collapsable={false}
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

                <SleepTimerPopup
                    visible={popupVisible}
                    anchorLayout={anchorLayout}
                    highlightIndex={highlightIndex}
                />
            </Animated.View>
        </GestureDetector>
    );
};

const Footer = () => {
    return (
        <View style={styles.container}>
            <RepeatButton />
            <TimerButton />
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
