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
import {
    useActiveTrack,
    usePlaybackState,
    State
} from "react-native-track-player";

import { useMultiSelect, useStatus } from "../store/appState.store.js";

import { usePlayerStore } from "../store/player.store.js";

import HighlightedText from "../components/HighlightedTitle.jsx";

const { height: vh, width: vw } = Dimensions.get("window");
const blurhash =
    "|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[";

const ListItem = ({ item, ID, text = "" }) => {
    const updateSelected = useMultiSelect(state => state.updateSelectedSongs);
    const isSelecting = useMultiSelect(state => state.selectedSongs.length > 0);
    const isSelected = useMultiSelect(state =>
        state.selectedSongs.some(song => song._id === item._id)
    );
    const resetShowLyrics = useStatus(state => state.resetShowLyrics);

    const { state } = usePlaybackState();
    const currentTrack = useActiveTrack();
    const currentPlaylist = usePlayerStore(s => s.currentPlaylist);
    const playTrack = usePlayerStore(s => s.playTrack);
    const setPlaylist = usePlayerStore(s => s.setPlaylist);

    if (!item?.url) return;

    const isCurrentPlaying =
        currentTrack && currentTrack?.id === item.id && state != State.Stopped;
    
    const handleShortPress = async () => {
        if (!isSelecting) {
            resetShowLyrics();
            if (currentPlaylist !== ID) {
                await setPlaylist(ID);
            }
            // 🔑 Small delay ensures TrackPlayer.add() completes
            setTimeout(() => playTrack(item.id), 50);
        } else updateSelected(item.id);
    };

    return (
        <TouchableOpacity
            activeOpacity={0.6}
            onPress={handleShortPress}
            onLongPress={() => updateSelected(item)}
            style={styles.container}
        >
            {isSelected && (
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
                        item.artwork
                            ? { uri: item.artwork }
                            : require("../assets/images/images.jpeg")
                    }
                    placeholder={{ blurhash }}
                    contentFit="cover"
                    transition={1000}
                    style={{ width: "100%", height: "100%" }}
                />
            </View>

            <HighlightedText
                title={item.title}
                search={text}
                isCurrent={isCurrentPlaying}
            />

            {isCurrentPlaying && (
                <LottieView
                    autoPlay
                    source={require("../assets/animations/musicPlayingAnim.json")}
                    loop={true}
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
        backgroundColor: "#050505",
        height: 80,
        alignItems: "center",
        flexDirection: "row",
        gap: vw * 0.03,
        paddingHorizontal: vw * 0.02
    },
    checkBoxContainer: {
        marginLeft: 10
    },
    imageContainer: {
        width: vw * 0.12,
        height: vw * 0.12,
        borderRadius: vh * 0.5,
        overflow: "hidden",
        backgroundColor: "#232323"
    },
    title: {
        color: "white",
        width: vw * 0.85,
        fontWeight: "bold"
    }
});

export default React.memo(ListItem, (prev, next) => {
    return prev.item._id != next.item._id;
});
