import React, { useState } from "react";
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Text,
    ScrollView,
    Modal,
    Pressable
} from "react-native";
import { Entypo } from "@expo/vector-icons";
import { router } from "expo-router";

import { usePlayer } from "@store/player.js";
import queryClient from "@services/queryClient";
import addSongsToPlaylist from "@controllers/playlists/addSongsToPlaylist.js";

const { height: vh, width: vw } = Dimensions.get("window");

const MenuItem = ({ label, icon, onPress }) => (
    <TouchableOpacity
        onPress={onPress}
        style={styles.menuItem}
        activeOpacity={0.7}
    >
        {icon}
        <Text style={styles.menuText}>{label}</Text>
    </TouchableOpacity>
);

const NavBar = () => {
    const [showMenu, setShowMenu] = useState(false);
    const [showPlaylist, setShowPlaylist] = useState(false);

    const playlists =
        (queryClient
            .getQueryData(["playlists"])
            ?.pages.flatMap(page => page.playlists) || [])
            .filter(item => {
                const name = item?.name?.toLowerCase()?.trim();
                const id = (item?._id || item?.id || "")?.toString()?.toLowerCase();
                return (
                    name !== "recently added" &&
                    name !== "recently-added" &&
                    name !== "recentlyadded" &&
                    id !== "recently-added" &&
                    id !== "recently_added" &&
                    id !== "recentlyadded"
                );
            });

    const track = usePlayer(state => state.currentTrack);

    const handleClose = () => {
        setShowMenu(false);
        setShowPlaylist(false);
    };

    return (
        <View style={styles.navbar}>
            <View style={styles.right}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Entypo name="chevron-down" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowMenu(true)}>
                    <Entypo
                        name="dots-three-vertical"
                        size={24}
                        color="white"
                    />
                </TouchableOpacity>
            </View>

            <Modal
                visible={showMenu}
                transparent={true}
                animationType="fade"
                onRequestClose={handleClose}
            >
                <Pressable style={styles.modalOverlay} onPress={handleClose}>
                    <Pressable
                        style={styles.menu}
                        onPress={e => e.stopPropagation()}
                    >
                        {showPlaylist ? (
                            <View style={styles.playlistListWrapper}>
                                <View style={styles.playlistHeader}>
                                    <TouchableOpacity
                                        onPress={() => setShowPlaylist(false)}
                                        style={styles.backBtn}
                                        activeOpacity={0.7}
                                    >
                                        <Entypo name="chevron-left" size={18} color="#94a3b8" />
                                        <Text style={styles.headerTitle}>Add to Playlist</Text>
                                    </TouchableOpacity>
                                </View>
                                <ScrollView
                                    style={styles.scrollContainer}
                                    showsVerticalScrollIndicator={true}
                                    keyboardShouldPersistTaps="handled"
                                    bounces={true}
                                >
                                    {playlists.length > 0 ? (
                                        playlists.map((item, index) => (
                                            <MenuItem
                                                key={item._id || item.id || `${index}`}
                                                label={item.name}
                                                onPress={() => {
                                                    addSongsToPlaylist({
                                                        id: item._id || item.id,
                                                        selectedSongs: [track],
                                                        reset: handleClose
                                                    });
                                                }}
                                            />
                                        ))
                                    ) : (
                                        <Text style={styles.emptyText}>
                                            No playlists found
                                        </Text>
                                    )}
                                </ScrollView>
                            </View>
                        ) : (
                            <MenuItem
                                label="Add to Playlist"
                                icon={<Entypo name="plus" size={18} color="white" />}
                                onPress={() => setShowPlaylist(true)}
                            />
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    navbar: {
        width: "100%",
        height: "10%",
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "flex-end",
        paddingHorizontal: vw * 0.05
    },
    right: {
        flexDirection: "row",
        alignItems: "center",
        gap: vw * 0.05
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.4)"
    },
    menu: {
        backgroundColor: "#000000d2",
        borderColor: "#2a2a32",
        borderWidth: 1,
        minWidth: vw * 0.5,
        maxWidth: vw * 0.75,
        borderRadius: 18,
        position: "absolute",
        top: vh * 0.08,
        right: vw * 0.05,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 12
    },
    playlistListWrapper: {
        width: "100%"
    },
    playlistHeader: {
        borderBottomWidth: 1,
        borderBottomColor: "#ffffff15",
        paddingVertical: 10,
        paddingHorizontal: 12
    },
    backBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4
    },
    headerTitle: {
        color: "#94a3b8",
        fontSize: 12,
        fontWeight: "600",
        textTransform: "uppercase"
    },
    scrollContainer: {
        maxHeight: 220,
        width: "100%"
    },
    emptyText: {
        color: "#64748b",
        fontSize: 12,
        textAlign: "center",
        paddingVertical: 15
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: vw * 0.02,
        paddingVertical: 12,
        paddingHorizontal: 14
    },
    menuText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 14
    }
});

export default NavBar;
