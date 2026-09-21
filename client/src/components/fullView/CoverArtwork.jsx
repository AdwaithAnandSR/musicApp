import { View, StyleSheet, Dimensions } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { Image } from "expo-image";
import Entypo from "@react-native-vector-icons/entypo/static";

import { usePlayer } from "@store/player";
import { useStatus } from "@store/appState.store.js";
import Lyrics from "@components/fullView/LyricsView.jsx";

const { height: vh, width: vw } = Dimensions.get("window");

const blurhash =
    "|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[";
const blurhashPlaceholder = { blurhash };

const CoverArtwork = ({
    lightColor,
    shadowColor,
    dominantColor,
    showVideo,
    videoUrl,
    heartScale,
    heartOpacity
}) => {
    const track = usePlayer(state => state.currentTrack);
    const coverUrl = track?.cover || track?.artwork;

    const showLyrics = useStatus(
        state => state.showLyrics1 || state.showLyrics2
    );

    const heartAnimatedStyle = useAnimatedStyle(() => {
        "worklet";
        return {
            transform: [{ scale: heartScale.value }],
            opacity: heartOpacity.value,
            position: "absolute",
            zIndex: 10
        };
    });

    return (
        <View style={styles.imageContainer}>
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
                style={[
                    styles.imageFill,
                    {
                        boxShadow: `0px 30px 100px ${shadowColor}b0`,
                        opacity: showVideo && videoUrl ? 0 : 1
                    }
                ]}
            />
            {showLyrics && (
                <Lyrics
                    track={track}
                    showVideo={showVideo}
                    lightVibrant={lightColor}
                />
            )}
            <Animated.View style={[heartAnimatedStyle, styles.heartContainer]}>
                <Entypo
                    name="heart"
                    size={150}
                    color={dominantColor ?? "#ef448c"}
                />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
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
    },
    heartContainer: {
        alignItems: "center",
        width: "100%"
    }
});

export default CoverArtwork;
