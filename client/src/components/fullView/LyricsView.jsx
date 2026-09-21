import { useRef, useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";

import SyncedRenderItem from "@components/fullView/LyricRenderItem.jsx";
import { useStatus } from "@store/appState.store.js";
import { usePlayer } from "@store/player";

const LyricItemAsText = ({ item }) => {
    return (
        <View style={styles.lyricCont}>
            <Text style={styles.lyricText}>{item}</Text>
        </View>
    );
};

const LyricsView = ({ track = {}, lightVibrant, showVideo }) => {
    const showLyrics1 = useStatus(state => state.showLyrics1);
    const showLyrics2 = useStatus(state => state.showLyrics2);
    const showSyncedLyric = useStatus(state => state.showSyncedLyric);
    const currentLyricIndex = useStatus(state => state.currentLyricIndex);
    const setCurrentLyricIndex = useStatus(state => state.setCurrentLyricIndex);
    const resetShowLyrics = useStatus(state => state.resetShowLyrics);

    let currentTime = usePlayer(state => state.position);

    const lyricsRef = useRef();
    const lastIndexRef = useRef(-1);

    // Memoize the data array so FlashList doesn't re-diff on every render
    const syncedData = useMemo(() => {
        if (!track?.lyrics || track.lyrics.length === 0) return [];
        return [
            { end: -1, start: -1, line: "" },
            ...track.lyrics,
            { end: -1, start: -1, line: "" }
        ];
    }, [track?.lyrics]);

    const textData = useMemo(() => {
        if (!track?.lyricsAsText || track.lyricsAsText.length === 0) return [];
        return ["", ...track.lyricsAsText, ""];
    }, [track?.lyricsAsText]);

    useEffect(() => {
        if (
            !Array.isArray(track?.lyrics) ||
            !showSyncedLyric ||
            track?.lyrics?.length === 0
        )
            return;

        const lyrics = track.lyrics;
        let index = -1;

        // Start searching from the last known index for O(1) in normal playback
        const start = Math.max(0, lastIndexRef.current);
        for (let i = start; i < lyrics.length; i++) {
            const item = lyrics[i];
            if (!item) continue;
            const nextItem = lyrics[i + 1];
            const startTime = (item.start ?? 0) - 0.5;
            const endTime = nextItem
                ? (nextItem.start ?? 0) - 0.5
                : (item.end ?? startTime + 10);
            if (currentTime >= startTime && currentTime < endTime) {
                index = i;
                break;
            }
        }

        // If not found forward (e.g. user seeked backward), search from start
        if (index === -1 && start > 0) {
            for (let i = 0; i < start; i++) {
                const item = lyrics[i];
                if (!item) continue;
                const nextItem = lyrics[i + 1];
                const startTime = (item.start ?? 0) - 0.5;
                const endTime = nextItem
                    ? (nextItem.start ?? 0) - 0.5
                    : (item.end ?? startTime + 10);
                if (currentTime >= startTime && currentTime < endTime) {
                    index = i;
                    break;
                }
            }
        }

        if (index !== -1 && index !== currentLyricIndex) {
            lastIndexRef.current = index;
            setCurrentLyricIndex(index);
        }
    }, [
        currentTime,
        track,
        showSyncedLyric,
        currentLyricIndex,
        setCurrentLyricIndex
    ]);

    useEffect(() => {
        if (!showSyncedLyric || currentLyricIndex < 0) return;
        lyricsRef.current?.scrollToIndex({
            index: currentLyricIndex + 1,
            animated: true,
            viewPosition: 0.3
        });
    }, [currentLyricIndex, showSyncedLyric]);

    useEffect(() => {
        if (!track?._id && !track?.id) {
            resetShowLyrics();
        }
    }, [track?._id, track?.id, resetShowLyrics]);

    if (!showLyrics1 && !showLyrics2 && !showSyncedLyric) return;

    const data =
        showLyrics1 || showSyncedLyric
            ? syncedData
            : showLyrics2
              ? textData
              : [];

    if (data.length === 0) return null;

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: !showVideo ? "#000000b0" : "transparent"
                }
            ]}
        >
            <FlashList
                ref={lyricsRef}
                data={data}
                estimatedItemSize={100}
                showsVerticalScrollIndicator={false}
                keyExtractor={(item, index) =>
                    `${item?._id ?? "blank"}-${index}`
                }
                renderItem={({ item, index }) =>
                    showLyrics1 || showSyncedLyric ? (
                        <SyncedRenderItem
                            item={item}
                            index={index}
                            lightVibrant={lightVibrant}
                        />
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
