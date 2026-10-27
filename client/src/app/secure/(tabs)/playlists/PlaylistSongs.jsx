import { useRef, useEffect, useState } from "react";
import { StyleSheet, Text, View, Animated } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import {
    Host,
    LoadingIndicator as Loader,
    DockedSearchBar,
    SearchBar,
    Text as ComposeText
} from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";

import DownloadOptionsModal from "@components/playlists/DownloadOptionsModal.jsx";
import {
    downloadPlaylistSongs,
    getDownloadedSongs
} from "@services/downloads/downloadService.js";
import Toast from "@services/Toast.js";

import { useAppStatus, useDownloadStatus } from "@store/appState.store.js";
import { usePlayer } from "@store/player";
import { getPlaylistSongs } from "@controllers/playlists/fetch";
import queryClient from "@services/queryClient";

import ListItem from "@components/ListItem.jsx";
import PopUpOptions from "@components/PopUpOptions.jsx";
import Header from "@components/ListHeader.jsx";

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

const limit = 50,
    HEADER_HEIGHT = 250;

const PlaylistSongs = () => {
    const [scrollY] = useState(() => new Animated.Value(0));
    const flashListRef = useRef();
    const { playlistId, playlistName, artistName } = useLocalSearchParams();
    const computedPlaylistId = artistName ? `artist_${artistName}` : playlistId;

    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const searchTimeout = useRef(null);

    const hasUserScrolled = useRef(false);
    const scrollOffsetY = useRef(0);
    const onEndReachedCalledDuringMomentum = useRef(false);

    const [isRandom, setIsRandom] = useState(() => {
        const playerState = usePlayer.getState();
        return (
            playerState.currentPlaylistId === computedPlaylistId &&
            playerState.isRandomPlaylist
        );
    });

    const [seed, setSeed] = useState(() => {
        const playerState = usePlayer.getState();
        if (
            playerState.currentPlaylistId === computedPlaylistId &&
            playerState.isRandomPlaylist &&
            playerState.randomSeed
        ) {
            return playerState.randomSeed;
        }
        return Math.random();
    });
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

    const queryKey = isRandom ? [computedPlaylistId, "random", seed] : [computedPlaylistId];

    const {
        data: songs = [],
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
                artistName,
                pageParam,
                random: isRandom,
                seed
            }),

        getNextPageParam: lastPage => lastPage?.nextCursor ?? undefined,

        select: data =>
            data.pages.flatMap(
                page =>
                    page.musics?.map(({ _id, cover, ...rest }) => ({
                        id: _id,
                        _id,
                        artwork: cover,
                        cover,
                        ...rest
                    })) || []
            )
    });

    // Handle search query change with 300ms debounce
    const handleSearchChange = (query) => {
        const text = typeof query === "string" ? query : "";
        setSearchQuery(text);
        hasUserScrolled.current = false;
        scrollOffsetY.current = 0;
        onEndReachedCalledDuringMomentum.current = false;
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (!text.trim()) {
            setDebouncedSearch("");
        } else {
            searchTimeout.current = setTimeout(() => {
                setDebouncedSearch(text.trim());
            }, 300);
        }
    };

    useEffect(() => {
        hasUserScrolled.current = false;
        scrollOffsetY.current = 0;
        onEndReachedCalledDuringMomentum.current = false;
    }, [debouncedSearch]);

    useEffect(() => {
        if (!isFetchingNextPage) {
            onEndReachedCalledDuringMomentum.current = false;
        }
    }, [isFetchingNextPage]);

    const cleanSearch = debouncedSearch.trim().toLowerCase();

    // 1. First search among already loaded playlist songs
    const localMatches = cleanSearch
        ? songs.filter(song => {
              const title = song.title?.toLowerCase() || "";
              const artist = song.artist?.toLowerCase() || "";
              return title.includes(cleanSearch) || artist.includes(cleanSearch);
          })
        : [];

    // 2. Only if not found among loaded songs (and search query is not empty), make server request
    const isSearchingServer = Boolean(cleanSearch && localMatches.length === 0);

    const {
        data: serverSearchResults = [],
        isLoading: isServerSearchLoading
    } = useQuery({
        queryKey: ["playlist_song_search", computedPlaylistId, cleanSearch],
        queryFn: async ({ signal }) => {
            const data = await getPlaylistSongs({
                limit: 50,
                playlistId,
                artistName,
                search: cleanSearch,
                signal
            });
            return (
                data?.musics?.map(({ _id, cover, ...rest }) => ({
                    id: _id,
                    _id,
                    artwork: cover,
                    cover,
                    ...rest
                })) || []
            );
        },
        enabled: isSearchingServer
    });

    // Determine songs to display
    let displayedSongs = songs;
    if (cleanSearch) {
        if (localMatches.length > 0) {
            displayedSongs = localMatches;
        } else if (serverSearchResults && serverSearchResults.length > 0) {
            displayedSongs = serverSearchResults;
        } else {
            displayedSongs = [];
        }
    }

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
        const newQueryKey = [computedPlaylistId, "random", newSeed];
        let targetTracks = [];

        try {
            const data = await queryClient.fetchInfiniteQuery({
                queryKey: newQueryKey,
                queryFn: ({ pageParam = null }) =>
                    getPlaylistSongs({
                        limit,
                        playlistId,
                        artistName,
                        pageParam,
                        random: true,
                        seed: newSeed
                    }),
                initialPageParam: null,
                getNextPageParam: lastPage => lastPage?.nextCursor ?? undefined
            });

            const firstPage = data?.pages?.[0];
            targetTracks =
                firstPage?.musics?.map(({ _id, cover, ...rest }) => ({
                    id: _id,
                    _id,
                    artwork: cover,
                    cover,
                    ...rest
                })) || [];
        } catch (err) {
            console.log("Error in handlePlayShuffled fetch:", err);
        }

        setSeed(newSeed);
        setIsRandom(true);

        if (!targetTracks.length && songs && songs.length > 0) {
            targetTracks = [...songs];
            for (let i = targetTracks.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [targetTracks[i], targetTracks[j]] = [targetTracks[j], targetTracks[i]];
            }
        }

        if (targetTracks.length > 0) {
            usePlayer.getState().changePlaylistAndPlay({
                playlistId: computedPlaylistId,
                trackId: targetTracks[0].id || targetTracks[0]._id,
                tracksOverride: targetTracks,
                isRandomPlaylist: true,
                randomSeed: newSeed
            });
        }
    };

    const handleRefresh = () => {
        hasUserScrolled.current = false;
        scrollOffsetY.current = 0;
        onEndReachedCalledDuringMomentum.current = false;
        if (isRandom) {
            setSeed(Math.random());
        } else {
            queryClient.resetQueries({ queryKey });
        }
    };

    useEffect(() => {
        usePlayer.getState().setPlaylistController(computedPlaylistId, {
            fetchNextPage,
            getHasNextPage: () => hasNextPage,
            getIsFetchingNextPage: () => isFetchingNextPage
        });
        return () => {
            const { playlistControllers } = usePlayer.getState();
            if (playlistControllers[computedPlaylistId]) {
                const { [computedPlaylistId]: _, ...rest } = playlistControllers;
                usePlayer.setState({ playlistControllers: rest });
            }
        };
    }, [computedPlaylistId, fetchNextPage, hasNextPage, isFetchingNextPage]);

    useEffect(() => {
        try {
            flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
        } catch (e) {}
    }, [isRandom, seed]);

    const isRecentlyAdded = playlistId === "6a3e689cfba948ae55682fe3";

    const getHeaderLabel = dateString => {
        if (!dateString) return null;
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const isSameDate = (d1, d2) =>
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();

        if (isSameDate(date, today)) return "Today";
        if (isSameDate(date, yesterday)) return "Yesterday";
        return date.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric"
        });
    };

    const ItemSeparator = ({ leadingItem, trailingItem }) => {
        if (!isRecentlyAdded || !leadingItem || !trailingItem) return null;

        const leadingLabel = getHeaderLabel(leadingItem.createdAt);
        const trailingLabel = getHeaderLabel(trailingItem.createdAt);

        if (leadingLabel && trailingLabel && leadingLabel !== trailingLabel) {
            return (
                <View style={styles.headerContainer}>
                    <Text style={styles.headerText}>{trailingLabel}</Text>
                </View>
            );
        }
        return null;
    };

    const scrollToMiddle = targetIndex => {
        if (typeof targetIndex === "number") {
            if (targetIndex === 0)
                flashListRef.current?.scrollToOffset({
                    offset: 0,
                    animated: true
                });
            else
                flashListRef.current?.scrollToIndex({
                    index: targetIndex,
                    animated: true,
                    viewPosition: 0.3
                });
            return;
        }

        const { currentTrackId, currentPlaylistId } = usePlayer.getState();
        if (currentPlaylistId === computedPlaylistId && currentTrackId) {
            const index = displayedSongs.findIndex(s => (s.id || s._id) === currentTrackId);
            if (index !== -1) {
                flashListRef.current?.scrollToIndex({
                    index,
                    animated: true,
                    viewPosition: 0.3
                });
            }
        }
    };

    const handleDownloadSelect = async (numSongs, concurrency = 1, downloadVideo = false) => {
        if (!songs || songs.length === 0) {
            Toast.show("No songs to download", "error");
            return;
        }

        try {
            const downloadedSongs = await getDownloadedSongs(computedPlaylistId);
            const downloadedIds = new Set(
                downloadedSongs.map(s => s.id || s._id)
            );
            const downloadingTasks = useDownloadStatus.getState().downloadTasks;

            const pendingSongs = songs.filter(s => {
                const sId = s.id || s._id;
                return (
                    !downloadedIds.has(sId) &&
                    !downloadingTasks[`${computedPlaylistId}:${sId}`]
                );
            });

            if (pendingSongs.length === 0) {
                Toast.show("All songs already downloaded", "info");
                return;
            }

            const playlistToSave = {
                _id: computedPlaylistId,
                name: playlistName,
                cover: currentSelectedPlaylist?.cover || null,
                desc: description,
                artistName
            };

            const songsToDownload = pendingSongs.slice(0, numSongs);

            await downloadPlaylistSongs(
                playlistToSave,
                songsToDownload,
                concurrency,
                (current, total, progress) => {
                    // progress tracking
                },
                downloadVideo
            );
            Toast.show("Download Complete!", "success");
        } catch (error) {
            Toast.show("Download Failed", "error");
        }
    };

    const handleScrollBeginDrag = () => {
        hasUserScrolled.current = true;
        onEndReachedCalledDuringMomentum.current = false;
    };

    const handleMomentumScrollBegin = () => {
        onEndReachedCalledDuringMomentum.current = false;
    };

    const handleEndReached = () => {
        // Only load next page when:
        // 1. Not currently searching (searching shows search results)
        // 2. User has actively scrolled
        // 3. Scroll offset is past the top
        // 4. Not called during current momentum gesture
        // 5. Next page exists and not currently fetching
        // 6. List has more than 1 item
        if (
            cleanSearch ||
            !hasUserScrolled.current ||
            scrollOffsetY.current <= 20 ||
            onEndReachedCalledDuringMomentum.current ||
            !hasNextPage ||
            isFetchingNextPage ||
            isLoading ||
            isFetching ||
            displayedSongs.length <= 1
        ) {
            return;
        }

        onEndReachedCalledDuringMomentum.current = true;
        fetchNextPage();
    };

    return (
        <View style={styles.container}>
            <Header
                title={playlistName}
                HEADER_HEIGHT={HEADER_HEIGHT}
                total={displayedSongs.length}
                scrollY={scrollY}
                scrollToMiddle={scrollToMiddle}
                ID={computedPlaylistId}
                containerStyles={{ height: HEADER_HEIGHT }}
                isRandom={isRandom}
                onToggleRandom={handleToggleRandom}
                onReshuffle={handleReshuffle}
                onPlayShuffled={handlePlayShuffled}
                onDownload={() => setDownloadModalVisible(true)}
            />

            <AnimatedFlashList
                ref={flashListRef}
                data={displayedSongs}
                renderItem={({ item }) => (
                    <ListItem
                        ID={computedPlaylistId}
                        item={item}
                        text={debouncedSearch}
                        isRandomPlaylist={isRandom}
                        randomSeed={seed}
                    />
                )}
                ItemSeparatorComponent={ItemSeparator}
                ListHeaderComponent={
                    <View>
                        <View style={styles.searchContainer}>
                            <Host
                                colorScheme="dark"
                                matchContents={{ vertical: true }}
                                style={styles.searchHost}
                            >
                                <DockedSearchBar
                                    onQueryChange={handleSearchChange}
                                    modifiers={[fillMaxWidth()]}
                                >
                                    <DockedSearchBar.Placeholder>
                                        <ComposeText color="#8e8e93">
                                            Search songs in playlist...
                                        </ComposeText>
                                    </DockedSearchBar.Placeholder>
                                </DockedSearchBar>
                            </Host>
                        </View>

                        {isRecentlyAdded && displayedSongs.length > 0 && (
                            <View style={styles.headerContainer}>
                                <Text style={styles.headerText}>
                                    {getHeaderLabel(displayedSongs[0].createdAt)}
                                </Text>
                            </View>
                        )}
                    </View>
                }
                showsVerticalScrollIndicator={false}
                onEndReachedThreshold={0.2}
                keyExtractor={item => item.id || item._id}
                onEndReached={handleEndReached}
                onScrollBeginDrag={handleScrollBeginDrag}
                onMomentumScrollBegin={handleMomentumScrollBegin}
                ListFooterComponent={
                    isFetchingNextPage && displayedSongs.length > 1 ? (
                        <Host matchContents style={{ alignSelf: "center", marginVertical: 10 }}>
                            <Loader />
                        </Host>
                    ) : !cleanSearch && songs.length > 8 ? (
                        <Text
                            style={styles.loader}
                        >{`• ${displayFooterText} •`}</Text>
                    ) : null
                }
                ListEmptyComponent={
                    isLoading || (isSearchingServer && isServerSearchLoading) ? (
                        <Host matchContents style={{ alignSelf: "center", marginTop: 20 }}>
                            <Loader />
                        </Host>
                    ) : (
                        <Text style={styles.loader}>
                            {cleanSearch
                                ? `No songs found for "${debouncedSearch}".`
                                : "No songs found."}
                        </Text>
                    )
                }
                contentContainerStyle={{
                    paddingTop: HEADER_HEIGHT + 10,
                    paddingBottom: 20
                }}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    {
                        useNativeDriver: true,
                        listener: (event) => {
                            if (useAppStatus.getState().popUpOption.y !== -1) {
                                useAppStatus
                                    .getState()
                                    .setPopUpOption(-1, null, null);
                            }
                            const y = event?.nativeEvent?.contentOffset?.y ?? 0;
                            scrollOffsetY.current = y;
                            if (y > 20) {
                                hasUserScrolled.current = true;
                            }
                        }
                    }
                )}
                scrollEventThrottle={16}
                refreshing={isFetching && !isFetchingNextPage && !isLoading}
                onRefresh={handleRefresh}
            />

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
    searchContainer: {
        width: "100%",
        paddingHorizontal: 16,
        paddingBottom: 10
    },
    searchHost: {
        width: "100%"
    },
    headerContainer: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginTop: 10
    },
    headerText: {
        color: "gray",
        fontSize: 16,
        fontWeight: "bold"
    },
    loader: {
        color: "white",
        textAlign: "center",
        marginTop: 10,
        fontWeight: "bold",
        paddingHorizontal: 30,
        lineHeight: 25
    }
});

export default PlaylistSongs;
