import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, TextInput, Dimensions } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";

import Loader from "@components/Loader";
import ListItem from "@components/ListItem.jsx";
import searchSongs from "@controllers/search.controller.js";

const { height: vh, width: vw } = Dimensions.get("window");

const LIMIT = 25;

const Search = () => {
    const [text, setText] = useState("");
    const [debouncedText, setDebouncedText] = useState("");
    const typingTimeout = useRef(null);

    const enabled = debouncedText.trim().length >= 1;

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
        enabled: debouncedText.length >= 3,
        staleTime: 0,
        gcTime: 0
    });

    const songs =
        data?.pages.flatMap(page =>
            page.musics?.map(({ _id, cover, ...rest }) => ({
                id: _id,
                artwork: cover,
                ...rest
            }))
        ) ?? [];

    const handleChangeText = txt => {
        setText(txt);
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setDebouncedText(txt), 500);
    };

    const handleLoadMore = () => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
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

            <FlashList
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
        fontWeight: 900,
        backgroundColor: "rgb(66, 66, 66)",
        borderRadius: vw * 0.04,
        fontSize: 17,
        paddingHorizontal: vw * 0.03,
        marginHorizontal: "auto",
        marginTop: vh * 0.01
    },
    statusText: {
        color: "#fac3ec",
        fontWeight: 900,
        textAlign: "center",
        marginTop: 10
    }
});

export default Search;
