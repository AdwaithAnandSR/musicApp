import { useRef, useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";

import { fetchSongs } from "@controllers/song.controller.js";
import ListItem from "@components/ListItem.jsx";
import Header from "@components/ListHeader.jsx";
import Loader from "@components/Loader";

import { usePlayer } from "@store/player";
import queryClient from "@services/queryClient";

import PopUpOptions from "@components/PopUpOptions.jsx";

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);
const HEADER_HEIGHT = 200;

const Home = () => {
    const [scrollY] = useState(() => new Animated.Value(0));
    const flashListRef = useRef();

    const {
        data: allSongs = [],
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        refetch,
        isFetching
    } = useInfiniteQuery({
        queryKey: ["HOME"],
        queryFn: fetchSongs,
        initialPageParam: { startAt: 0 },
        getNextPageParam: lastPage =>
            lastPage?.hasMore && lastPage?.nextCursor != null
                ? { startAt: 0, cursor: lastPage.nextCursor }
                : undefined,
        select: data => [
            ...new Map(
                data.pages
                    .flatMap(p => p.musics || [])
                    .map(song => [
                        song._id,
                        {
                            id: song._id,
                            _id: song._id,
                            artwork: song.cover,
                            cover: song.cover,
                            ...song
                        }
                    ])
            ).values()
        ]
    });

    useEffect(() => {
        usePlayer.getState().setPlaylistController("HOME", {
            fetchNextPage,
            getHasNextPage: () => hasNextPage,
            getIsFetchingNextPage: () => isFetchingNextPage
        });
        return () => {
            const { playlistControllers } = usePlayer.getState();
            if (playlistControllers["HOME"]) {
                const { HOME: _, ...rest } = playlistControllers;
                usePlayer.setState({ playlistControllers: rest });
            }
        };
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    const handleRefresh = () => {
        queryClient.resetQueries({ queryKey: ["HOME"] });
        refetch();
    };

    const scrollToMiddle = index => {
        flashListRef.current?.scrollToIndex({ index, viewPosition: 0.3 });
    };

    return (
        <View style={{ flex: 1, backgroundColor: "black" }}>
            <Header
                title="Musics"
                scrollY={scrollY}
                scrollToMiddle={scrollToMiddle}
                ID={"HOME"}
                containerStyles={{ height: HEADER_HEIGHT }}
            />

            <AnimatedFlashList
                ref={flashListRef}
                data={allSongs}
                renderItem={({ item }) => <ListItem ID="HOME" item={item} />}
                showsVerticalScrollIndicator={false}
                keyExtractor={item => item.id || item._id}
                onEndReachedThreshold={0.5}
                initialNumToRender={7}
                estimatedItemSize={80}
                onEndReached={() => {
                    if (!isFetchingNextPage && hasNextPage) fetchNextPage();
                }}
                contentContainerStyle={{
                    paddingBottom: 100,
                    paddingTop: HEADER_HEIGHT + 10
                }}
                ListEmptyComponent={
                    isLoading ? (
                        <Loader size={"large"} />
                    ) : (
                        <Text style={styles.text}>No songs</Text>
                    )
                }
                ListFooterComponent={
                    isFetchingNextPage && <Loader size={"large"} />
                }
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                refreshing={isFetching && !isFetchingNextPage && !isLoading}
                onRefresh={handleRefresh}
            />
        </View>
    );
};

export default Home;

const styles = StyleSheet.create({
    text: { color: "white", fontWeight: "bold", textAlign: "center" }
});
