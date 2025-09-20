import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { State } from "react-native-track-player";

import { usePlayerStore } from "../../../store/player.store.js";
import { useMultiSelect } from "../../../store/appState.store.js";
import useGetAllSongs from "../../../hooks/useGetAllSongs.js";

import ListItem from "../../../components/ListItem.jsx";
import Header from "../../../components/ListHeader.jsx";

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

const Home = () => {
    const LIMIT = 10,
        HEADER_HEIGHT = 250;
    const scrollY = useRef(new Animated.Value(0)).current;
    const [page, setPage] = useState(1);

    const { loading, hasMore } = useGetAllSongs({ limit: LIMIT, page });

    const allSongs = usePlayerStore(state => state.playlists["HOME"]);

    const ListFooterComponent = () => (
        <Text style={styles.text}>
            {loading ? "Loading..." : hasMore ? null : "No more songs"}
        </Text>
    );

    return (
        <View style={{ flex: 1, backgroundColor: "black" }}>
            <Header
                title="Musics"
                scrollY={scrollY}
                containerStyles={{
                    height: HEADER_HEIGHT
                }}
            />

            <AnimatedFlashList
                data={allSongs}
                renderItem={({ item }) => <ListItem ID="HOME" item={item} />}
                showsVerticalScrollIndicator={false}
                keyExtractor={item => item.id}
                onEndReachedThreshold={0.5}
                initialNumToRender={7}
                window={10}
                removeClippedSubviews={true}
                getItemLayout={(data, index) => ({
                    length: 80,
                    offset: 80 * index,
                    index
                })}
                onEndReached={() => {
                    if (!loading && hasMore) setPage(prev => prev + 1);
                }}
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
