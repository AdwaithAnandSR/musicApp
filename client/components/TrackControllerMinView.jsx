import React, { useRef, useEffect, useState } from "react";
import {
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Animated
} from "react-native";
import { Image } from "expo-image";
import LottieView from "lottie-react-native";
import { useAudioPlayerStatus } from "expo-audio";

import handleSwipe from "../controllers/handleMinViewSwipes.js";
import { useTrack } from "../context/track.context.js";

const { height: vh, width: vw } = Dimensions.get("window");
const blurhash =
    "|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[";

const TrackControllerMinView = () => {
    const { togglePlay, track, skipToNext, skipToPrevious, player, setTrack } =
        useTrack();
    const { playing, isBuffering } = useAudioPlayerStatus(player);
    const [swipeStartPos, setSwipeStartPos] = useState({});

    const arr = [0, 0.2, 0.4, 0.6, 0.8, 1];
    const randomElem = arr[Math.floor(Math.random() * arr.length)];
    const colorAnimation = useRef(new Animated.Value(randomElem)).current;

    const backgroundColor = colorAnimation.interpolate({
        inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
        outputRange: [
            "#23adc9",
            "#59fcd1",
            "#c75ef4",
            "#f52041",
            "#cafd63",
            "#f72c93",
            "#cafd63",
            "#f52041",
            "#c75ef4",
            "#59fcd1",
            "#23adc9"
        ]
    });

    useEffect(() => {
        const loopAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(colorAnimation, {
                    toValue: 1,
                    duration: 200000,
                    useNativeDriver: false
                }),
                Animated.timing(colorAnimation, {
                    toValue: 0,
                    duration: 200000,
                    useNativeDriver: false
                })
            ])
        );
        loopAnimation.start();

        // Cleanup to stop animation on component unmount
        return () => loopAnimation.stop();
    }, [colorAnimation]);

    if (!track || !track.url) return;

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPressIn={e =>
                setSwipeStartPos({
                    x: e.nativeEvent.pageX,
                    y: e.nativeEvent.pageY
                })
            }
            onPressOut={e =>
                handleSwipe(
                    e,
                    swipeStartPos,
                    skipToNext,
                    skipToPrevious,
                    setTrack
                )
            }
            style={styles.container}
        >
            <Animated.View style={[styles.gradient, { backgroundColor }]} />
            <TouchableOpacity onPress={togglePlay} style={styles.imgContainer}>
                <Image
                    source={
                        track?.cover || require("../assets/images/images.jpeg")
                    }
                    style={{ width: "100%", height: "100%" }}
                    placeholder={{ blurhash }}
                    contentFit="cover"
                    transition={1000}
                />

                {(playing || isBuffering) && (
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
        height: vh * 0.098,
        marginLeft: "1%",
        alignItems: "center",
        flexDirection: "row",
        gap: vw * 0.03,
        overflow: "hidden",
        borderRadius: vw,
        position: "absolute",
        zIndex: 99999999,
        bottom: 58
    },
    gradient: {
        width: "100%",
        height: "100%",
        position: "absolute"
    },
    anim: {
        width: 35,
        height: 35,
        opacity: 0.8,
        marginLeft: -10,
        position: "absolute",
        alignSelf: "center",
        color: "#cc4cf9"
    },
    imgContainer: {
        width: vh * 0.06,
        height: vh * 0.06,
        borderRadius: vh * 0.5,
        overflow: "hidden",
        marginLeft: vw * 0.03,
        justifyContent: "center"
    },
    title: {
        width: "75%",
        fontWeight: "bold",
        fontSize: vw * 0.04
    }
});

export default TrackControllerMinView;
