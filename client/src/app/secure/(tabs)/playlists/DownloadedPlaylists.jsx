import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect } from 'expo-router';

import Header from "@components/ListHeader.jsx";
import ListItem from "@components/playlists/ListItem.jsx";
import { getDownloadedPlaylists, getDownloadedSongs } from "@services/downloads/downloadService.js";
import { useDownloadStatus } from "@store/appState.store.js";

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);
const HEADER_HEIGHT = 250;

const DownloadedPlaylists = () => {
    const [scrollY] = useState(() => new Animated.Value(0));
    const [playlists, setPlaylists] = useState([]);
    const inFlightRef = useRef(false);

    const loadPlaylists = useCallback(async () => {
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        try {
            const fetchedPlaylists = await getDownloadedPlaylists();
            const playlistsWithCovers = await Promise.all(
                fetchedPlaylists.map(async p => {
                    const songs = await getDownloadedSongs(p.id);
                    return {
                        ...p,
                        _id: p.id,
                        isLocalFolder: true,
                        cover: songs && songs.length > 0 ? (songs[0].cover || songs[0].artwork) : p.cover
                    };
                })
            );
            setPlaylists(prev => {
                const prevSig = prev.map(p => `${p.id}:${p.songCount || 0}:${p.sizeBytes || 0}`).join('|');
                const newSig = playlistsWithCovers.map(p => `${p.id}:${p.songCount || 0}:${p.sizeBytes || 0}`).join('|');
                if (prevSig === newSig) return prev;
                return playlistsWithCovers;
            });
        } finally {
            inFlightRef.current = false;
        }
    }, []);

    // Load on screen focus
    useFocusEffect(
        useCallback(() => {
            loadPlaylists();
        }, [loadPlaylists])
    );

    // Reload when downloads start or finish (count changes), not on every progress tick
    const downloadingCount = useDownloadStatus(state =>
        Object.values(state.downloadingPlaylists).reduce((acc, songs) => acc + songs.length, 0)
    );

    useEffect(() => {
        loadPlaylists();
    }, [downloadingCount, loadPlaylists]);

    const totalBytes = playlists.reduce((acc, p) => acc + (p.sizeBytes || 0), 0);
    let formattedSpace = "";
    if (totalBytes > 0) {
        if (totalBytes > 1024 * 1024 * 1024) {
            formattedSpace = (totalBytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
        } else {
            formattedSpace = (totalBytes / (1024 * 1024)).toFixed(0) + " MB";
        }
    }

    return (
        <View style={styles.container}>
            <Header
                title="Downloads"
                scrollY={scrollY}
                containerStyles={{ height: HEADER_HEIGHT }}
                total={formattedSpace ? `Space used: ${formattedSpace}` : " "}
            />
            
            <AnimatedFlashList
                data={playlists}
                renderItem={({ item }) => <ListItem item={item} />}
                estimatedItemSize={70}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No downloaded playlists.</Text>
                }
                contentContainerStyle={{
                    paddingTop: HEADER_HEIGHT,
                    paddingBottom: 150
                }}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black'
    },
    emptyText: {
        color: 'white',
        textAlign: 'center',
        marginTop: 20
    }
});

export default DownloadedPlaylists;
