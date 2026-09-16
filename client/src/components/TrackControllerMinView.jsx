import React, { useState, useEffect } from "react";
import {
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    View
} from "react-native";
import { Image } from "expo-image";
import { getColors } from "react-native-image-colors";

import handleSwipe from "@controllers/handleMinViewSwipes.js";
import { usePlayer } from "@store/player";
import Equalizer from "./Equalizer.jsx";

const { height: vh, width: vw } = Dimensions.get("window");

const IMG_SIZE = Math.max(40, vh * 0.06);
const IMG_RADIUS = IMG_SIZE / 2;

const TrackControllerMinView = ({ tabBarHeight }) => {
    const playPause = usePlayer(state => state.playPause);
    const [swipeStartPos, setSwipeStartPos] = useState({});
    const [colors, setColors] = useState(null);

    const track = usePlayer(state => state.currentTrack);
    const isStopped = usePlayer(state => state.isStopped);
    const isPlaying = usePlayer(state => state.isPlaying || state.isBuffering);

    useEffect(() => {
        const url = track?.cover || track?.artwork;
        if (track?.colors && Object.keys(track.colors).length > 0) {
            setColors(track.colors);
        } else if (url) {
            getColors(url, {
                fallback: "#ffffff",
                cache: true,
                key: url
            }).then(c => setColors(c));
        }
    }, [track?.cover, track?.artwork, track?.colors]);

    if (!track || !track.url || isStopped) return null;

    const eqColor = colors?.lightVibrant || colors?.dominant || "white";
    const bgColor = colors?.darkVibrant || colors?.dominant || colors?.average || "#51847c";

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
            style={[styles.container, { bottom: tabBarHeight - 15, backgroundColor: bgColor }]}
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
                        track?.cover || track?.artwork
                            ? { uri: track.cover || track.artwork }
                            : require("../assets/images/images.jpeg")
                    }
                    style={{
                        width: IMG_SIZE,
                        height: IMG_SIZE,
                        borderRadius: IMG_RADIUS
                    }}
                    placeholder={{ blurhash: "LKO2?U%2Tw=w]~RBVZRi};RPxuwH" }}
                    contentFit="cover"
                    transition={1000}
                />
                
                <View style={styles.anim}>
                    <Equalizer isPlaying={isPlaying} color={eqColor} size={35} />
                </View>
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

        backgroundColor: "#51847c",
        paddingHorizontal: 8
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
        fontFamily: "Sans",
        fontSize: vw * 0.0385,
        color: "#fff"
    }
});

export default TrackControllerMinView;
