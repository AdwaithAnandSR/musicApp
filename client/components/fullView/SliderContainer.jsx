import { useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Slider from "@react-native-community/slider";

import { useTrack } from "../../context/track.context.js";
import { useAudioMonitor } from "../../store/track.store.js";

const { height: vh, width: vw } = Dimensions.get("window");

const SliderContainer = ({ lightVibrant, defaultDuration }) => {
    const [isSeeking, setIsSeeking] = useState();
    const { seek } = useTrack();
    const duration = useAudioMonitor(state => state.duration);
    const currentTime = useAudioMonitor(state => state.currentTime);

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

    return (
        <View style={styles.sliderContainer}>
            <Text style={styles.timeText}>
                {formatTime( currentTime)}
            </Text>
            <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                value={!isSeeking && currentTime / duration}
                onSlidingStart={() => setIsSeeking(true)}
                onSlidingComplete={value => {
                    seek(value * duration);
                    setIsSeeking(false);
                }}
                minimumTrackTintColor="#FFFFFF"
                maximumTrackTintColor="#a6a5a5"
                thumbTintColor={lightVibrant}
            />
            <Text style={styles.timeText}>{formatTime(duration ? duration: defaultDuration ? defaultDuration: -1 )}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    sliderContainer: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginVertical: vh * 0.05
    },
    slider: {
        width: vw * 0.7,
        height: 40
    },
    timeText: {
        color: "white"
    }
});

export default SliderContainer;
