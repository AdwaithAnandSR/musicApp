import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Image
} from "react-native";
import { Entypo, MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "react-native-image-colors";
import { router } from "expo-router";

import { useStatus } from "../../../store/appState.store.js";
import { usePlayerStore } from "../../../store/player.store.js";

import Controllers from "../../../components/fullView/ControllersContainer.jsx";
import SliderContainer from "../../../components/fullView/SliderContainer.jsx";
import Lyrics from "../../../components/fullView/LyricsView.jsx";
import NavBar from "../../../components/fullView/NavBar.jsx";
import Footer from "../../../components/fullView/Footer.jsx";
import OptionsContainer from "../../../components/fullView/OptionsContainer.jsx";

const { height: vh, width: vw } = Dimensions.get("window");
const blurhash =
    "|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[";

const activeLyricColor = "rgb(246,7,135)";

const TrackControllerFullView = () => {
    const [colors, setColors] = useState(null);
    const showLyrics = useStatus(
        state => state.showLyrics1 || state.showLyrics2
    );

    const track = usePlayerStore(state => state.currentTrack);

    useEffect(() => {
        if (track && track.artwork) {
            getColors(track.artwork, {
                fallback: "#228B22",
                cache: true,
                key: track.id
            }).then(setColors);
        }
    }, [track]);

    if (!track) return;

    return (
        <View style={[styles.container]}>
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

            <OptionsContainer />

            <View
                style={[
                    styles.imageContainer,
                    { shadowColor: colors?.lightVibrant || "#32ffd4" }
                ]}
            >
                <Image
                    source={
                        track?.artwork
                            ? { uri: track.artwork }
                            : require("../../../assets/images/images.jpeg")
                    }
                    placeholder={{ blurhash }}
                    contentFit="cover"
                    transition={1000}
                    filter="contrast(1.25) brightness(0.8)"
                    style={{ width: "100%", height: "100%" }}
                />
                {showLyrics && <Lyrics track={track} />}
            </View>

            {/* slider */}

            <SliderContainer
                defaultDuration={track?.duration}
                lightVibrant={colors?.lightVibrant}
            />

            {/* controllers */}
            <Controllers />
            
            {/* footer */}
            <Footer />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "black"
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
