import { useState, useRef, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, FlatList, Animated } from "react-native";
import { FlashList } from "@shopify/flash-list";
import throttle from "lodash.throttle";

import { useGlobalSongs } from "../../store/list.store.js";
import { useTrack } from "../../store/track.store.js";

import useGetAllSongs from "../../hooks/useGetAllSongs.js";
import ListItem from "../../components/ListItem.jsx";
import Header from "../../components/ListHeader.jsx";

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

const Home = () => {
    const LIMIT = 25,
        HEADER_HEIGHT = 250;
    const scrollY = useRef(new Animated.Value(0)).current;

    console.log("render * Home");

    const updatePage = useGlobalSongs(state => state.updatePage);
    const hasMore = useGlobalSongs(state => state.hasMore);
    const allSongs = useGlobalSongs(state => state.allSongs);

    const { loading } = useGetAllSongs({ limit: LIMIT });

    const ListFooterComponent = useMemo(
        () => (
            <Text style={styles.text}>
                {loading ? "Loading..." : hasMore ? null : "No more songs"}
            </Text>
        ),
        [loading, hasMore]
    );

    const renderItem = useCallback(
        ({ item }) => <ListItem LoadQueue={allSongs} ID={"HOME"} item={item} />,
        [allSongs]
    );

    const handleEndReached = useCallback(
        throttle(() => {
            if (!loading && hasMore) updatePage();
        }, 1000),
        [loading, hasMore]
    );

    return (
        <View style={{ flex: 1, backgroundColor: "black" }}>
            <Header
                title="Musics"
                scrollY={scrollY}
                containerStyles={{
                    height: HEADER_HEIGHT,
                    backgroundColor: "black"
                }}
            />

            <AnimatedFlashList
                data={allSongs}
                renderItem={renderItem}
                keyExtractor={item => item._id}
                onEndReachedThreshold={0.5}
                initialNumToRender={7}
                estimatedItemSize={80}
                window={10}
                removeClippedSubviews={true}
                getItemLayout={(data, index) => ({
                    length: 80,
                    offset: 80 * index,
                    index
                })}
                onEndReached={handleEndReached}
                contentContainerStyle={{
                    paddingBottom: 100,
                    paddingTop: HEADER_HEIGHT + 10
                }}
                ListFooterComponent={ListFooterComponent}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
            />
        </View>
    );
};

export default Home;

const styles = StyleSheet.create({
    text: {
        color: "white",
        fontWeight: "bold",
        textAlign: "center"
    }
});
