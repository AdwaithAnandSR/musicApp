/* global setTimeout */
import React from "react";
import { Text, StyleSheet, Animated } from "react-native";

let showToast;

const ToastManager = () => {
    const [message, setMessage] = React.useState("");
    const [type, setType] = React.useState("");
    const [visible, setVisible] = React.useState(false);
    const opacity = React.useRef(new Animated.Value(0)).current;

    showToast = (text, type) => {
        setType(type);
        setMessage(text);
        setVisible(true);
        Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true
        }).start(() => {
            setTimeout(() => {
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true
                }).start(() => setVisible(false));
            }, 2000);
        });
    };

    if (!visible) return null;

    return (
        <Animated.View style={[styles.container, { opacity }]}>
            <Text
                style={[
                    styles.text,
                    {
                        color:
                            type === "success"
                                ? "#0bf86e"
                                : type === "error"
                                ? "#f80b4f"
                                : type === "pending"
                                ? "#f49d06"
                                : "white"
                    }
                ]}
                numberOfLines={1}
            >
                {message}
            </Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: "center",
        alignItems: "center",
        position: "absolute",
        alignSelf: "center",
        bottom: "8%",
        backgroundColor: "#171717",
        minWidth: "50%",
        maxWidth: "85%",
        minHeight: "6%",
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 10
    },
    text: {
        fontWeight: "bold",
        color: "white"
    }
});

ToastManager.show = (text, type) => {
    if (showToast) {
        showToast(text, type);
    }
};

export default ToastManager;
