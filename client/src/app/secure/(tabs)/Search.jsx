import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Dimensions,
    TouchableOpacity,
    Alert
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";

import Loader from "@components/Loader";
import ListItem from "@components/ListItem.jsx";
import PopUpOptions from "@components/PopUpOptions.jsx";
import searchSongs from "@controllers/search.controller.js";
import queryClient from "@services/queryClient";
import { useMultiSelect, useAppStatus } from "@store/appState.store.js";
import { deleteSongsPermanentBatch } from "@controllers/admin.js";
import Toast from "@services/Toast.js";

const { height: vh, width: vw } = Dimensions.get("window");

const LIMIT = 25;

const Search = () => {
    const [text, setText] = useState("");
    const [debouncedText, setDebouncedText] = useState("");
    const typingTimeout = useRef(null);

    const selectedSongs = useMultiSelect(state => state.selectedSongs);
    const resetMultiSelect = useMultiSelect(state => state.reset);
    const user = useAppStatus(state => state.user);
    const isAdmin = user?.role === "admin";

    const {
        data,
        isFetching,
        isFetchingNextPage,
        fetchNextPage,
        hasNextPage,
        isLoading
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
        getNextPageParam: lastPage => lastPage.nextPage ?? undefined,
        enabled: debouncedText.length >= 3
    });

    const songs =
        data?.pages.flatMap(page =>
            page.musics?.map(({ _id, cover, ...rest }) => ({
                id: _id,
                artwork: cover,
                ...rest
            })) || []
        ) ?? [];

    useEffect(() => {
        return () => {
            if (typingTimeout.current) clearTimeout(typingTimeout.current);
        };
    }, []);

    const handleChangeText = txt => {
        setText(txt);
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setDebouncedText(txt), 500);
    };

    const handleLoadMore = () => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    };

    const handleBatchDelete = async () => {
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
                                queryClient.invalidateQueries();
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
        <View style={styles.container}>
            <TextInput
                style={styles.searchInput}
                placeholder="Search Song"
                placeholderTextColor="white"
                value={text}
                returnKeyType="search"
                onSubmitEditing={() => setDebouncedText(text)}
                onChangeText={handleChangeText}
            />

            {selectedSongs.length > 0 && (
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        onPress={resetMultiSelect}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.selectedText}>
                            Selected: {selectedSongs.length} ✕
                        </Text>
                    </TouchableOpacity>

                    {isAdmin && (
                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={handleBatchDelete}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.deleteBtnText}>
                                Delete ({selectedSongs.length})
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <FlashList
                keyExtractor={item => item.id || item._id}
                estimatedItemSize={80}
                data={songs}
                renderItem={({ item }) => (
                    <ListItem
                        ID={`SEARCH-${debouncedText}`}
                        item={item}
                        text={debouncedText}
                    />
                )}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingTop: 10 }}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    isFetchingNextPage && <Loader size={"large"} />
                }
                ListEmptyComponent={
                    isLoading ? (
                        <Loader size={"large"} />
                    ) : debouncedText.length >= 3 ? (
                        <Text style={styles.statusText}>No Songs Found!</Text>
                    ) : null
                }
            />
            <PopUpOptions />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: "relative",
        top: 0,
        paddingTop: 30,
        backgroundColor: "black"
    },
    searchInput: {
        width: vw * 0.9,
        height: vh * 0.05,
        color: "white",
        fontWeight: "900",
        backgroundColor: "rgb(66, 66, 66)",
        borderRadius: vw * 0.04,
        fontSize: 17,
        paddingHorizontal: vw * 0.03,
        marginHorizontal: "auto",
        marginTop: vh * 0.01
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
