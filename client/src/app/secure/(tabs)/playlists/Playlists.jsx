import { useState, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";

import FloatingAdd from "@components/playlists/FloatingAdd.jsx";
import ListItem from "@components/playlists/ListItem.jsx";
import Header from "@components/ListHeader.jsx";
import Loader from "@components/Loader";

import { fetchPlaylists } from "@controllers/playlists/fetch";

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);
const HEADER_HEIGHT = 250;

const Playlists = () => {
    const scrollY = useRef(new Animated.Value(0)).current;

    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
        useInfiniteQuery({
            queryKey: ["playlists"],
            queryFn: fetchPlaylists,
            getNextPageParam: lastPage => lastPage.nextPage
        });

    const playlists = data?.pages.flatMap(page => page.playlists) || [];

    return (
        <View style={styles.container}>
            <Header
                title="Playlists"
                scrollY={scrollY}
                containerStyles={{ height: HEADER_HEIGHT }}
            />

            <AnimatedFlashList
                data={playlists}
                renderItem={({ item }) => <ListItem item={item} />}
                estimatedItemSize={70}
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
                            no playlists.
                        </Text>
                    )
                }
                ListFooterComponent={
                    isFetchingNextPage && <Loader size={"large"} />
                }
                contentContainerStyle={{
                    paddingTop: HEADER_HEIGHT,
                    paddingBottom: 150
                }}
                
onEndReached={() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
}}
                onEndReachedThreshold={0.5}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
            />

            <FloatingAdd />
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
