import { useState, useMemo } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";

import ListItem from "@components/playlists/ListItem.jsx";
import CreatePlaylistCard from "@components/playlists/CreatePlaylistCard.jsx";
import Header from "@components/ListHeader.jsx";
import Loader from "@components/Loader";

import { fetchPlaylists } from "@controllers/playlists/fetch";

import queryClient from "@services/queryClient";

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);
const HEADER_HEIGHT = 200;

const Playlists = () => {
    const [scrollY] = useState(() => new Animated.Value(0));
    
    const onScroll = useMemo(() => 
        Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
        ),
    [scrollY]);

    const {
        data,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch,
        isFetching
    } = useInfiniteQuery({
        queryKey: ["playlists"],
        queryFn: fetchPlaylists,
        getNextPageParam: lastPage => lastPage.nextPage
    });

    const apiPlaylists = data?.pages.flatMap(page => page.playlists) || [];
    
    const playlists = [
        { _id: 'CREATE_PLAYLIST', isCreateButton: true },
        { _id: 'LOCAL_DOWNLOADS', name: 'Downloads', isLocalDownloadsFolder: true, cover: null },
        ...apiPlaylists
    ];

    const handleRefresh = () => {
        queryClient.resetQueries({ queryKey: ["playlists"] });
        refetch();
    };

    const renderItem = useMemo(() => {
        return ({ item, index }) => {
            if (item.isCreateButton) {
                return <CreatePlaylistCard index={index} scrollY={scrollY} />;
            }
            return <ListItem item={item} index={index} scrollY={scrollY} />;
        };
    }, [scrollY]);

    console.log("Playlist rendering")

    return (
        <View style={styles.container}>
            <Header
                title="Playlists"
                scrollY={scrollY}
                containerStyles={{ height: HEADER_HEIGHT }}
            />

            <AnimatedFlashList
                data={playlists}
                keyExtractor={(item, index) => item._id || String(index)}
                renderItem={renderItem}
                estimatedItemSize={170}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    isLoading ? (
                        <Loader size={"large"} />
                    ) : (
                        <Text
                            style={{
                                color: "white",
                                textAlign: "center",
                                marginTop: 10
                            }}>
                            no playlists.
                        </Text>
                    )
                }
                ListFooterComponent={
                    isFetchingNextPage && <Loader size={"large"} />
                }
                contentContainerStyle={{
                    paddingTop: HEADER_HEIGHT,
                    paddingBottom: 5
                }}
                onEndReached={() => {
                    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
                }}
                onEndReachedThreshold={0.5}
                onScroll={onScroll}
                scrollEventThrottle={16}
                refreshing={isFetching && !isFetchingNextPage && !isLoading}
                onRefresh={handleRefresh}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "black"
    }
});

export default Playlists;
