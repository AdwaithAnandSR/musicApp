import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect } from 'expo-router';

import Header from "@components/ListHeader.jsx";
import ListItem from "@components/ListItem.jsx";
import PopUpOptions from "@components/PopUpOptions.jsx";
import { getDownloadedSongs, deleteDownloadedPlaylist } from "@services/downloads/downloadService.js";
import { usePlayer } from "@store/player.js";
import { useDownloadStatus } from "@store/appState.store.js";

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);
const HEADER_HEIGHT = 250;
const EMPTY_ARRAY = [];

const DownloadedPlaylistSongs = () => {
    const [scrollY] = useState(() => new Animated.Value(0));
    const flashListRef = useRef();
    const { playlistId, playlistName } = useLocalSearchParams();
    const [downloadedSongsState, setDownloadedSongsState] = useState([]);
    
    const downloadingPlaylistSongs = useDownloadStatus(state => state.downloadingPlaylists[playlistId] ?? EMPTY_ARRAY);
    const [syncedDownloading, setSyncedDownloading] = useState(downloadingPlaylistSongs);

    const loadSongs = useCallback(async () => {
        const fetched = await getDownloadedSongs(playlistId);
        setDownloadedSongsState(prev => {
            if (prev.length === fetched.length) {
                return prev;
            }
            return fetched;
        });
    }, [playlistId]);

    useEffect(() => {
        if (downloadingPlaylistSongs === syncedDownloading) return;

        if (downloadingPlaylistSongs.length > syncedDownloading.length) {
            setSyncedDownloading(downloadingPlaylistSongs);
            return;
        }
        
        let isMounted = true;
        getDownloadedSongs(playlistId).then(fetched => {
            if (!isMounted) return;
            setDownloadedSongsState(prev => {
                if (prev.length === fetched.length) return prev;
                return fetched;
            });
            setSyncedDownloading(downloadingPlaylistSongs);
        });
        
        return () => { isMounted = false; };
    }, [downloadingPlaylistSongs, syncedDownloading, playlistId]);
    
    const songs = [...downloadedSongsState, ...syncedDownloading];

    useFocusEffect(
        useCallback(() => {
            loadSongs();
            const interval = setInterval(loadSongs, 1000); // Polling for changes from popup
            return () => clearInterval(interval);
        }, [loadSongs])
    );

    const scrollToMiddle = index => {
        if (index === 0)
            flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
        else
            flashListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
    };

    const handleDeletePlaylist = () => {
        Alert.alert("Delete Download", "Remove this playlist and all downloaded songs from device?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                await deleteDownloadedPlaylist(playlistId);
                router.back();
            }}
        ]);
    };
    
    const handlePlayShuffled = () => {
        if (!songs.length) return;
        const targetTracks = [...songs].sort(() => Math.random() - 0.5);
        usePlayer.getState().changePlaylistAndPlay({
            playlistId: `local-${playlistId}`,
            trackId: targetTracks[0].id || targetTracks[0]._id,
            tracksOverride: targetTracks
        });
    };

    return (
        <View style={styles.container}>
            <Header
                title={playlistName}
                scrollY={scrollY}
                scrollToMiddle={scrollToMiddle}
                ID={`local-${playlistId}`}
                containerStyles={{ height: HEADER_HEIGHT }}
                onPlayShuffled={handlePlayShuffled}
                onDelete={handleDeletePlaylist}
            />
            
            <AnimatedFlashList
                ref={flashListRef}
                data={songs}
                estimatedItemSize={70}
                renderItem={({ item }) => <ListItem ID={playlistId} isLocal={true} item={item} />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No songs in this downloaded playlist.</Text>
                }
                contentContainerStyle={{
                    paddingTop: HEADER_HEIGHT + 10,
                    paddingBottom: 150
                }}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
            />
            <PopUpOptions />
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

export default DownloadedPlaylistSongs;
