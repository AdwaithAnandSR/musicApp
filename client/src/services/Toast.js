/* global setTimeout */
import React, { useState, useEffect } from "react";
import { Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming
} from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";

let showToast;

const ToastManager = () => {
    const [message, setMessage] = useState("");
    const [type, setType] = useState("");
    const [visible, setVisible] = useState(true);

    const translateY = useSharedValue(-120);

    showToast = (text, toastType = "") => {
        setMessage(text);
        setType(toastType);
        setVisible(true);
    };

    useEffect(() => {
        if (!visible) return;

        translateY.value = withTiming(0, { duration: 350 });

        const timer = setTimeout(() => {
            translateY.value = withTiming(-120, { duration: 250 });

            setTimeout(() => {
                setVisible(false);
            }, 250);
        }, 2200);

        return () => clearTimeout(timer);
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }]
    }));

    if (!visible) return null;

    const textColor =
        type === "success" || type === "green"
            ? "#22c55e"
            : type === "error" || type === "red"
              ? "#ef4444"
              : type === "pending" || type === "yellow"
                ? "#eab308"
                : "#ffffff";

    let displayMessage = message;
    let colorOverride = null;

    if (typeof message === "string" && message.includes("=>")) {
        const parts = message.split("=>");
        colorOverride = parts[0];
        displayMessage = parts[1] || parts[0];
    }

    const finalColor = colorOverride
        ? colorOverride === "green"
            ? "#22c55e"
            : colorOverride === "red"
              ? "#ef4444"
              : colorOverride === "yellow"
                ? "#eab308"
                : "#ffffff"
        : textColor;

    let left = displayMessage;
    let right = "";

    if (typeof displayMessage === "string" && displayMessage.includes(" ")) {
        const words = displayMessage.split(" ");
        if (words.length > 1) {
            left = words[0];
            right = words[1];
            if (words.length > 2) {
                left = words.right = words
                    .slice(Math.ceil(words.length / 2))
                    .join(" ");
            }
        }
    }

    return (
        <>
            <StatusBar hidden={visible} animated />
            <Animated.View style={[styles.container, animatedStyle]}>
                <Text
                    numberOfLines={1}
                    style={[
                        styles.text,
                        {
                            color: finalColor,
                            textAlign: right ? "left" : "center"
                        }
                    ]}
                >
                    {left?.split("+").join(" ")}
                </Text>
                {!!right && (
                    <Text
                        numberOfLines={1}
                        style={[
                            styles.text,
                            { color: finalColor, textAlign: "right" }
                        ]}
                    >
                        {right}
                    </Text>
                )}
            </Animated.View>
        </>
    );
};

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        width: width,
        zIndex: 99999,
        backgroundColor: "#050505",
        paddingTop: 35,
        paddingBottom: 10,
        paddingHorizontal: 25,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 10
    },
    text: {
        fontSize: 18,
        fontWeight: "bold",
        flex: 1
    }
});

ToastManager.show = (text, type) => {
    if (showToast) {
        showToast(text, type);
    }
};

export default ToastManager;
