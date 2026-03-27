import { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";

import { fetchSongs } from "@controllers/song.controller.js";
import ListItem from "@components/ListItem.jsx";
import Header from "@components/ListHeader.jsx";
import Loader from "@components/Loader";

import { storage } from "@services/storage";
import { usePlayer } from "@store/player";
import queryClient from "@services/queryClient";

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);
const HEADER_HEIGHT = 250;

const setPlaylistController = usePlayer.getState().setPlaylistController;

const Home = () => {
    const scrollY = useRef(new Animated.Value(0)).current;
    const flashListRef = useRef();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        refetch,
        isFetching
    } = useInfiniteQuery({
        queryKey: ["HOME"],
        queryFn: fetchSongs,
        initialPageParam: [],
        getNextPageParam: lastPage =>
            lastPage.hasMore ? lastPage.nextSeenPages : undefined
    });

useEffect(() => {
    setPlaylistController("HOME", { fetchNextPage, hasNextPage, isFetchingNextPage });
}, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    const allSongs = [
        ...new Map(
            data?.pages
                .flatMap(p => p.musics)
                .map(({ _id, cover, ...rest }) => [
                    _id,
                    { id: _id, artwork: cover, ...rest }
                ])
        ).values()
    ];

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
                keyExtractor={item => item.id}
                onEndReachedThreshold={0.5}
                initialNumToRender={7}
                estimatedItemSize={80}
                removeClippedSubviews={true}
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
