import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { getColors } from "react-native-image-colors";
import { router } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import { useStatus } from "@store/appState.store.js";
import { usePlayer } from "@store/player";

import Controllers from "@components/fullView/ControllersContainer.jsx";
import SliderContainer from "@components/fullView/SliderContainer.jsx";
import Lyrics from "@components/fullView/LyricsView.jsx";
import NavBar from "@components/fullView/NavBar.jsx";
import Footer from "@components/fullView/Footer.jsx";
import OptionsContainer from "@components/fullView/OptionsContainer.jsx";
import PlaylistBottomSheet from "@components/fullView/PlaylistBottomSheet.jsx";

const { height: vh, width: vw } = Dimensions.get("window");
const blurhash =
    "|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[";

const TrackControllerFullView = () => {
    const [colors, setColors] = useState(null);
    const showLyrics = useStatus(
        state => state.showLyrics1 || state.showLyrics2
    );

    const track = usePlayer(state => state.currentTrack);
    const trackId = track?._id || track?.id;
    const coverUrl = track?.cover || track?.artwork;

    useEffect(() => {
        if (!trackId) {
            if (router.canGoBack()) {
                router.back();
            }
        } else if (track?.colors && Object.keys(track.colors).length > 0) {
            setColors(track.colors);
        } else if (coverUrl) {
            getColors(coverUrl, {
                fallback: "#fd47bd",
                cache: true,
                key: trackId
            }).then(setColors);
        }
    }, [trackId, coverUrl, track?.colors]);

    

    const translateY = useSharedValue(0);
    const playlistTranslateY = useSharedValue(vh * 0.7);
    const context = useSharedValue({ y: vh * 0.7, startY: 0 });

    const goBack = () => router.back();

    const panGesture = Gesture.Pan()
        .enabled(!showLyrics)
        .activeOffsetY([-20, 20])
        .failOffsetX([-20, 20])
        .onStart(() => {
            "worklet";
            context.value = { y: playlistTranslateY.value, startY: translateY.value };
        })
        .onUpdate(event => {
            "worklet";
            if (context.value.y < vh * 0.7 || (event.translationY < 0 && context.value.startY === 0)) {
                let newY = context.value.y + event.translationY;
                newY = Math.max(0, Math.min(newY, vh * 0.7));
                playlistTranslateY.value = newY;
            } else {
                let newY = context.value.startY + event.translationY;
                translateY.value = newY > 0 ? newY : 0;
            }
        })
        .onEnd(event => {
            "worklet";
            if (context.value.y < vh * 0.7 || event.translationY < 0) {
                if (event.velocityY > 500 || event.translationY > vh * 0.15) {
                    playlistTranslateY.value = withTiming(vh * 0.7, { duration: 250 });
                } else if (event.velocityY < -500 || event.translationY < -vh * 0.15) {
                    playlistTranslateY.value = withSpring(0, { damping: 20, stiffness: 150 });
                } else {
                    if (playlistTranslateY.value > vh * 0.35) {
                        playlistTranslateY.value = withTiming(vh * 0.7, { duration: 250 });
                    } else {
                        playlistTranslateY.value = withSpring(0, { damping: 20, stiffness: 150 });
                    }
                }
            } else {
                if (
                    event.translationY > vh * 0.15 ||
                    (event.velocityY > 500 && event.translationY > 30)
                ) {
                    translateY.value = withTiming(
                        vh,
                        { duration: 200 },
                        finished => {
                            "worklet";
                            if (finished) {
                                runOnJS(goBack)();
                            }
                        }
                    );
                } else {
                    translateY.value = withSpring(0, {
                        damping: 15,
                        stiffness: 200
                    });
                }
            }
        });

    const animatedStyle = useAnimatedStyle(() => {
        "worklet";
        return {
            transform: [{ translateY: translateY.value }]
        };
    });

    if (!trackId) return null;

    const topColor =
        colors?.darkVibrant || colors?.dominant || colors?.average || "#111111";

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View
                style={[
                    styles.container,
                    { backgroundColor: "black" },
                    animatedStyle
                ]}
            >
                <LinearGradient
                    colors={[topColor, "#000000"]}
                    style={[styles.container]}
                >
                    {/* navbar */}
                    <NavBar />

                    {/* title */}
                    <View
                        style={{
                            minHeight: vh * 0.08,
                            justifyContent: "center"
                        }}
                    >
                        <Text numberOfLines={2} style={styles.title}>
                            {track?.title}
                        </Text>
                    </View>

                    <OptionsContainer lightVibrant={colors?.lightVibrant} />

                    <View
                        style={[
                            styles.imageContainer,
                            { shadowColor: colors?.lightVibrant || "#32ffd4" }
                        ]}
                    >
                        <Image
                            source={
                                coverUrl
                                    ? { uri: coverUrl }
                                    : require("@assets/images/images.jpeg")
                            }
                            placeholder={{ blurhash }}
                            contentFit="cover"
                            transition={1000}
                            filter="contrast(1.25) brightness(0.8)"
                            style={{ width: "100%", height: "100%" }}
                        />
                        {showLyrics && <Lyrics track={track} lightVibrant={track.colors.lightMuted} />}
                    </View>

                    {/* slider */}

                    <SliderContainer
                        defaultDuration={track?.duration}
                        lightVibrant={colors?.lightMuted}
                    />

                    {/* controllers */}
                    <Controllers />

                    {/* footer */}
                    <Footer />
                </LinearGradient>
            </Animated.View>
        </GestureDetector>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 26
    },
    title: {
        color: "white",
        fontSize: vw * 0.045,
        fontWeight: "bold",
        alignSelf: "center",
        width: "80%",
        textAlign: "center",
        marginTop: vh * 0.03
    },
    imageContainer: {
        width: vw * 0.85,
        height: vw * 0.85,
        borderRadius: vw * 0.1,
        overflow: "hidden",
        alignSelf: "center",
        marginVertical: vh * 0.03,
        shadowOpacity: 1,
        elevation: 80
    }
});

export default TrackControllerFullView;
