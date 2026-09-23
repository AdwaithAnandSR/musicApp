import { useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";

import ListItem from "@components/playlists/ListItem.jsx";
import Header from "@components/ListHeader.jsx";
import Loader from "@components/Loader";

import { fetchArtists } from "@controllers/playlists/fetch";

import queryClient from "@services/queryClient";

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);
const HEADER_HEIGHT = 200;

const ArtistsPlaylists = () => {
    const [scrollY] = useState(() => new Animated.Value(0));

    const onScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true }
    );

    const {
        data,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch,
        isFetching
    } = useInfiniteQuery({
        queryKey: ["artists_playlists"],
        queryFn: fetchArtists,
        getNextPageParam: lastPage => lastPage.nextPage
    });

    const playlists = data?.pages.flatMap(page => page.playlists) || [];

    const handleRefresh = () => {
        queryClient.resetQueries({ queryKey: ["artists_playlists"] });
        refetch();
    };

    const renderItem = ({ item, index }) => {
        return <ListItem item={item} index={index} scrollY={scrollY} />;
    };

    return (
        <View style={styles.container}>
            <Header
                title="Artists"
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
                            }}
                        >
                            No artists found.
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

export default ArtistsPlaylists;
