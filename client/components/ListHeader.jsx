import { memo } from "react";
import { TouchableOpacity, Text, StyleSheet, Animated } from "react-native";

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
            <TouchableOpacity activeOpacity={0.3} style={styles.textCont}>
                <Animated.Text style={[styles.headerText]}>
                    {title}
                </Animated.Text>
                {total > -1 && (
                    <Text style={styles.headerText2}>{total || 0}</Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    header: {
        overflow: "hidden",
        paddingBottom: 5,
        paddingHorizontal: 13,
        justifyContent: "flex-end",
        position: "absolute",
        alignSelf: "flex-start",
        top: 0,
        height: HEADER_HEIGHT,
        zIndex: 1
    },
    textCont: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        gap: 20
    },
    headerText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 50,
        letterSpacing: -2,
        textShadowColor: "rgba(0,0,0,1)",
        textShadowOffset: { width: 3, height: 3 },
        textShadowRadius: 5
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

export default memo(Header, (prev, next) => prev.title !== next.title);
