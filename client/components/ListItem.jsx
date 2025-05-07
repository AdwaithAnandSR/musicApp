import React from "react";
import {
    View,
    Text,
    Dimensions,
    TouchableOpacity,
    StyleSheet,
    Image
} from "react-native";
import LottieView from "lottie-react-native";
import { useAudioPlayerStatus } from "expo-audio";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { useTrack } from "../context/track.context.js";
import { useAppState } from "../context/appState.context.js";

const { height: vh, width: vw } = Dimensions.get("window");

const ListItem = ({ item, playlist, loadNewPlaylist }) => {
    const { setTrack, togglePlay, player, track, currentPlaylistName } =
        useTrack();
    const { selectedSongs, isSelecting, setIsSelecting, setSelectedSongs } =
        useAppState();
    const { playing, isBuffering } = useAudioPlayerStatus(player);

    const handleLongPress = () => {
        if (!isSelecting) setIsSelecting(true);
        setSelectedSongs(prev => [...prev, item]);
    };

    const handleShortPress = () => {
        if (!isSelecting) {
            if (currentPlaylistName != playlist) loadNewPlaylist();
            setTrack(item);
        } else
            setSelectedSongs(prev =>
                prev.includes(item)
                    ? prev.filter(song => item._id !== song._id)
                    : [...prev, item]
            );
    };

    if (!item || !item?.url) return;

    return (
        <TouchableOpacity
            activeOpacity={0.6}
            onPress={handleShortPress}
            onLongPress={handleLongPress}
            style={styles.container}
        >
            {isSelecting && selectedSongs.includes(item) && (
                <View style={styles.checkBoxContainer}>
                    <Text
                        style={{
                            color: "rgb(246,7,135)"
                        }}
                    >
                        ✓
                    </Text>
                </View>
            )}

            <View style={styles.imageContainer}>
                <Image
                    source={
                        item.cover
                            ? { uri: item.cover }
                            : require("../assets/images/images.jpeg")
                    }
                    defaultSource={require("../assets/images/DefaultImage.jpeg")}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                />
            </View>
            <Text
                numberOfLines={2}
                style={[
                    styles.title,
                    track._id === item._id ? { color: "rgb(246,7,135)" } : null
                ]}
            >
                {item?.title}
            </Text>

            {track._id === item._id && (
                <LottieView
                    autoPlay
                    source={require("../assets/animations/musicPlayingAnim.json")}
                    loop={isBuffering || playing ? true : false}
                    style={{
                        width: 40,
                        height: 40,
                        marginLeft: -10,
                        color: "rgb(246,7,135)"
                    }}
                />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#080808",
        height: vh * 0.1,
        marginVertical: vh * 0.001,
        alignItems: "center",
        flexDirection: "row",
        gap: vw * 0.03,
        paddingHorizontal: vw * 0.02
    },
    checkBoxContainer: {
        marginLeft: 10
    },
    imageContainer: {
        width: vh * 0.06,
        height: vh * 0.06,
        borderRadius: vh * 0.5,
        overflow: "hidden"
    },
    title: {
        color: "white",
        width: vw * 0.7,
        fontWeight: "bold"
    }
});

export default ListItem;
