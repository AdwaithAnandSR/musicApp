import React, { useState } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from "react-native";
import Animated, { useAnimatedStyle, withTiming, runOnJS } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Entypo } from "@expo/vector-icons";

import { usePlayer } from "@store/player.js";
import queryClient from "@services/queryClient";
import addSongsToPlaylist from "@controllers/playlists/addSongsToPlaylist.js";

const { height: vh, width: vw } = Dimensions.get("window");

const MenuItem = ({ label, onPress }) => (
    <TouchableOpacity onPress={onPress} style={styles.menuItem} activeOpacity={0.7}>
        <Entypo name="list" size={18} color="white" />
        <Text style={styles.menuText}>{label}</Text>
    </TouchableOpacity>
);

const PlaylistBottomSheet = ({ playlistTranslateY, closeSheet }) => {
    const track = usePlayer((state) => state.currentTrack);

    const playlists =
        (queryClient
            .getQueryData(["playlists"])
            ?.pages.flatMap((page) => page.playlists) || [])
            .filter((item) => {
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

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: playlistTranslateY.value }],
        };
    });

    const handleAdd = (item) => {
        addSongsToPlaylist({
            id: item._id || item.id,
            selectedSongs: [track],
            reset: () => {
                playlistTranslateY.value = withTiming(vh * 0.7, { duration: 200 }, (finished) => {
                    if (finished) {
                        if (closeSheet) runOnJS(closeSheet)();
                    }
                });
            },
        });
    };

    return (
        <Animated.View style={[styles.bottomSheet, animatedStyle]}>
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
                <Text style={styles.headerTitle}>Add to Playlist</Text>
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
                            onPress={() => handleAdd(item)}
                        />
                    ))
                ) : (
                    <Text style={styles.emptyText}>No playlists found</Text>
                )}
            </ScrollView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    bottomSheet: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: vh * 0.7,
        backgroundColor: "#121212",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 10,
        paddingHorizontal: vw * 0.05,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 20,
        zIndex: 100,
    },
    handleContainer: {
        alignItems: "center",
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#333",
        marginBottom: 10,
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: "#555",
        borderRadius: 3,
        marginBottom: 15,
    },
    headerTitle: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    scrollContainer: {
        flex: 1,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: vw * 0.04,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#ffffff10",
    },
    menuText: {
        color: "white",
        fontWeight: "500",
        fontSize: 15,
    },
    emptyText: {
        color: "#64748b",
        fontSize: 14,
        textAlign: "center",
        paddingVertical: 30,
    },
});

export default PlaylistBottomSheet;
