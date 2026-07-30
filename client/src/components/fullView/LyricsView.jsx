import { useRef, useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { FlashList } from "@shopify/flash-list";

import SyncedRenderItem from "@components/fullView/LyricRenderItem.jsx";
import { useStatus } from "@store/appState.store.js";
import { usePlayer } from "@store/player";

const { height: vh, width: vw } = Dimensions.get("window");

const LyricItemAsText = ({ item }) => {
    return (
        <View style={styles.lyricCont}>
            <Text style={styles.lyricText}>{item}</Text>
        </View>
    );
};

const LyricsView = ({ track = {} }) => {
    const showLyrics1 = useStatus(state => state.showLyrics1);
    const showLyrics2 = useStatus(state => state.showLyrics2);
    const showSyncedLyric = useStatus(state => state.showSyncedLyric);
    const currentLyricIndex = useStatus(state => state.currentLyricIndex);
    const setCurrentLyricIndex = useStatus(state => state.setCurrentLyricIndex);
    const resetShowLyrics = useStatus(state => state.resetShowLyrics);

    let currentTime = usePlayer(state => state.position);

    const lyricsRef = useRef();

    useEffect(() => {
        if (
            !Array.isArray(track?.lyrics) ||
            !showSyncedLyric ||
            track?.lyrics?.length === 0
        ) return;

        const index = track.lyrics.findIndex((item, i) => {
            const nextItem = track.lyrics[i + 1];
            const startTime = (item.start ?? 0) - 0.5;
            const endTime = nextItem ? (nextItem.start ?? 0) - 0.5 : (item.end ?? startTime + 10);
            return currentTime >= startTime && currentTime < endTime;
        });

        if (index !== -1 && index !== currentLyricIndex) {
            setCurrentLyricIndex(index);
        }
    }, [currentTime, track, showSyncedLyric, currentLyricIndex]);

    useEffect(() => {
        if (!showSyncedLyric || currentLyricIndex < 0) return;
        lyricsRef.current?.scrollToIndex({
            index: currentLyricIndex + 1,
            animated: true,
            viewPosition: 0.3
        });
    }, [currentLyricIndex, showSyncedLyric]);

    useEffect(() => {
        if (!track?._id) {
            resetShowLyrics();
        }
    }, [track?._id, resetShowLyrics]);

    if (!showLyrics1 && !showLyrics2 && !showSyncedLyric) return;

    return (
        <View style={styles.container}>
            <FlashList
                ref={lyricsRef}
                data={
                    showLyrics1 || showSyncedLyric
                        ? [
                              { end: -1, start: -1, line: "" },
                              ...(track?.lyrics || []),
                              { end: -1, start: -1, line: "" }
                          ]
                        : showLyrics2
                          ? ["", ...(track?.lyricsAsText || []), ""]
                          : []
                }
                estimatedItemSize={100}
                showsVerticalScrollIndicator={false}
                keyExtractor={(item, index) =>
                    `${item?._id ?? "blank"}-${index}`
                }
                renderItem={({ item, index }) =>
                    showLyrics1 || showSyncedLyric ? (
                        <SyncedRenderItem item={item} index={index} />
                    ) : showLyrics2 ? (
                        <LyricItemAsText item={item} />
                    ) : null
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        height: "100%",
        position: "absolute",
        zIndex: 9999,
        top: "50%",
        left: "50%",
        transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
        backgroundColor: "#000000cd",
        paddingHorizontal: "2%"
    },
    lyricCont: {
        width: "100%",
        height: 100,
        justifyContent: "center"
    },
    lyricText: {
        color: "white",
        textAlign: "center",
        fontWeight: "bold",
        fontSize: 28
    }
});

export default LyricsView;
