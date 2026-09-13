import { useState, memo } from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Animated
} from "react-native";
import { Entypo } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

import { useMultiSelect, useAppStatus } from "@store/appState.store.js";
import addSongsToPlaylist from "@controllers/playlists/addSongsToPlaylist.js";
import LongPressOptions from "./LongPressOptions.jsx";

const { height: vh, width: vw } = Dimensions.get("window");
const AnimatedExpoImage = Animated.createAnimatedComponent(Image);

const CARD_HEIGHT = 150;
const CARD_MARGIN = 15;

const ListItem = ({ item, index = 0, scrollY }) => {
    const [showOptions, setShowOptions] = useState(false);
    const isSelecting = useMultiSelect(
        state => state.selectedSongs?.length > 0
    );
    const selectedSongs = useMultiSelect(state => state.selectedSongs);
    const setCurrentSelectedPlaylist = useAppStatus(
        state => state.setCurrentSelectedPlaylist
    );
    const reset = useMultiSelect(state => state.reset);

    const handleLongPress = () => {
        if (
            item.isLocalDownloadsFolder ||
            item._id === "6a3e689cfba948ae55682fe3"
        )
            return;
        Haptics.impactAsync("light");
        setShowOptions(true);
    };

    const handleRoute = () => {
        if (item.isLocalDownloadsFolder) {
            router.push({ pathname: "secure/playlists/DownloadedPlaylists" });
            return;
        }

        setCurrentSelectedPlaylist(item);
        if (item.isLocalFolder) {
            router.push({
                pathname: "secure/playlists/DownloadedPlaylistSongs",
                params: { playlistId: item._id, playlistName: item.name }
            });
            return;
        }

        router.push({
            pathname: "secure/playlists/PlaylistSongs",
            params: { playlistId: item._id, playlistName: item.name }
        });
    };

    if (!item?._id) return null;

    // Header is approx 250px
    const itemOffset = 250 + (CARD_HEIGHT + CARD_MARGIN) * index;
    const translateY = scrollY
        ? scrollY.interpolate({
              inputRange: [itemOffset - vh, itemOffset + CARD_HEIGHT],
              outputRange: [-35, 35],
              extrapolate: "clamp"
          })
        : 0;

    const coverUrl = item.cover;

    return (
        <TouchableOpacity
            onPress={handleRoute}
            onLongPress={handleLongPress}
            style={styles.cardContainer}
            activeOpacity={0.9}
        >
            <View style={styles.imageContainer}>
                <AnimatedExpoImage
                    source={
                        coverUrl
                            ? { uri: coverUrl }
                            : require("@assets/images/DefaultImage.jpeg")
                    }
                    placeholder={{ blurhash: "L10U~q%M00t7%MRj00of00RjRjRj" }}
                    contentFit="cover"
                    transition={500}
                    style={[
                        styles.parallaxImage,
                        { transform: [{ translateY }] }
                    ]}
                />

                {/* Overlay for text readability */}
                <View style={styles.overlay}>
                    <Text style={styles.name}>{item?.name}</Text>
                    {isSelecting && (
                        <TouchableOpacity
                            onPress={() =>
                                addSongsToPlaylist({
                                    id: item._id,
                                    selectedSongs,
                                    reset
                                })
                            }
                            style={styles.btn}
                        >
                            <Entypo name="plus" size={15} color="white" />
                            <Text style={styles.text}>Add</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {showOptions && (
                <LongPressOptions
                    id={item?._id}
                    setShowOptions={setShowOptions}
                    isLocal={item?.isLocalFolder}
                />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        height: CARD_HEIGHT,
        marginHorizontal: vw * 0.05,
        marginBottom: CARD_MARGIN,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: "#1e1e1e"
    },
    imageContainer: {
        width: "100%",
        height: "100%",
        overflow: "hidden"
    },
    parallaxImage: {
        width: "100%",
        height: CARD_HEIGHT + 70,
        position: "absolute",
        top: -35
    },
    overlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingTop: 20,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        backgroundColor: "rgba(0,0,0,0.8)"
    },
    name: {
        color: "white",
        fontSize: vw * 0.055,
        fontWeight: "bold",
        textShadowColor: "rgba(0, 0, 0, 0.9)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 10,
        flex: 1,
        marginRight: 10
    },
    btn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: "#22f97e",
        borderRadius: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 4
    },
    text: {
        color: "white",
        fontWeight: "bold",
        fontSize: 13
    }
});

export default memo(ListItem);
