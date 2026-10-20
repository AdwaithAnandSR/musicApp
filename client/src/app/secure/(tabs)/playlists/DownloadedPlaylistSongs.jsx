import React, { useState, useRef, useEffect } from 'react';
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
    
    // Select only the set of downloading IDs (a string), not the full array.
    // This way progress ticks don't cause re-renders — only add/remove does.
    const downloadingSongIds = useDownloadStatus(
        state => (state.downloadingPlaylists[playlistId] ?? EMPTY_ARRAY).map(s => s.id || s._id).join(',')
    );
    // Derive the full array from getState() — React Compiler handles caching
    const downloadingPlaylistSongs = downloadingSongIds
        ? useDownloadStatus.getState().downloadingPlaylists[playlistId] ?? EMPTY_ARRAY
        : EMPTY_ARRAY;

    const [syncedDownloading, setSyncedDownloading] = useState(downloadingPlaylistSongs);

    const loadSongs = async () => {
        const fetched = await getDownloadedSongs(playlistId);
        setDownloadedSongsState(prev => {
            // Compare by ID signature, not length — fixes B6
            const prevIds = prev.map(s => s.id || s._id).join(',');
            const fetchedIds = fetched.map(s => s.id || s._id).join(',');
            if (prevIds === fetchedIds) return prev;
            return fetched;
        });
    };

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
                const prevIds = prev.map(s => s.id || s._id).join(',');
                const fetchedIds = fetched.map(s => s.id || s._id).join(',');
                if (prevIds === fetchedIds) return prev;
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
        }, [loadSongs])
    );

    const [refreshing, setRefreshing] = useState(false);
    const handleRefresh = async () => {
        setRefreshing(true);
        await loadSongs();
        setRefreshing(false);
    };

    const scrollToMiddle = targetIndex => {
        if (typeof targetIndex === "number") {
            if (targetIndex === 0)
                flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
            else
                flashListRef.current?.scrollToIndex({ index: targetIndex, animated: true, viewPosition: 0.3 });
            return;
        }

        const { currentTrackId, currentPlaylistId } = usePlayer.getState();
        if (currentPlaylistId === `local-${playlistId}` && currentTrackId) {
            const index = songs.findIndex(s => (s.id || s._id) === currentTrackId);
            if (index !== -1) {
                flashListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
            }
        }
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
        const targetTracks = [...songs];
        for (let i = targetTracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [targetTracks[i], targetTracks[j]] = [targetTracks[j], targetTracks[i]];
        }
        usePlayer.getState().changePlaylistAndPlay({
            playlistId: `local-${playlistId}`,
            trackId: targetTracks[0].id || targetTracks[0]._id,
            tracksOverride: targetTracks,
            isLocal: true
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
                keyExtractor={item => item.id || item._id}
                renderItem={({ item }) => <ListItem ID={`local-${playlistId}`} item={item} />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No songs in this downloaded playlist.</Text>
                }
                contentContainerStyle={{
                    paddingTop: HEADER_HEIGHT + 10,
                    paddingBottom: 150
                }}
                refreshing={refreshing}
                onRefresh={handleRefresh}
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

export default DownloadedPlaylistSongs;
