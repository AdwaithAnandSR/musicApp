import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { usePlayer } from "@store/player";

const { height: vh, width: vw } = Dimensions.get("window");

const SLIDER_WIDTH = vw * 0.65;

const SliderContainer = ({ lightVibrant, defaultDuration }) => {
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekTime, setSeekTime] = useState(0);
    const duration = usePlayer(state => state.duration);
    const currentTime = usePlayer(state => state.position);
    const progress = usePlayer(state => state.progress);
    const seekTo = usePlayer(state => state.seekTo);

    const thumbScale = useSharedValue(1);
    const panX = useSharedValue(0);

    useEffect(() => {
        if (!isSeeking) {
            panX.value = (progress || 0) * SLIDER_WIDTH;
        }
    }, [progress, isSeeking]);

    const handleSlidingComplete = (ratio) => {
        if (duration) {
            seekTo(ratio * duration);
        }
        setIsSeeking(false);
    };

    const updateSeekTime = (x) => {
        if (duration) {
            setSeekTime((x / SLIDER_WIDTH) * duration);
        }
    };

    const panGesture = Gesture.Pan()
        .onBegin((e) => {
            runOnJS(setIsSeeking)(true);
            runOnJS(updateSeekTime)(Math.max(0, Math.min(SLIDER_WIDTH, e.x)));
            thumbScale.value = withSpring(1.5, { damping: 15, stiffness: 300 });
            panX.value = Math.max(0, Math.min(SLIDER_WIDTH, e.x));
        })
        .onUpdate((e) => {
            panX.value = Math.max(0, Math.min(SLIDER_WIDTH, e.x));
            runOnJS(updateSeekTime)(panX.value);
        })
        .onEnd(() => {
            thumbScale.value = withSpring(1, { damping: 15, stiffness: 300 });
            runOnJS(handleSlidingComplete)(panX.value / SLIDER_WIDTH);
        });

    const formatTime = ms => {
        if (!ms || ms < 0) return "00:00";
        const minutes = Math.floor(ms / 60);
        const seconds = Math.floor(ms - minutes * 60);
        return (
            (minutes < 10 ? `0${minutes}` : minutes) +
            ":" +
            (seconds < 10 ? `0${seconds}` : seconds)
        );
    };

    const trackStyle = useAnimatedStyle(() => ({
        width: panX.value,
        backgroundColor: lightVibrant || "#FFFFFF",
        height: 4,
        borderRadius: 2
    }));

    const thumbStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: panX.value - 7.5 }, { scale: thumbScale.value }],
        backgroundColor: lightVibrant || "#FFFFFF"
    }));

    return (
        <View style={styles.sliderContainer}>
            <Text style={styles.timeText}>{formatTime(isSeeking ? seekTime : currentTime)}</Text>
            
            <GestureDetector gesture={panGesture}>
                <View style={styles.sliderHitSlop}>
                    <View style={styles.sliderBackgroundTrack} />
                    <Animated.View style={[styles.sliderFilledTrack, trackStyle]} />
                    <Animated.View style={[styles.thumb, thumbStyle]} />
                </View>
            </GestureDetector>

            <Text style={styles.timeText}>
                {formatTime(
                    duration ? duration : defaultDuration ? defaultDuration : -1
                )}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    sliderContainer: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginVertical: vh * 0.04
    },
    sliderHitSlop: {
        width: SLIDER_WIDTH,
        height: 40,
        justifyContent: "center",
        marginHorizontal: 15
    },
    sliderBackgroundTrack: {
        width: "100%",
        height: 4,
        backgroundColor: "#a6a5a5",
        borderRadius: 2,
        position: "absolute"
    },
    sliderFilledTrack: {
        position: "absolute"
    },
    thumb: {
        width: 15,
        height: 15,
        borderRadius: 7.5,
        position: "absolute",
        left: 0
    },
    timeText: {
        color: "white",
        width: 45,
        textAlign: "center",
        fontSize: 12
    }
});

export default SliderContainer;
