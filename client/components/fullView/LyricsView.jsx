import { useRef, useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { FlashList } from "@shopify/flash-list";

import SyncedRenderItem from "../../components/fullView/LyricRenderItem.jsx";

import { useStatus } from "../../store/appState.store.js";
import { useAudioMonitor } from "../../store/track.store.js";

const { height: vh, width: vw } = Dimensions.get("window");

const LyricItemAsText = ({ item }) => {
    return (
        <View style={styles.lyricCont}>
            <Text style={styles.lyricText}>{item}</Text>
        </View>
    );
};

const LyricsView = ({ track }) => {
    const showLyrics1 = useStatus(state => state.showLyrics1);
    const showLyrics2 = useStatus(state => state.showLyrics2);
    const showSyncedLyric = useStatus(state => state.showSyncedLyric);
    const setShowLyrics1 = useStatus(state => state.setShowLyrics1);
    const setShowLyrics2 = useStatus(state => state.setShowLyrics2);
    const setShowSyncedLyrc = useStatus(state => state.setShowSyncedLyrc);
    const currentLyricIndex = useStatus(state => state.currentLyricIndex);
    const setCurrentLyricIndex = useStatus(state => state.setCurrentLyricIndex);
    const currentTime = useAudioMonitor(state => state.currentTime);

    const lyricsRef = useRef();

    useEffect(() => {
        if (!track?.lyrics || !showSyncedLyric) return;

        const index = track.lyrics.findIndex(item => {
            return (
                currentTime >= item.start - 0.8 && currentTime <= item.end - 0.8
            );
        });

        if (index !== -1) setCurrentLyricIndex(index);
        else setCurrentLyricIndex(-1);
    }, [currentTime]);

    useEffect(() => {
        if (!showSyncedLyric) return;
        lyricsRef.current?.scrollToIndex({
            index: currentLyricIndex,
            animated: true,
            viewPosition: 0.1
        });
    }, [currentLyricIndex]);

    if (!showLyrics1 && !showLyrics2 && !showSyncedLyric) return;

    return (
        <View style={styles.container}>
            <FlashList
                ref={lyricsRef}
                data={
                    showLyrics1 || showSyncedLyric
                        ? [
                              { end: -1, start: -1, line: "" },
                              ...track.lyrics,
                              { end: -1, start: -1, line: "" }
                          ]
                        : showLyrics2
                        ? ["", ...track.lyricsAsText, ""]
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
