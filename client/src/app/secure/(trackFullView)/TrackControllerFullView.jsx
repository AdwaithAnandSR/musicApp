import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
    withSequence,
    withDelay
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { getColors } from "react-native-image-colors";
import { router } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Entypo from "@react-native-vector-icons/entypo/static";

import { useStatus } from "@store/appState.store.js";
import { usePlayer } from "@store/player";

import Controllers from "@components/fullView/ControllersContainer.jsx";
import SliderContainer from "@components/fullView/SliderContainer.jsx";
import Lyrics from "@components/fullView/LyricsView.jsx";
import NavBar from "@components/fullView/NavBar.jsx";
import Footer from "@components/fullView/Footer.jsx";
import OptionsContainer from "@components/fullView/OptionsContainer.jsx";
import PlaylistBottomSheet from "@components/fullView/PlaylistBottomSheet.jsx";
import { isDarkColor, makeLightColor } from "@services/colors";
import handleToggleFavourite from "../../../controllers/playlists/handleToggleFavourite.js";
import * as Haptics from "expo-haptics";

const { height: vh, width: vw } = Dimensions.get("window");

const PLAYLIST_CLOSED_Y = vh * 0.7;
const SWIPE_THRESHOLD = vh * 0.15;
const PLAYLIST_MID = vh * 0.35;

const blurhash =
    "|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[";
