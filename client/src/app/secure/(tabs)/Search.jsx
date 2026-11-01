import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Alert
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';;
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
    Host,
    LoadingIndicator as Loader,
    DockedSearchBar,
    SearchBar,
    Text as ComposeText
} from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";

import ListItem from "@components/ListItem.jsx";
import PopUpOptions from "@components/PopUpOptions.jsx";
import searchSongs from "@controllers/search.controller.js";
import queryClient from "@services/queryClient";
import { useMultiSelect, useAppStatus } from "@store/appState.store.js";
import { usePlayer } from "@store/player.js";
import { deleteSongsPermanentBatch } from "@controllers/admin.js";
import Toast from "@services/Toast.js";

const { height: vh, width: vw } = Dimensions.get("window");

const LIMIT = 25;

const Search = () => {
    const [text, setText] = useState("");
    const [debouncedText, setDebouncedText] = useState("");
    const typingTimeout = useRef(null);

    const hasUserScrolled = useRef(false);
    const onEndReachedCalledDuringMomentum = useRef(false);

    const selectedSongsCount = useMultiSelect(state => state.selectedSongs.length);
    const resetMultiSelect = useMultiSelect(state => state.reset);
    const isAdmin = useAppStatus(state => state.user?.role === "admin");

    const {
        data: songs = [],
        isFetchingNextPage,
        fetchNextPage,
        hasNextPage,
        isLoading,
        isFetching
    } = useInfiniteQuery({
        queryKey: [`SEARCH-${debouncedText}`],
        queryFn: ({ pageParam, signal }) =>
            searchSongs({
                text: debouncedText,
                pageParam,
                limit: LIMIT,
                signal
            }),
        initialPageParam: 1,
        getNextPageParam: lastPage => {
            if (!lastPage?.musics || lastPage.musics.length < LIMIT) {
                return undefined;
            }
            return lastPage.nextPage ?? undefined;
        },
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
            ),
        enabled: debouncedText.length >= 3
    });

    useEffect(() => {
        if (!debouncedText || debouncedText.length < 3) return;
        const searchId = `SEARCH-${debouncedText}`;
        usePlayer.getState().setPlaylistController(searchId, {
            fetchNextPage,
            getHasNextPage: () => hasNextPage,
            getIsFetchingNextPage: () => isFetchingNextPage
        });
        return () => {
            const { playlistControllers } = usePlayer.getState();
            if (playlistControllers[searchId]) {
                const { [searchId]: _, ...rest } = playlistControllers;
                usePlayer.setState({ playlistControllers: rest });
            }
        };
    }, [debouncedText, fetchNextPage, hasNextPage, isFetchingNextPage]);

    useEffect(() => {
        if (debouncedText && debouncedText.length >= 3 && songs && songs.length > 0) {
            usePlayer.getState().appendToQueue(`SEARCH-${debouncedText}`, songs);
        }
    }, [songs, debouncedText]);

    useEffect(() => {
        return () => {
            if (typingTimeout.current) clearTimeout(typingTimeout.current);
        };
    }, []);

    useEffect(() => {
        hasUserScrolled.current = false;
        onEndReachedCalledDuringMomentum.current = false;
    }, [debouncedText]);

    useEffect(() => {
        if (!isFetchingNextPage) {
            onEndReachedCalledDuringMomentum.current = false;
        }
    }, [isFetchingNextPage]);

    const handleChangeText = txt => {
        const val = typeof txt === "string" ? txt : "";
        setText(val);
        hasUserScrolled.current = false;
        onEndReachedCalledDuringMomentum.current = false;
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        if (!val.trim()) {
            setDebouncedText("");
        } else {
            typingTimeout.current = setTimeout(() => setDebouncedText(val.trim()), 400);
        }
    };

    const handleScrollBeginDrag = () => {
        hasUserScrolled.current = true;
        onEndReachedCalledDuringMomentum.current = false;
    };

    const handleMomentumScrollBegin = () => {
        onEndReachedCalledDuringMomentum.current = false;
    };

    const handleLoadMore = () => {
        if (
            !hasUserScrolled.current ||
            onEndReachedCalledDuringMomentum.current ||
            !hasNextPage ||
            isFetchingNextPage ||
            isLoading ||
            isFetching ||
            songs.length <= 1
        ) {
            return;
        }
        onEndReachedCalledDuringMomentum.current = true;
        fetchNextPage();
    };

    const handleBatchDelete = async () => {
        const selectedSongs = useMultiSelect.getState().selectedSongs;
        const songIds = selectedSongs.map(s => s.id || s._id).filter(Boolean);
        if (!songIds.length) return;

        Alert.alert(
            `Delete ${songIds.length} Songs`,
            `Are you sure you want to permanently delete ${songIds.length} selected song(s) from the database?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete All",
                    style: "destructive",
                    onPress: async () => {
                        resetMultiSelect();
                        Toast.show("Deleting Songs", "pending");
                        try {
                            const res = await deleteSongsPermanentBatch(songIds);
                            if (res?.success) {
                                Toast.show("Songs Deleted", "success");
                                usePlayer.getState().removeFromQueue(songIds);
                                queryClient.invalidateQueries({ queryKey: [`SEARCH-${debouncedText}`] });
                                queryClient.invalidateQueries({ queryKey: ["HOME"] });
                            } else {
                                Toast.show("Delete Failed", "error");
                            }
                        } catch (err) {
                            Toast.show(
                                err?.response?.data?.message || "Delete Failed",
                                "error"
                            );
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView top={true} style={styles.container}>
            <View style={styles.searchContainer}>
                <Host
                    colorScheme="dark"
                    matchContents={{ vertical: true }}
                    style={styles.searchHost}
                >
                    <DockedSearchBar
                        onQueryChange={handleChangeText}
                        modifiers={[fillMaxWidth()]}
                    >
                        <DockedSearchBar.Placeholder>
                            <ComposeText color="#8e8e93">
                                Search songs...
                            </ComposeText>
                        </DockedSearchBar.Placeholder>
                    </DockedSearchBar>
                </Host>
            </View>

            {selectedSongsCount > 0 && (
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        onPress={resetMultiSelect}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.selectedText}>
                            Selected: {selectedSongsCount} ✕
                        </Text>
                    </TouchableOpacity>

                    {isAdmin && (
                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={handleBatchDelete}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.deleteBtnText}>
                                Delete ({selectedSongsCount})
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <FlashList
                keyExtractor={item => item.id || item._id}
                data={songs}
                renderItem={({ item }) => (
                    <ListItem
                        ID={`SEARCH-${debouncedText}`}
                        item={item}
                        text={debouncedText}
                    />
                )}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingTop: 10, paddingBottom: 20 }}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.2}
                onScrollBeginDrag={handleScrollBeginDrag}
                onMomentumScrollBegin={handleMomentumScrollBegin}
                ListFooterComponent={
                    isFetchingNextPage && songs.length > 1 ? (
                        <Host matchContents style={{ alignSelf: "center", marginVertical: 10 }}>
                            <Loader />
                        </Host>
                    ) : null
                }
                ListEmptyComponent={
                    isLoading ? (
                        <Host matchContents style={{ alignSelf: "center", marginTop: 20 }}>
                            <Loader />
                        </Host>
                    ) : debouncedText.length >= 3 ? (
                        <Text style={styles.statusText}>No Songs Found!</Text>
                    ) : null
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: "relative",
        top: 0,
        
        backgroundColor: "black"
    },
    searchContainer: {
        width: "100%",
        paddingHorizontal: 16,
        paddingBottom: 6
    },
    searchHost: {
        width: "100%"
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: vw * 0.05,
        marginTop: 10,
        marginBottom: 4
    },
    selectedText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16
    },
    deleteBtn: {
        backgroundColor: "#990000",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12
    },
    deleteBtnText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 13
    },
    statusText: {
        color: "#fac3ec",
        fontWeight: "900",
        textAlign: "center",
        marginTop: 10
    }
});

export default Search;
