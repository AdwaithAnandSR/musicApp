import React, { useState } from "react";
import DestinationPickerModal from "./playlists/DestinationPickerModal.jsx";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import * as Haptics from "expo-haptics";

import { useAppStatus, useMultiSelect } from "../store/appState.store.js";
import removeSong, {
    removeSongsBatch
} from "../controllers/playlists/removeSong.js";
import {
    deleteSongPermanent,
    deleteSongsPermanentBatch
} from "../controllers/admin.js";
import Toast from "../services/Toast.js";
import queryClient from "../services/queryClient.js";

const PopUpOptions = () => {
    const options = useAppStatus(state => state.popUpOption);
    const user = useAppStatus(state => state.user);
    const selectedSongs = useMultiSelect(state => state.selectedSongs);
    const isAdmin = user?.role === "admin";
    const [destModalVisible, setDestModalVisible] = useState(false);

    if (!options.songId || options.y === -1 || !options.playId) return null;

    const isRecentlyList = options.playId === "6a3e689cfba948ae55682fe3"; // Recently Added Playlist ID

    const isPlaylist =
        typeof options.playId === "string" &&
        options.playId !== "HOME" &&
        options.playId !== "SEARCH" &&
        !options.playId.startsWith("SEARCH-") &&
        /^[0-9a-fA-F]{24}$/.test(options.playId);
    const count = selectedSongs.length;
    const isMultiSelecting = count > 0;

    const handleSelect = () => {
        useAppStatus.getState().setPopUpOption(-1, null, null);
        const targetSong = options.song || {
            id: options.songId,
            _id: options.songId
        };
        useMultiSelect.getState().updateSelectedSongs(targetSong);
    };

    const handleClearSelection = () => {
        useAppStatus.getState().setPopUpOption(-1, null, null);
        useMultiSelect.getState().reset();
    };

    const isLocalDownload = typeof options.playId === "string" && options.playId.startsWith("local-");

    const handleRemoveDownload = async () => {
        const pId = options.playId.replace("local-", "");
        useAppStatus.getState().setPopUpOption(-1, null, null);
        const { deleteDownloadedSong } = require("../services/downloads/downloadService.js");
        await deleteDownloadedSong(pId, options.songId);
        Toast.show("Download removed", "success");
    };

    const handleBatchRemove = async () => {
        const songIds = selectedSongs.map(s => s.id || s._id).filter(Boolean);
        if (!songIds.length) return;

        useAppStatus.getState().setPopUpOption(-1, null, null);
        useMultiSelect.getState().reset();
        await removeSongsBatch({ playlistId: options.playId, songIds });
    };

    const handleDownloadSingle = () => {
        setDestModalVisible(true);
    };

    const handleDownloadSingleSubmit = async (playlistName, concurrency) => {
        setDestModalVisible(false);
        useAppStatus.getState().setPopUpOption(-1, null, null);
        
        const { downloadPlaylistSongs } = require("../services/downloads/downloadService.js");
        const currentSelectedPlaylist = useAppStatus.getState().currentSelectedPlaylist;
        
        const safePlaylistName = playlistName.trim() || "My Downloads";
        const playlistId = "local_" + safePlaylistName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
        
        const playlistToSave = {
            id: playlistId,
            name: safePlaylistName,
            cover: currentSelectedPlaylist?.cover || null
        };

        const targetSong = options.song || {
            id: options.songId,
            _id: options.songId
        };
        
        Toast.show("Downloading song...", "pending");
        try {
            await downloadPlaylistSongs(playlistToSave, [targetSong], 1);
            Toast.show("Download Complete!", "success");
        } catch(e) {
            Toast.show("Download Failed", "error");
        }
    };

    const handleBatchDelete = async () => {
        const songIds = selectedSongs.map(s => s.id || s._id).filter(Boolean);
        if (!songIds.length) return;

        Haptics.impactAsync("medium");
        Alert.alert(
            `Delete ${songIds.length} Songs`,
            `Are you sure you want to permanently delete ${songIds.length} selected song(s) from the database?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete All",
                    style: "destructive",
                    onPress: async () => {
                        useAppStatus.getState().setPopUpOption(-1, null, null);
                        useMultiSelect.getState().reset();
                        Toast.show("Deleting Songs", "pending");

                        try {
                            const res =
                                await deleteSongsPermanentBatch(songIds);
                            if (res?.success) {
                                Toast.show("Songs Deleted", "success");
                                if (isPlaylist) {
                                    await removeSongsBatch({
                                        playlistId: options.playId,
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

    const handleDeletePermanent = () => {
        Haptics.impactAsync("medium");
        Alert.alert(
            "Delete Song Permanently",
            "Are you sure you want to permanently delete this song from the database?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        useAppStatus.getState().setPopUpOption(-1, null, null);
                        Toast.show("Deleting Song", "pending");

                        try {
                            const res = await deleteSongPermanent(
                                options.songId
                            );
                            if (res?.success) {
                                Toast.show("Song Deleted", "success");
                                if (isPlaylist) {
                                    removeSong(options);
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
        <>
        <View style={[styles.container, { top: Math.max(10, options.y) }]}>
            {isMultiSelecting ? (
                <>
                    {!isRecentlyList && isPlaylist && (
                        <TouchableOpacity
                            style={styles.item}
                            onPress={handleBatchRemove}
                        >
                            <Text style={styles.itemText}>
                                Remove Selected ({count})
                            </Text>
                        </TouchableOpacity>
                    )}

                    {isAdmin && (
                        <TouchableOpacity
                            style={styles.item}
                            onPress={handleBatchDelete}
                        >
                            <Text style={[styles.itemText, styles.deleteText]}>
                                Delete Selected ({count})
                            </Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.item}
                        onPress={handleClearSelection}
                    >
                        <Text style={styles.itemText}>Clear Selection</Text>
                    </TouchableOpacity>
                </>
            ) : (
                <>
                    {!isRecentlyList && isPlaylist && (
                        <TouchableOpacity
                            style={styles.item}
                            onPress={() => removeSong(options)}
                        >
                            <Text style={styles.itemText}>
                                Remove from Playlist
                            </Text>
                        </TouchableOpacity>
                    )}
                    
                    {isLocalDownload && (
                        <TouchableOpacity
                            style={styles.item}
                            onPress={handleRemoveDownload}
                        >
                            <Text style={styles.itemText}>
                                Remove Download
                            </Text>
                        </TouchableOpacity>
                    )}

                    {isAdmin && (
                        <TouchableOpacity
                            style={styles.item}
                            onPress={handleDeletePermanent}
                        >
                            <Text style={[styles.itemText, styles.deleteText]}>
                                Delete Song (Permanent)
                            </Text>
                        </TouchableOpacity>
                    )}

                    {!isLocalDownload && (
                        <TouchableOpacity
                            style={styles.item}
                            onPress={handleDownloadSingle}
                        >
                            <Text style={styles.itemText}>
                                Download Song
                            </Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.item}
                        onPress={handleSelect}
                    >
                        <Text style={styles.itemText}>Select Songs</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
        
        {destModalVisible && (
            <DestinationPickerModal 
                visible={destModalVisible}
                onClose={() => {
                    setDestModalVisible(false);
                    useAppStatus.getState().setPopUpOption(-1, null, null);
                }}
                onSelect={handleDownloadSingleSubmit}
                defaultName={useAppStatus.getState().currentSelectedPlaylist?.name || "My Downloads"}
            />
        )}
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        minWidth: 200,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: "#121212",
        borderColor: "#282828",
        borderWidth: 1,
        position: "absolute",
        zIndex: 99999,
        right: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 8
    },
    item: {
        height: 42,
        justifyContent: "center",
        alignItems: "flex-start",
        borderBottomWidth: 1,
        borderBottomColor: "#1f1f1f"
    },
    itemText: {
        color: "white",
        fontWeight: "600",
        fontSize: 14
    },
    deleteText: {
        color: "#ff4d4d"
    }
});

export default PopUpOptions;
