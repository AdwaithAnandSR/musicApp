import React, { useEffect, useRef } from "react";
import {
    View,
    StyleSheet,
    Text,
    Dimensions,
    TouchableOpacity,
    Pressable
} from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { usePlayer } from "@store/player.js";
import Toast from "@services/Toast.js";

const { width: vw } = Dimensions.get("window");

const TIMER_OPTIONS = [
    { label: "1 min", ms: 1 * 60 * 1000 },
    { label: "5 min", ms: 5 * 60 * 1000 },
    { label: "10 min", ms: 10 * 60 * 1000 },
    { label: "30 min", ms: 30 * 60 * 1000 },
    { label: "1 hour", ms: 60 * 60 * 1000 },
    { label: "2 hours", ms: 2 * 60 * 60 * 1000 },
    { label: "5 hours", ms: 5 * 60 * 60 * 1000 },
    { label: "Off", ms: 0 }
];

const OPTION_HEIGHT = 40;
const POPUP_PADDING = 10;
const HEADER_HEIGHT = 28;
const POPUP_HEIGHT =
    TIMER_OPTIONS.length * OPTION_HEIGHT + POPUP_PADDING * 2 + HEADER_HEIGHT;
const POPUP_WIDTH = vw * 0.45;

const triggerHeavyHaptic = () => {
    try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
};

/**
 * iOS-style context menu popup for sleep timer.
 *
 * Props:
 * - visible: boolean
 * - anchorLayout: { pageX, pageY, width, height } of the trigger button
 * - highlightIndex: Reanimated SharedValue<number> controlled by parent gesture
 */
const SleepTimerPopup = ({
    visible,
    anchorLayout,
    highlightIndex,
    onClose
}) => {
    const popupScale = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            popupScale.value = withSpring(1, {
                damping: 50,
                stiffness: 500,
                overshootClamping: false
            });
        } else {
            popupScale.value = withTiming(0, { duration: 100 });
        }
    }, [visible]);

    const popupAnimatedStyle = useAnimatedStyle(() => {
        "worklet";
        return {
            transform: [{ scale: popupScale.value }]
        };
    });

    if (!visible || !anchorLayout) return null;

    const popupLeft =
        anchorLayout.pageX + anchorLayout.width / 2 - POPUP_WIDTH / 2;
    const clampedLeft = Math.max(8, Math.min(popupLeft, vw - POPUP_WIDTH - 8));

    const handleOptionPress = idx => {
        SleepTimerPopup.handleSelection(idx);
        if (onClose) onClose();
    };

    return (
        <>
            <Pressable
                style={{
                    position: "absolute",
                    top: -Dimensions.get("window").height,
                    left: -Dimensions.get("window").width,
                    width: Dimensions.get("window").width * 3,
                    height: Dimensions.get("window").height * 3,
                    zIndex: 99998
                }}
                onPress={() => {
                    if (onClose) onClose();
                }}
            />
            <Animated.View
                style={[
                    styles.popup,
                    { width: POPUP_WIDTH, left: clampedLeft },
                    popupAnimatedStyle
                ]}
            >
                <View style={styles.header}>
                    <Text style={styles.headerText}>Sleep Timer</Text>
                </View>
                {TIMER_OPTIONS.map((opt, idx) => (
                    <OptionRow
                        key={opt.label}
                        label={opt.label}
                        index={idx}
                        highlightIndex={highlightIndex}
                        isOff={opt.ms === 0}
                        onPress={() => handleOptionPress(idx)}
                    />
                ))}
            </Animated.View>
        </>
    );
};

const OptionRow = React.memo(
    ({ label, index, highlightIndex, isOff, onPress }) => {
        const animStyle = useAnimatedStyle(() => {
            "worklet";
            const isHighlighted = highlightIndex.value === index;
            return {
                backgroundColor: isHighlighted
                    ? isOff
                        ? "rgba(239, 68, 68, 0.3)"
                        : "rgba(34, 197, 94, 0.25)"
                    : "transparent",
                transform: [
                    {
                        scale: withTiming(isHighlighted ? 1.06 : 1, {
                            duration: 100
                        })
                    }
                ]
            };
        });

        const textStyle = useAnimatedStyle(() => {
            "worklet";
            const isHighlighted = highlightIndex.value === index;
            return {
                color: isHighlighted
                    ? isOff
                        ? "#ef4444"
                        : "#22c55e"
                    : "#e2e8f0"
            };
        });

        return (
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.7}
                style={{ width: "100%" }}
            >
                <Animated.View style={[styles.optionRow, animStyle]}>
                    <Animated.Text
                        style={[
                            styles.optionText,
                            isOff && styles.optionTextOff,
                            textStyle
                        ]}
                    >
                        {label}
                    </Animated.Text>
                </Animated.View>
            </TouchableOpacity>
        );
    }
);

// --- Static helpers for the parent gesture handler ---

SleepTimerPopup.TIMER_OPTIONS = TIMER_OPTIONS;
SleepTimerPopup.POPUP_HEIGHT = POPUP_HEIGHT;
SleepTimerPopup.OPTION_HEIGHT = OPTION_HEIGHT;
SleepTimerPopup.POPUP_PADDING = POPUP_PADDING;
SleepTimerPopup.HEADER_HEIGHT = HEADER_HEIGHT;

/**
 * Given an absolute pageY from gesture and the anchor layout,
 * compute which option index the finger is over (-1 if none).
 */
SleepTimerPopup.getIndexFromPageY = (pageY, anchorLayout) => {
    if (!anchorLayout) return -1;
    // bottom of popup is pageY - 10 (since bottom is 42, button height is 32)
    // top of popup is pageY - 10 - POPUP_HEIGHT
    const popupTop = anchorLayout.pageY - 10 - POPUP_HEIGHT;
    const relativeY = pageY - popupTop - POPUP_PADDING - HEADER_HEIGHT;
    const idx = Math.floor(relativeY / OPTION_HEIGHT);
    return idx >= 0 && idx < TIMER_OPTIONS.length ? idx : -1;
};

/**
 * Execute the selected timer option.
 */
SleepTimerPopup.handleSelection = index => {
    if (index < 0 || index >= TIMER_OPTIONS.length) return;
    const opt = TIMER_OPTIONS[index];

    if (opt.ms === 0) {
        usePlayer.getState().setTimer(null);
        Toast.show("Timer Cancelled", "success");
    } else {
        const now = new Date();
        const target = new Date(now.getTime() + opt.ms);
        usePlayer.getState().setTimer(target.getTime());
        // alert(opt.label)
        Toast.show(`Sleep ${opt.label.split(" ").join("-")}`, "success");
    }

    triggerHeavyHaptic();
};

export default SleepTimerPopup;

const styles = StyleSheet.create({
    popup: {
        position: "absolute",
        bottom: 42,
        zIndex: 99999,
        backgroundColor: "#000000ad",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#2e2e3a",
        padding: POPUP_PADDING,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.7,
        shadowRadius: 24,
        elevation: 30,
        transformOrigin: "bottom center"
    },

    headerText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: 1.2
    },
    optionRow: {
        height: OPTION_HEIGHT,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 10
    },
    optionText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#e2e8f0"
    },
    optionTextOff: {
        fontSize: 14
    }
});