const blurhashPlaceholder = { blurhash };

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
    const playlistTranslateY = useSharedValue(PLAYLIST_CLOSED_Y);
    const context = useSharedValue({ y: PLAYLIST_CLOSED_Y, startY: 0 });

    const goBack = () => router.back();

    const panGesture = Gesture.Pan()
        .enabled(!showLyrics)
        .activeOffsetY([-20, 20])
        .failOffsetX([-20, 20])
        .onStart(() => {
            "worklet";
            context.value = {
                y: playlistTranslateY.value,
                startY: translateY.value,
                target: null
            };
        })
        .onUpdate(event => {
            "worklet";
            let target = context.value.target;
            if (!target) {
                if (context.value.y < PLAYLIST_CLOSED_Y) {
                    target = "playlist";
                } else if (context.value.startY > 0) {
                    target = "fullView";
                } else if (event.translationY < 0) {
                    target = "playlist";
                } else if (event.translationY > 0) {
                    target = "fullView";
                }

                if (target) {
                    context.value = { ...context.value, target };
                }
            }

            if (target === "playlist") {
                let newY = context.value.y + event.translationY;
                newY = Math.max(0, Math.min(newY, PLAYLIST_CLOSED_Y));
                playlistTranslateY.value = newY;
            } else if (target === "fullView") {
                let newY = context.value.startY + event.translationY;
                translateY.value = newY > 0 ? newY : 0;
            }
        })
        .onEnd(event => {
            "worklet";
            const target = context.value.target;
            if (target === "playlist") {
                if (
                    event.velocityY > 500 ||
                    event.translationY > SWIPE_THRESHOLD
                ) {
                    playlistTranslateY.value = withTiming(PLAYLIST_CLOSED_Y, {
                        duration: 250
                    });
                } else if (
                    event.velocityY < -500 ||
                    event.translationY < -SWIPE_THRESHOLD
                ) {
                    playlistTranslateY.value = withSpring(0, {
                        damping: 20,
                        stiffness: 150,
                        overshootClamping: true
                    });
                } else {
                    if (playlistTranslateY.value > PLAYLIST_MID) {
                        playlistTranslateY.value = withTiming(
                            PLAYLIST_CLOSED_Y,
                            {
                                duration: 250
                            }
                        );
                    } else {
                        playlistTranslateY.value = withSpring(0, {
                            damping: 20,
                            stiffness: 150,
                            overshootClamping: true
                        });
                    }
                }
            } else {
                if (
                    (event.translationY > SWIPE_THRESHOLD &&
                        event.velocityY >= 0) ||
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
                        stiffness: 200,
                        overshootClamping: true
                    });
                }
            }
        });

    const heartScale = useSharedValue(0);
    const heartOpacity = useSharedValue(0);

    const triggerHeartAnimation = () => {
        "worklet";
        heartScale.value = 0; // reset
        heartScale.value = withSequence(
            withSpring(1.5, { damping: 12, stiffness: 150 }),
            withSpring(1, { damping: 12, stiffness: 100 })
        );
        heartOpacity.value = 0; // reset
        heartOpacity.value = withSequence(
            withTiming(1, { duration: 250 }),
            withDelay(700, withTiming(0, { duration: 400 }))
        );
    };

    const heartAnimatedStyle = useAnimatedStyle(() => {
        "worklet";
        return {
            transform: [{ scale: heartScale.value }],
            opacity: heartOpacity.value,
            position: "absolute",
            zIndex: 10
        };
    });

    const toggleFavourite = async () => {
        if (!track) return;
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}

        const isFav = track?.isFav || false;
        usePlayer.setState(state => ({
            currentTrack: { ...state.currentTrack, isFav: true }
        }));

        const newFavState = await handleToggleFavourite(track._id || track.id);

        if (newFavState === null) {
            usePlayer.setState(state => ({
                currentTrack: { ...state.currentTrack, isFav: isFav }
            }));
        } else if (newFavState !== true) {
            usePlayer.setState(state => ({
                currentTrack: { ...state.currentTrack, isFav: newFavState }
            }));
        }
    };

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            "worklet";
            triggerHeartAnimation();

            // Only like, don't unlike on double tap (like Instagram)
            if (!track?.isFav) {
                runOnJS(toggleFavourite)();
            } else {
                // Just trigger haptics and animation if already liked
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
            }
        });

    const composedGesture = Gesture.Simultaneous(panGesture, doubleTapGesture);

    const animatedStyle = useAnimatedStyle(() => {
        "worklet";
        return {
            transform: [{ translateY: translateY.value }]
        };
    });

    if (!trackId) return null;

    const topColor =
        colors?.darkVibrant || colors?.dominant || colors?.average || "#111111";

    const lightColor = isDarkColor(colors?.lightVibrant)
        ? makeLightColor(colors?.lightVibrant)
        : colors?.lightVibrant;

    return (
        <GestureDetector gesture={composedGesture}>
            <Animated.View
                style={[styles.container, styles.bgBlack, animatedStyle]}
            >
                <LinearGradient
                    colors={[topColor, "#000000"]}
                    style={[styles.container]}
                >
                    {/* navbar */}
                    <NavBar />

                    {/* title */}
                    <View style={styles.titleWrapper}>
                        <Text numberOfLines={2} style={styles.title}>
                            {track?.title}
                        </Text>
                    </View>

                    <OptionsContainer lightVibrant={lightColor} />

                    <View
                        style={[
                            styles.imageContainer,
                            {
                                boxShadow: `0px 30px 100px ${colors?.lightMuted}b0`
                            }
                        ]}
                    >
                        <Image
                            source={
                                coverUrl
                                    ? { uri: coverUrl }
                                    : require("@assets/images/images.jpeg")
                            }
                            placeholder={blurhashPlaceholder}
                            contentFit="cover"
                            transition={1000}
                            filter="contrast(1.25) brightness(0.8)"
                            style={styles.imageFill}
                        />
                        {showLyrics && (
                            <Lyrics track={track} lightVibrant={lightColor} />
                        )}
                        <Animated.View
                            style={[
                                heartAnimatedStyle,
                                {
                                    alignItems: "center",
                                    width: "100%"
                                }
                            ]}
                            
                        >
                            <Entypo name="heart" size={150} color={colors?.dominant ?? "#ef448c"} />
                        </Animated.View>
                    </View>

                    {/* slider */}

                    <SliderContainer
                        defaultDuration={track?.duration}
                        lightVibrant={lightColor}
                    />

                    {/* controllers */}
                    <Controllers />

                    {/* footer */}
                    <Footer />
                </LinearGradient>
                <PlaylistBottomSheet playlistTranslateY={playlistTranslateY} />
            </Animated.View>
        </GestureDetector>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 26
    },
    bgBlack: {
        backgroundColor: "black"
    },
    titleWrapper: {
        minHeight: vh * 0.08,
        justifyContent: "center"
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
        justifyContent: "center"
    },
    imageFill: {
        width: "100%",
        height: "100%"
    }
});

export default TrackControllerFullView;
