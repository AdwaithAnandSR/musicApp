import React, { useState, useEffect, useCallback } from "react";
import DestinationPickerModal from "./playlists/DestinationPickerModal.jsx";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
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

const SPRING_CONFIG = {
    damping: 20,
    stiffness: 200,
    mass: 0.8
};

const PopUpOptions = () => {
    const options = useAppStatus(state => state.popUpOption);
    const user = useAppStatus(state => state.user);
    const selectedSongs = useMultiSelect(state => state.selectedSongs);
    const isAdmin = user?.role === "admin";
    const [destModalVisible, setDestModalVisible] = useState(false);

    const visible = options.y !== -1 && !!options.songId && !!options.playId;

    const translateY = useSharedValue(500);
    const backdropOpacity = useSharedValue(0);

    const resetPopup = useCallback(() => {
        useAppStatus.getState().setPopUpOption(-1, null, null);
    }, []);

    const close = useCallback(() => {
        translateY.value = withTiming(500, { duration: 200 });
        backdropOpacity.value = withTiming(0, { duration: 200 }, () => {
            runOnJS(resetPopup)();
        });
    }, [resetPopup]);

    useEffect(() => {
        if (visible) {
            translateY.value = withSpring(0, SPRING_CONFIG);
            backdropOpacity.value = withTiming(1, { duration: 250 });
        } else {
             translateY.value = 500;
             backdropOpacity.value = 0;
        }
    }, [visible]);

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }]
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value
    }));

    const isRecentlyList = options.playId === "6a3e689cfba948ae55682fe3";
    const isPlaylist =
        typeof options.playId === "string" &&
        options.playId !== "HOME" &&
        options.playId !== "SEARCH" &&
        !options.playId.startsWith("SEARCH-") &&
        /^[0-9a-fA-F]{24}$/.test(options.playId);
    const count = selectedSongs.length;
    const isMultiSelecting = count > 0;

    const handleSelect = () => {
        close();
        const targetSong = options.song || {
            id: options.songId,
            _id: options.songId
        };
        setTimeout(() => {
            useMultiSelect.getState().updateSelectedSongs(targetSong);
        }, 250);
    };

    const handleClearSelection = () => {
        close();
        setTimeout(() => {
            useMultiSelect.getState().reset();
        }, 250);
    };

    const isLocalDownload = typeof options.playId === "string" && options.playId.startsWith("local-");

    const handleRemoveDownload = async () => {
        const pId = options.playId.replace("local-", "");
        close();
        setTimeout(async () => {
            const { deleteDownloadedSong } = require("../services/downloads/downloadService.js");
            await deleteDownloadedSong(pId, options.songId);
            Toast.show("Download removed", "success");
        }, 250);
    };

    const handleBatchRemove = async () => {
        const songIds = selectedSongs.map(s => s.id || s._id).filter(Boolean);
        if (!songIds.length) return;
        close();
        setTimeout(async () => {
            useMultiSelect.getState().reset();
            await removeSongsBatch({ playlistId: options.playId, songIds });
        }, 250);
    };

    const handleDownloadSingle = () => {
        close();
        setTimeout(() => setDestModalVisible(true), 250);
    };

    const handleDownloadSingleSubmit = async (playlistName, concurrency) => {
        setDestModalVisible(false);
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
        close();
        
        setTimeout(() => {
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
                            useMultiSelect.getState().reset();
                            Toast.show("Deleting Songs", "pending");

                            try {
                                const res = await deleteSongsPermanentBatch(songIds);
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
        }, 250);
    };

    const handleDeletePermanent = () => {
        close();
        setTimeout(() => {
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
                            Toast.show("Deleting Song", "pending");

                            try {
                                const res = await deleteSongPermanent(options.songId);
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
        }, 250);
    };

    const handleRemoveFromPlaylist = () => {
        close();
        setTimeout(() => removeSong(options), 250);
    };

    const songTitle = options.song?.title || "Options";

    return (
        <>
            <Modal
                visible={visible}
                transparent
                animationType="none"
                statusBarTranslucent
                onRequestClose={close}
            >
                {/* Blurred backdrop */}
                <Animated.View
                    style={[styles.backdrop, backdropStyle]}
                    pointerEvents="none"
                >
                    <BlurView
                        intensity={30}
                        tint="dark"
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>

                {/* Full-screen tap target to dismiss */}
                <TouchableOpacity
                    style={styles.dismissArea}
                    activeOpacity={1}
                    onPress={close}
                >
                    <Animated.View style={[styles.sheetContainer, sheetStyle]}>
                        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
                            <View style={styles.handleBar} />

                            <View style={styles.header}>
                                <Ionicons name="musical-notes" size={20} color="#a0a0a0" />
                                <Text style={styles.headerText} numberOfLines={1}>
                                    {songTitle}
                                </Text>
                            </View>

                            <View style={styles.divider} />

                            {isMultiSelecting ? (
                                <>
                                    {!isRecentlyList && isPlaylist && (
                                        <TouchableOpacity style={styles.option} activeOpacity={0.6} onPress={handleBatchRemove}>
                                            <View style={[styles.iconCircle, { backgroundColor: "rgba(255, 255, 255, 0.1)" }]}>
                                                <Ionicons name="remove-circle-outline" size={20} color="#e0e0e0" />
                                            </View>
                                            <Text style={styles.optionText}>Remove Selected ({count})</Text>
                                        </TouchableOpacity>
                                    )}

                                    {isAdmin && (
                                        <TouchableOpacity style={styles.option} activeOpacity={0.6} onPress={handleBatchDelete}>
                                            <View style={[styles.iconCircle, styles.deleteIconBg]}>
                                                <Ionicons name="trash-outline" size={20} color="#ff3b5c" />
                                            </View>
                                            <Text style={[styles.optionText, styles.deleteText]}>Delete Selected ({count})</Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity style={styles.option} activeOpacity={0.6} onPress={handleClearSelection}>
                                        <View style={[styles.iconCircle, { backgroundColor: "rgba(255, 255, 255, 0.1)" }]}>
                                            <Ionicons name="close-outline" size={20} color="#e0e0e0" />
                                        </View>
                                        <Text style={styles.optionText}>Clear Selection</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    {!isRecentlyList && isPlaylist && (
                                        <TouchableOpacity style={styles.option} activeOpacity={0.6} onPress={handleRemoveFromPlaylist}>
                                            <View style={[styles.iconCircle, { backgroundColor: "rgba(255, 255, 255, 0.1)" }]}>
                                                <Ionicons name="remove-circle-outline" size={20} color="#e0e0e0" />
                                            </View>
                                            <Text style={styles.optionText}>Remove from Playlist</Text>
                                        </TouchableOpacity>
                                    )}
                                    
                                    {isLocalDownload && (
                                        <TouchableOpacity style={styles.option} activeOpacity={0.6} onPress={handleRemoveDownload}>
                                            <View style={[styles.iconCircle, styles.deleteIconBg]}>
                                                <Ionicons name="trash-outline" size={20} color="#ff3b5c" />
                                            </View>
                                            <Text style={[styles.optionText, styles.deleteText]}>Remove Download</Text>
                                        </TouchableOpacity>
                                    )}

                                    {isAdmin && (
                                        <TouchableOpacity style={styles.option} activeOpacity={0.6} onPress={handleDeletePermanent}>
                                            <View style={[styles.iconCircle, styles.deleteIconBg]}>
                                                <Ionicons name="trash-outline" size={20} color="#ff3b5c" />
                                            </View>
                                            <Text style={[styles.optionText, styles.deleteText]}>Delete Song (Permanent)</Text>
                                        </TouchableOpacity>
                                    )}

                                    {!isLocalDownload && (
                                        <TouchableOpacity style={styles.option} activeOpacity={0.6} onPress={handleDownloadSingle}>
                                            <View style={[styles.iconCircle, { backgroundColor: "rgba(34, 249, 126, 0.15)" }]}>
                                                <Ionicons name="download-outline" size={20} color="#22f97e" />
                                            </View>
                                            <Text style={styles.optionText}>Download Song</Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity style={styles.option} activeOpacity={0.6} onPress={handleSelect}>
                                        <View style={[styles.iconCircle, { backgroundColor: "rgba(255, 255, 255, 0.1)" }]}>
                                            <Ionicons name="checkmark-circle-outline" size={20} color="#e0e0e0" />
                                        </View>
                                        <Text style={styles.optionText}>Select Songs</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                            
                            <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.7} onPress={close}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>

            {destModalVisible && (
                <DestinationPickerModal 
                    visible={destModalVisible}
                    onClose={() => setDestModalVisible(false)}
                    onSelect={handleDownloadSingleSubmit}
                    defaultName={useAppStatus.getState().currentSelectedPlaylist?.name || "My Downloads"}
                />
            )}
        </>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.4)"
    },
    dismissArea: {
        flex: 1,
        justifyContent: "flex-end"
    },
    sheetContainer: {},
    sheet: {
        backgroundColor: "#1a1a1a",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 10,
        paddingBottom: 40,
        paddingHorizontal: 20
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#555",
        alignSelf: "center",
        marginBottom: 16
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingBottom: 14
    },
    headerText: {
        color: "#e0e0e0",
        fontSize: 16,
        fontWeight: "600",
        flex: 1
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: "#333",
        marginBottom: 8
    },
    option: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        gap: 14
    },
    iconCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: "center",
        alignItems: "center"
    },
    deleteIconBg: {
        backgroundColor: "rgba(255, 59, 92, 0.12)"
    },
    optionText: {
        color: "#e0e0e0",
        fontSize: 16,
        fontWeight: "500",
        flex: 1
    },
    deleteText: {
        color: "#ff3b5c"
    },
    cancelBtn: {
        marginTop: 12,
        backgroundColor: "#2a2a2a",
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center"
    },
    cancelText: {
        color: "#22f97e",
        fontSize: 16,
        fontWeight: "bold"
    }
});

export default PopUpOptions;
