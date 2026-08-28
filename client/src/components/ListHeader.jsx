import {
    TouchableOpacity,
    Text,
    StyleSheet,
    Animated,
    View,
    Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useMultiSelect, useAppStatus } from "../store/appState.store.js";
import { usePlayer } from "../store/player.js";
import { removeSongsBatch } from "../controllers/playlists/removeSong.js";
import { deleteSongsPermanentBatch } from "../controllers/admin.js";
import Toast from "../services/Toast.js";
import queryClient from "../services/queryClient.js";

const HEADER_HEIGHT = 250;
const MIN_HEADER_HEIGHT = HEADER_HEIGHT - 90;

const Header = ({
    title,
    containerStyles,
    total,
    scrollY,
    scrollToMiddle,
    ID,
    isRandom = false,
    onToggleRandom,
    onReshuffle,
    onPlayShuffled,
    onDownload,
    onDelete
}) => {
    const translateY = scrollY?.interpolate({
        inputRange: [0, MIN_HEADER_HEIGHT],
        outputRange: [0, -MIN_HEADER_HEIGHT],
        extrapolate: "clamp"
    });

    const selectedSongs = useMultiSelect(state => state.selectedSongs);
    const user = useAppStatus(state => state.user);
    const isAdmin = user?.role === "admin";
    const isPlaylist =
        typeof ID === "string" &&
        ID !== "HOME" &&
        ID !== "SEARCH" &&
        !ID.startsWith("SEARCH-") &&
        /^[0-9a-fA-F]{24}$/.test(ID);

    const isRecentlyAdded = ID === "6a3e689cfba948ae55682fe3"; // Recently Added Playlist ID

    const handleShortPress = () => {
        const index = usePlayer.getState().currentTrackIndex;
        if (index !== -1) scrollToMiddle(index);
    };

    const handleLongPress = () =>
        typeof scrollToMiddle === "function" && scrollToMiddle(0);

    const handleBatchRemove = async () => {
        const songIds = selectedSongs.map(s => s.id || s._id).filter(Boolean);
        if (!songIds.length) return;

        useMultiSelect.getState().reset();
        await removeSongsBatch({ playlistId: ID, songIds });
    };

    const handleBatchDelete = async () => {
        const songIds = selectedSongs.map(s => s.id || s._id).filter(Boolean);
        if (!songIds.length) return;

        Alert.alert(
            `Delete ${songIds.length} Songs`,
            `Are you sure you want to permanently delete ${songIds.length} selected song(s) from the database?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete All",
                    style: "destructive",
                    onPress: async () => {
                        useMultiSelect.getState().reset();
                        Toast.show("Deleting Songs", "pending");
                        try {
                            const res =
                                await deleteSongsPermanentBatch(songIds);
                            if (res?.success) {
                                Toast.show("Songs Deleted", "success");
                                if (isPlaylist) {
                                    await removeSongsBatch({
                                        playlistId: ID,
                                        songIds
                                    });
                                }
                                queryClient.invalidateQueries();
                            } else {
                                Toast.show("Delete Failed", "error");
                            }
                        } catch (err) {
                            Toast.show(
                                err?.response?.data?.message || "Delete Failed",
                                "error"
                            );
                        }
                    }
                }
            ]
        );
    };

    const shuffleOpacity = scrollY
        ? scrollY.interpolate({
              inputRange: [0, MIN_HEADER_HEIGHT],
              outputRange: [1, 0],
              extrapolate: "clamp"
          })
        : 1;

    const shuffleTranslateY = scrollY
        ? scrollY.interpolate({
              inputRange: [0, 50],
              outputRange: [0, -10],
              extrapolate: "clamp"
          })
        : 0;

    return (
        <Animated.View
            style={[
                styles.header,
                containerStyles,
                {
                    transform: [{ translateY }],
                    marginTop: selectedSongs?.length > 0 ? 23 : 0
                }
            ]}
        >
            {isPlaylist &&
                !isRecentlyAdded &&
                (!selectedSongs || selectedSongs.length === 0) && (
                    <Animated.View
                        style={[
                            styles.shuffleRow,
                            {
                                opacity: shuffleOpacity,
                                transform: [{ translateY: shuffleTranslateY }]
                            }
                        ]}
                    >
                        <TouchableOpacity
                            style={[
                                styles.shuffleToggleBtn,
                                isRandom && styles.shuffleToggleBtnActive
                            ]}
                            onPress={onToggleRandom}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="shuffle"
                                size={18}
                                color={isRandom ? "#ffffff" : "#b0b0b0"}
                            />
                            <Text
                                style={[
                                    styles.shuffleBtnText,
                                    isRandom && styles.shuffleBtnTextActive
                                ]}
                            >
                                {isRandom ? "Shuffled" : "Shuffle"}
                            </Text>
                        </TouchableOpacity>

                        {isRandom && (
                            <TouchableOpacity
                                style={styles.reshuffleBtn}
                                onPress={onReshuffle}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name="refresh"
                                    size={15}
                                    color="#ffffff"
                                />
                                <Text style={styles.reshuffleBtnText}>
                                    Reshuffle
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.playShuffledBtn}
                            onPress={onPlayShuffled}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="play" size={15} color="#000000" />
                            <Text style={styles.playShuffledBtnText}>
                                Shuffle Play
                            </Text>
                        </TouchableOpacity>

                        {onDownload && (
                            <TouchableOpacity
                                style={[styles.shuffleToggleBtn, { marginLeft: 10 }]}
                                onPress={onDownload}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="download-outline" size={18} color="#ffffff" />
                            </TouchableOpacity>
                        )}
                        {onDelete && (
                            <TouchableOpacity
                                style={[styles.shuffleToggleBtn, { marginLeft: 10, borderColor: '#ff4d4d', backgroundColor: 'rgba(255,77,77,0.1)' }]}
                                onPress={onDelete}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="trash-outline" size={18} color="#ff4d4d" />
                            </TouchableOpacity>
                        )}
                    </Animated.View>
                )}
            <TouchableOpacity
                activeOpacity={0.3}
                style={styles.textCont}
                onPress={handleShortPress}
                onLongPress={handleLongPress}
            >
                <Animated.Text
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    style={[styles.headerText]}
                >
                    {title}
                </Animated.Text>
                {total !== undefined && total !== null && total !== -1 && <Text style={styles.headerText2}>{total}</Text>}
            </TouchableOpacity>

            {selectedSongs?.length > 0 && (
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        onPress={() => useMultiSelect.getState().reset()}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.selectedText}>
                            Selected: {selectedSongs?.length} ✕
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.btnGroup}>
                        {!isRecentlyAdded && isPlaylist && (
                            <TouchableOpacity
                                style={[styles.badgeBtn, styles.removeBtn]}
                                onPress={handleBatchRemove}
                            >
                                <Text style={styles.badgeBtnText}>Remove</Text>
                            </TouchableOpacity>
                        )}
                        {isAdmin && (
                            <TouchableOpacity
                                style={[styles.badgeBtn, styles.deleteBtn]}
                                onPress={handleBatchDelete}
                            >
                                <Text style={styles.badgeBtnText}>Delete</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    header: {
        overflow: "hidden",
        paddingBottom: 5,
        paddingHorizontal: 13,
        justifyContent: "flex-end",
        position: "absolute",
        alignSelf: "flex-start",
        top: 0,
        width: "100%",
        zIndex: 1
    },

    textCont: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        gap: 20,
        width: "100%"
    },
    headerText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 50,
        letterSpacing: -2,
        paddingRight: 10,
        textShadowColor: "rgba(0,0,0,1)",
        textShadowOffset: { width: 3, height: 3 },
        textShadowRadius: 5
    },
    headerText2: {
        color: "white",
        fontWeight: "bold",
        fontSize: 12,
        opacity: 0.7,
        alignSelf: "center"
    },
    selectedText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 18,
        letterSpacing: -1,
        paddingLeft: 10
    },
    shuffleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 10,
        marginTop: 6
    },
    shuffleToggleBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 13,
        paddingVertical: 6,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.12)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)"
    },
    shuffleToggleBtnActive: {
        backgroundColor: "#f60787",
        borderColor: "#f60787"
    },
    shuffleBtnText: {
        color: "#b0b0b0",
        fontWeight: "bold",
        fontSize: 13
    },
    shuffleBtnTextActive: {
        color: "#ffffff"
    },
    reshuffleBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 18,
        backgroundColor: "#2a2a2a",
        borderWidth: 1,
        borderColor: "#444"
    },
    reshuffleBtnText: {
        color: "#ffffff",
        fontWeight: "bold",
        fontSize: 13
    },
    playShuffledBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 18,
        backgroundColor: "#22f97e",
        marginLeft: "auto"
    },
    playShuffledBtnText: {
        color: "#000000",
        fontWeight: "bold",
        fontSize: 13
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingRight: 10,
        marginTop: 4
    },
    btnGroup: {
        flexDirection: "row",
        gap: 8,
        alignItems: "center"
    },
    badgeBtn: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center"
    },
    removeBtn: {
        backgroundColor: "#2a2a2a",
        borderWidth: 1,
        borderColor: "#444"
    },
    deleteBtn: {
        backgroundColor: "#990000"
    },
    badgeBtnText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 13
    }
});

export default Header;
