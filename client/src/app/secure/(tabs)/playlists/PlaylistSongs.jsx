import { useState, useRef } from "react";
import {
    StyleSheet,
    Text,
    View,
    Animated,
    ActivityIndicator
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";

import { useAppStatus } from "@store/appState.store.js";
import { usePlayer } from "@store/player";
import { getPlaylistSongs } from "@controllers/playlists/fetch";

import ListItem from "@components/ListItem.jsx";
import PopUpOptions from "@components/PopUpOptions.jsx";
import Header from "@components/ListHeader.jsx";
import Loader from "@components/Loader";

const setPopUpOption = useAppStatus.getState().setPopUpOption;

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

const limit = 50,
    HEADER_HEIGHT = 250;

const setPlaylistController = usePlayer.getState().setPlaylistController;

const PlaylistSongs = () => {
    const scrollY = useRef(new Animated.Value(0)).current;
    const flashListRef = useRef();
    const { playlistId, playlistName } = useLocalSearchParams();

    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
        useInfiniteQuery({
            queryKey: [playlistId],

            queryFn: ({ pageParam = 1 }) =>
                getPlaylistSongs({ limit, playlistId, pageParam }),

            getNextPageParam: lastPage => lastPage.nextPage
        });

useEffect(() => {
    setPlaylistController(playlistId, { fetchNextPage, hasNextPage, isFetchingNextPage });
}, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    const songs =
        data?.pages.flatMap(page =>
            page.musics.map(({ _id, cover, ...rest }) => ({
                id: _id,
                artwork: cover,
                ...rest
            }))
        ) ?? [];

    const scrollToMiddle = index => {
        flashListRef.current?.scrollToIndex({
            index,
            viewPosition: 0.3
        });
    };

    return (
        <View style={styles.container}>
            <Header
                title={playlistName}
                // total={total}
                scrollY={scrollY}
                scrollToMiddle={scrollToMiddle}
                ID={playlistId}
                containerStyles={{ height: HEADER_HEIGHT }}
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
                keyExtractor={item => item.id}
                onEndReached={() => {
                    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
                }}
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <Loader size={"large"} />
                    ) : songs.length > 8 ? (
                        
<Text style={styles.loader}>{`• ${playlistName} •`}</Text>
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
                            setPopUpOption(-1, null, null);
                        }
                    }
                )}
            />

            <PopUpOptions />
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
