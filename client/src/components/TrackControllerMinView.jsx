import React, { useEffect, useState, useRef } from "react";
import {
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Image,
    View
} from "react-native";
import LottieView from "lottie-react-native";

import handleSwipe from "@controllers/handleMinViewSwipes.js";
import { usePlayer } from "@store/player";

const { height: vh, width: vw } = Dimensions.get("window");

const playPause = usePlayer.getState().playPause;
const IMG_SIZE = Math.max(40, vh * 0.06);
const IMG_RADIUS = IMG_SIZE / 2;

const TrackControllerMinView = ({ tabBarHeight }) => {
    const [swipeStartPos, setSwipeStartPos] = useState({});
    const [isVisible, setIsVisible] = useState(true);

    const track = usePlayer(state => state.currentTrack);
    const isStopped = usePlayer(state => state.isStopped);
    const isPlaying = usePlayer(state => state.isPlaying || state.isBuffering);

    if (!track || !track.url || !isVisible || isStopped) return null;

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPressIn={e =>
                setSwipeStartPos({
                    x: e.nativeEvent.pageX,
                    y: e.nativeEvent.pageY
                })
            }
            onPressOut={e => handleSwipe(e, swipeStartPos)}
            style={[styles.container, { bottom: tabBarHeight }]}
        >
            <TouchableOpacity
                style={{
                    alignItems: "center",
                    justifyContent: "center"
                }}
                onPress={playPause}
                activeOpacity={0.85}
            >
                <Image
                    source={
                        track?.cover
                            ? { uri: track.cover }
                            : require("../assets/images/images.jpeg")
                    }
                    style={{
                        width: IMG_SIZE,
                        height: IMG_SIZE,
                        borderRadius: IMG_RADIUS
                    }}
                    resizeMode="cover"
                    transition={1000}
                />
                {isPlaying && (
                    <LottieView
                        source={require("../assets/animations/musicPlayingAnim2.json")}
                        autoPlay
                        loop
                        style={styles.anim}
                    />
                )}
            </TouchableOpacity>

            <Text numberOfLines={2} style={styles.title}>
                {track?.title}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "98%",
        height: vh * 0.083,
        minHeight: 60,
        marginLeft: "1%",
        alignItems: "center",
        flexDirection: "row",
        gap: vw * 0.03,
        borderRadius: vw,
        position: "absolute",
        zIndex: 99999999,
        marginBottom: 5,
        backgroundColor: "#51847c",
        paddingHorizontal: 8,
    },
    anim: {
        width: 35,
        height: 35,
        opacity: 0.8,
        position: "absolute"
    },
    title: {
        flex: 1,
        marginRight: vw * 0.04,
        fontWeight: "bold",
        fontFamily: 'Sans',
        fontSize: vw * 0.0385,
        color: "#fff",
    }
});

export default TrackControllerMinView;
