import { useState, useEffect } from "react";
import { StyleSheet, Dimensions } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withSequence,
    withDelay,
    runOnJS
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { getColors } from "react-native-image-colors";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { useStatus } from "@store/appState.store.js";
import { usePlayer } from "@store/player";

import VideoBackground from "@components/fullView/VideoBackground.jsx";
import CoverArtwork from "@components/fullView/CoverArtwork.jsx";
import TrackTitle from "@components/fullView/TrackTitle.jsx";
import Controllers from "@components/fullView/ControllersContainer.jsx";
import SliderContainer from "@components/fullView/SliderContainer.jsx";
import NavBar from "@components/fullView/NavBar.jsx";
import Footer from "@components/fullView/Footer.jsx";
import OptionsContainer from "@components/fullView/OptionsContainer.jsx";
import PlaylistBottomSheet from "@components/fullView/PlaylistBottomSheet.jsx";
import { isDarkColor, makeLightColor } from "@services/colors";
import handleToggleFavourite from "../../../controllers/playlists/handleToggleFavourite.js";

const { height: vh, width: vw } = Dimensions.get("window");

const PLAYLIST_CLOSED_Y = vh * 0.7;
const SWIPE_THRESHOLD = vh * 0.15;
const PLAYLIST_MID = vh * 0.35;

const TrackControllerFullView = () => {
    const [colors, setColors] = useState(null);
    const [showVideo, setShowVideo] = useState(false);

    const showLyrics = useStatus(
        state => state.showLyrics1 || state.showLyrics2
    );

    // Subscribe only to identity-level track data (not position/isPlaying/isBuffering)
    const track = usePlayer(state => state.currentTrack);
    const trackId = track?._id || track?.id;
    const coverUrl = track?.cover || track?.artwork;
    const videoUrl = track?.videoUrl;

    // Color extraction — only runs when track changes
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

    // ── Gesture shared values ──
    const translateY = useSharedValue(0);
    const playlistTranslateY = useSharedValue(PLAYLIST_CLOSED_Y);
    const context = useSharedValue({ y: PLAYLIST_CLOSED_Y, startY: 0 });

    // ── Heart animation shared values ──
    const heartScale = useSharedValue(0);
    const heartOpacity = useSharedValue(0);

    const goBack = () => router.back();

    const triggerHeartAnimation = () => {
        "worklet";
        heartScale.value = 0;
        heartScale.value = withSequence(
            withSpring(1.5, { damping: 12, stiffness: 150 }),
            withSpring(1, { damping: 12, stiffness: 100 })
        );
        heartOpacity.value = 0;
        heartOpacity.value = withSequence(
            withTiming(1, { duration: 250 }),
            withDelay(700, withTiming(0, { duration: 400 }))
        );
    };

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

    // ── Gestures ──
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

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            "worklet";
            triggerHeartAnimation();

            if (!track?.isFav) {
                runOnJS(toggleFavourite)();
            } else {
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
            }
        });

    const longPressGesture = Gesture.LongPress()
        .minDuration(500)
        .onStart(() => {
            "worklet";
            if (videoUrl) {
                runOnJS(setShowVideo)(!showVideo);
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
            }
        });

    const composedGesture = panGesture;
    const artworkGesture = Gesture.Simultaneous(doubleTapGesture, longPressGesture);

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
                    style={styles.container}
                >
                    {/* Video background — self-manages position sync & player lifecycle */}
                    <VideoBackground
                        videoUrl={videoUrl}
                        showVideo={showVideo}
                    />

                    {/* navbar */}
                    <NavBar />

                    {/* title — subscribes to track.title independently */}
                    <TrackTitle />

                    <OptionsContainer lightVibrant={lightColor} />

                    {/* cover art, lyrics, heart animation */}
                    <GestureDetector gesture={artworkGesture}>
                        <Animated.View>
                            <CoverArtwork
                                lightColor={lightColor}
                                shadowColor={colors?.lightMuted}
                                dominantColor={colors?.dominant}
                                showVideo={showVideo}
                                videoUrl={videoUrl}
                                heartScale={heartScale}
                                heartOpacity={heartOpacity}
                            />
                        </Animated.View>
                    </GestureDetector>

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
    }
});

export default TrackControllerFullView;
