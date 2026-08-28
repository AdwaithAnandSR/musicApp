import DownloadOptionsModal from "@components/playlists/DownloadOptionsModal.jsx";
import { downloadPlaylistSongs, getDownloadedSongs } from "@services/downloads/downloadService.js";
import Toast from "@services/Toast.js";

import { useRef, useEffect, useState } from "react";
import { StyleSheet, Text, View, Animated } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { useAppStatus, useDownloadStatus } from "@store/appState.store.js";
import { usePlayer } from "@store/player";
import { getPlaylistSongs } from "@controllers/playlists/fetch";
import queryClient from "@services/queryClient";

import ListItem from "@components/ListItem.jsx";
import PopUpOptions from "@components/PopUpOptions.jsx";
import Header from "@components/ListHeader.jsx";
import Loader from "@components/Loader";

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

const limit = 50,
    HEADER_HEIGHT = 250;

const PlaylistSongs = () => {
    const [scrollY] = useState(() => new Animated.Value(0));
    const flashListRef = useRef();
    const { playlistId, playlistName } = useLocalSearchParams();

    const [isRandom, setIsRandom] = useState(false);
    const [seed, setSeed] = useState(() => Math.random());
    const [downloadModalVisible, setDownloadModalVisible] = useState(false);

    const currentSelectedPlaylist = useAppStatus(
        state => state.currentSelectedPlaylist
    );

    const cachedPlaylist = (
        queryClient
            .getQueryData(["playlists"])
            ?.pages?.flatMap(page => page.playlists) || []
    ).find(p => (p._id || p.id) === playlistId);

    const description =
        currentSelectedPlaylist?.desc ||
        currentSelectedPlaylist?.description ||
        cachedPlaylist?.desc ||
        cachedPlaylist?.description;

    const displayFooterText = description?.trim()
        ? description.trim()
        : playlistName;

    const queryKey = isRandom ? [playlistId, "random", seed] : [playlistId];

    const {
        data,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch,
        isFetching
    } = useInfiniteQuery({
        queryKey,

        queryFn: ({ pageParam = null }) =>
            getPlaylistSongs({
                limit,
                playlistId,
                pageParam,
                random: isRandom,
                seed
            }),

        getNextPageParam: lastPage => lastPage?.nextCursor ?? undefined
    });

    const handleToggleRandom = () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) {}
        if (!isRandom) {
            setSeed(Math.random());
            setIsRandom(true);
        } else {
            setIsRandom(false);
        }
    };

    const handleReshuffle = () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}
        setSeed(Math.random());
    };

    const handlePlayShuffled = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch (e) {}

        const newSeed = Math.random();
        setSeed(newSeed);
        setIsRandom(true);

        let targetTracks = [];

        try {
            const res = await getPlaylistSongs({
                limit,
                playlistId,
                pageParam: null,
                random: true,
                seed: newSeed
            });

            if (res) {
                queryClient.setQueryData([playlistId, "random", newSeed], {
                    pages: [res],
                    pageParams: [null]
                });
            }

            targetTracks =
                res?.musics?.map(({ _id, cover, ...rest }) => ({
                    id: _id,
                    _id,
                    artwork: cover,
                    cover,
                    ...rest
                })) || [];
        } catch (err) {
            console.log("Error in handlePlayShuffled fetch:", err);
        }

        // Fallback: If network failed or returned empty list, fall back to current visible songs list
        if (!targetTracks.length && songs && songs.length > 0) {
            targetTracks = [...songs].sort(() => Math.random() - 0.5);
        }

        if (targetTracks.length > 0) {
            usePlayer.getState().changePlaylistAndPlay({
                playlistId,
                trackId: targetTracks[0].id || targetTracks[0]._id,
                tracksOverride: targetTracks
            });
        }
    };

    const handleRefresh = () => {
        if (isRandom) {
            setSeed(Math.random());
        }
        queryClient.resetQueries({ queryKey });
        refetch();
    };

    useEffect(() => {
        usePlayer.getState().setPlaylistController(playlistId, {
            fetchNextPage,
            hasNextPage,
            isFetchingNextPage
        });
    }, [playlistId, fetchNextPage, hasNextPage, isFetchingNextPage]);

    useEffect(() => {
        try {
            flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
        } catch (e) {}
    }, [isRandom, seed]);

    const songs =
        data?.pages.flatMap(
            page =>
                page.musics?.map(({ _id, cover, ...rest }) => ({
                    id: _id,
                    _id,
                    artwork: cover,
                    cover,
                    ...rest
                })) || []
        ) ?? [];

    const scrollToMiddle = index => {
        if (index === 0)
            flashListRef.current?.scrollToOffset({
                offset: 0,
                animated: true
            });
        else
            flashListRef.current?.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0.3
            });
    };

    const handleDownloadSelect = async (numSongs) => {
        if (!songs || songs.length === 0) {
            Toast.show("No songs to download", "error");
            return;
        }

        try {
            const downloadedSongs = await getDownloadedSongs(playlistId);
            const downloadedIds = new Set(downloadedSongs.map(s => s.id || s._id));
            const downloadingTasks = useDownloadStatus.getState().downloadTasks;

            const pendingSongs = songs.filter(s => {
                const sId = s.id || s._id;
                return !downloadedIds.has(sId) && !downloadingTasks[sId];
            });

            const songsToDownload = pendingSongs.slice(0, numSongs);

            if (songsToDownload.length === 0) {
                Toast.show("All selected songs are already downloaded", "success");
                return;
            }

            Toast.show(`Downloading ${songsToDownload.length} songs...`, "pending");
            
            const playlistToSave = {
                id: playlistId,
                name: playlistName,
                cover: currentSelectedPlaylist?.cover || cachedPlaylist?.cover || null
            };
            
            await downloadPlaylistSongs(playlistToSave, songsToDownload, (current, total, progress) => {
                // we could show a progress toast here
            });
            Toast.show("Download Complete!", "success");
        } catch (error) {
            Toast.show("Download Failed", "error");
        }
    };

    return (
        <View style={styles.container}>
            <Header
                title={playlistName}
                scrollY={scrollY}
                scrollToMiddle={scrollToMiddle}
                ID={playlistId}
                containerStyles={{ height: HEADER_HEIGHT }}
                isRandom={isRandom}
                onToggleRandom={handleToggleRandom}
                onReshuffle={handleReshuffle}
                onPlayShuffled={handlePlayShuffled}
                onDownload={() => setDownloadModalVisible(true)}
            />

            <AnimatedFlashList
                ref={flashListRef}
                data={songs}
                estimatedItemSize={70}
                renderItem={({ item }) => (
                    <ListItem ID={playlistId} item={item} />
                )}
                showsVerticalScrollIndicator={false}
                onEndReachedThreshold={0.5}
                keyExtractor={item => item.id || item._id}
                onEndReached={() => {
                    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
                }}
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <Loader size={"large"} />
                    ) : songs.length > 8 ? (
                        <Text
                            style={styles.loader}
                        >{`• ${displayFooterText} •`}</Text>
                    ) : null
                }
                ListEmptyComponent={
                    isLoading ? (
                        <Loader size={"large"} />
                    ) : (
                        <Text style={styles.loader}>No songs found.</Text>
                    )
                }
                contentContainerStyle={{
                    paddingTop: HEADER_HEIGHT + 10,
                    paddingBottom: 150
                }}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    {
                        useNativeDriver: true,
                        listener: () => {
                            if (useAppStatus.getState().popUpOption.y !== -1) {
                                useAppStatus
                                    .getState()
                                    .setPopUpOption(-1, null, null);
                            }
                        }
                    }
                )}
                refreshing={isFetching && !isFetchingNextPage && !isLoading}
                onRefresh={handleRefresh}
            />

            <PopUpOptions />
            
            <DownloadOptionsModal 
                visible={downloadModalVisible}
                onClose={() => setDownloadModalVisible(false)}
                onSelect={handleDownloadSelect}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "black",
        height: "100%"
    },
    loader: {
        color: "white",
        textAlign: "center",
        marginTop: 10,
        fontWeight: "bold"
    }
});

export default PlaylistSongs;
