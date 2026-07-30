import { useRef, memo } from "react";
import {
    View,
    Text,
    Dimensions,
    TouchableOpacity,
    StyleSheet
} from "react-native";
import LottieView from "lottie-react-native";
import { InteractionManager } from "react-native";
import { Image } from "expo-image";

import {
    useMultiSelect,
    useStatus,
    useAppStatus
} from "../store/appState.store.js";
import { usePlayer } from "../store/player.js";

import HighlightedText from "../components/HighlightedTitle.jsx";

const { width: vw, height: vh } = Dimensions.get("window");

const ListItem = ({ item, ID, text = "" }) => {
    const updateSelected = useMultiSelect(state => state.updateSelectedSongs);
    const isSelecting = useMultiSelect(state => state.selectedSongs.length > 0);
    const resetShowLyrics = useStatus(state => state.resetShowLyrics);

    const changePlaylistAndPlay = usePlayer(
        state => state.changePlaylistAndPlay
    );

    const isCurrentPlaying = usePlayer(
        state => state.currentTrackId === (item.id || item._id)
    );

    const isSelected = useMultiSelect(state =>
        state.selectedSongs.some(
            song => (song.id || song._id) === (item.id || item._id)
        )
    );

    if (!item?.url) return null;

    const handleShortPress = async () => {
        useAppStatus.getState().setPopUpOption(-1, null, null);

        if (!isSelecting) {
            resetShowLyrics();
            changePlaylistAndPlay({ playlistId: ID, trackId: item.id || item._id });
        } else {
            updateSelected(item);
        }
    };

    const handleLongPress = async ({ nativeEvent }) => {
        const y = nativeEvent.pageY - nativeEvent.locationY;
        useAppStatus.getState().setPopUpOption(y, item.id || item._id, ID, item);
    };

    return (
        <TouchableOpacity
            activeOpacity={0.6}
            onPress={handleShortPress}
            onLongPress={handleLongPress}
            style={styles.container}>
            {isSelected && (
                <View style={styles.checkBoxContainer}>
                    <Text
                        style={{
                            color: "rgb(246,7,135)",
                            fontWeight: "bold"
                        }}>
                        ✓
                    </Text>
                </View>
            )}

            <View style={styles.imageContainer}>
                <Image
                    placeholder={{ blurhash: "LKO2?U%2Tw=w]~RBVZRi};RPxuwH" }}
                    contentFit="cover"
                    transition={1000}
                    source={
                        item.artwork || item.cover
                            ? { uri: item.artwork || item.cover }
                            : require("@assets/images/images.jpeg")
                    }
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
                    loop
                    style={{
                        width: 40,
                        height: 40,
                        marginLeft: -10
                    }}
                />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#030303",
        height: 80,
        flex: 1,
        paddingHorizontal: vw * 0.02,
        flexDirection: "row",
        alignItems: "center",
        gap: vw * 0.03
    },

    checkBoxContainer: {
        marginLeft: 10
    },
    imageContainer: {
        width: vw * 0.12,
        height: vw * 0.12,
        borderRadius: vw * 0.06,
        overflow: "hidden",
        backgroundColor: "#232323"
    },
    title: {
        color: "white",
        fontWeight: "bold",
        flexShrink: 1
    },
    popUpContainer: {
        width: 200,
        height: 400,
        backgroundColor: "green",
        position: "relative",
        right: 60,
        top: 0,
        zIndex: 9999
    }
});

export default memo(ListItem);

