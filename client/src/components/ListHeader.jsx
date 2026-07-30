import { memo, useState, useEffect } from "react";
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    Animated,
    View,
    Alert
} from "react-native";

import { useMultiSelect, useAppStatus } from "../store/appState.store.js";
import { usePlayer } from "../store/player.js";
import { removeSongsBatch } from "../controllers/playlists/removeSong.js";
import { deleteSongsPermanentBatch } from "../controllers/admin.js";
import Toast from "../services/Toast.js";
import queryClient from "../services/queryClient.js";

const HEADER_HEIGHT = 250;
const MIN_HEADER_HEIGHT = HEADER_HEIGHT - 80;

const Header = ({
    title,
    containerStyles,
    total,
    scrollY,
    scrollToMiddle,
    ID
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

    const handleShortPress = () => {
        const index = usePlayer.getState().currentTrackIndex;
        if (index != -1) scrollToMiddle(index);
    };

    const handleLongPress = () => scrollToMiddle(0);

    const handleBatchRemove = async () => {
        const songIds = selectedSongs
            .map(s => s.id || s._id)
            .filter(Boolean);
        if (!songIds.length) return;

        useMultiSelect.getState().reset();
        await removeSongsBatch({ playlistId: ID, songIds });
    };

    const handleBatchDelete = async () => {
        const songIds = selectedSongs
            .map(s => s.id || s._id)
            .filter(Boolean);
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
                            const res = await deleteSongsPermanentBatch(songIds);
                            if (res?.success) {
                                Toast.show("Songs Deleted", "success");
                                if (isPlaylist) {
                                    await removeSongsBatch({ playlistId: ID, songIds });
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
            <TouchableOpacity
                activeOpacity={0.3}
                style={styles.textCont}
                onPress={handleShortPress}
                onLongPress={handleLongPress}
            >
                <Animated.Text style={[styles.headerText]}>
                    {title}
                </Animated.Text>
                {total > -1 && <Text style={styles.headerText2}>{total}</Text>}
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
                        {isPlaylist && (
                            <TouchableOpacity
                                style={[styles.badgeBtn, styles.removeBtn]}
                                onPress={handleBatchRemove}>
                                <Text style={styles.badgeBtnText}>Remove</Text>
                            </TouchableOpacity>
                        )}
                        {isAdmin && (
                            <TouchableOpacity
                                style={[styles.badgeBtn, styles.deleteBtn]}
                                onPress={handleBatchDelete}>
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
        fontSize: 20,
        opacity: 0.7,
        letterSpacing: -2,
        alignSelf: "center"
    },
    selectedText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 18,
        letterSpacing: -1,
        paddingLeft: 10
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
