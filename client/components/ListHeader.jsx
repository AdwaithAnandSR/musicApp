import { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";

const HEADER_HEIGHT = 250,
    MIN_HEADER_HEIGHT = HEADER_HEIGHT - 80;

const Header = ({ title, containerStyles, total, scrollY }) => {

    const translateY = scrollY?.interpolate({
        inputRange: [0, MIN_HEADER_HEIGHT],
        outputRange: [0, -MIN_HEADER_HEIGHT],
        extrapolate: "clamp"
    });
    
    return (
        <Animated.View
            style={[
                styles.header,
                containerStyles,
                {
                    transform: [{ translateY }]
                }
            ]}
        >
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between"
                }}
            >
                <Animated.Text style={[styles.headerText]}>
                    {title}
                </Animated.Text>
                {total > -1 && (
                    <Text style={styles.headerText2}>{total || 0}</Text>
                )}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    header: {
        width: "100%",
        overflow: "hidden",
        paddingBottom: 5,
        paddingHorizontal: 13,
        justifyContent: "flex-end",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: HEADER_HEIGHT,
        zIndex: 1
    },
    headerText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 50,
        letterSpacing: -2
    },
    headerText2: {
        color: "white",
        fontWeight: "bold",
        fontSize: 20,
        opacity: 0.7,
        letterSpacing: -2,
        alignSelf: "center"
    }
});

export default Header;
