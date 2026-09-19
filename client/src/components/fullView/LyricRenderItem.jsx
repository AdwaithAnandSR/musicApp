import { useEffect } from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming
} from "react-native-reanimated";

import { useStatus } from "../../store/appState.store.js";
import { usePlayer } from "../../store/player.js";

const LyricRenderItem = ({ item, index, lightVibrant }) => {
    const showSyncedLyric = useStatus(state => state.showSyncedLyric);
    const currentLyricIndex = useStatus(state => state.currentLyricIndex);
    const seekTo = usePlayer(state => state.seekTo);

    const isActive = currentLyricIndex === index - 1 && showSyncedLyric;

    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.6);

    useEffect(() => {
        scale.value = withSpring(isActive ? 1.15 : 1, {
            damping: 15,
            stiffness: 200
        });
        opacity.value = withTiming(isActive ? 1 : 0.6, { duration: 200 });
    }, [isActive]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value
    }));

    const handleSeek = () => {
        if (typeof item?.start === "number") {
            seekTo(item.start);
        }
    };

    const activeColor = isActive ? (lightVibrant || "rgb(246,7,135)") : "white";

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={handleSeek}
            activeOpacity={0.7}
        >
            <Animated.Text
                style={[
                    styles.lyricText,
                    animatedStyle,
                    { color: activeColor }
                ]}
            >
                {item.line?.trim()}
            </Animated.Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        paddingVertical: 20,
        paddingHorizontal: "8%",
        justifyContent: "center"
    },
    lyricText: {
        textAlign: "center",
        fontWeight: "bold",
        fontSize: 24
    }
});

export default LyricRenderItem;
