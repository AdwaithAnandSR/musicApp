import { useState, useRef, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Animated } from "react-native";
import { FlashList } from "@shopify/flash-list";

import { useLists } from "../../context/list.context.js";
import { useTrack } from "../../context/track.context.js";

import useGetAllSongs from "../../hooks/useGetAllSongs.js";
import ListItem from "../../components/ListItem.jsx";
import Header from "../../components/ListHeader.jsx";

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

const Home = () => {
    const [loading, setLoading] = useState(true);
    const LIMIT = 25,
        HEADER_HEIGHT = 250;
    const scrollY = useRef(new Animated.Value(0)).current;

    const {
        allSongs,
        setAllSongs,
        allSongsPage: page,
        setAllSongsPage: setPage
    } = useLists();

    const { hasMore, total } = useGetAllSongs({
        setAllSongs,
        page,
        limit: LIMIT,
        setLoading
    });

    return (
        <View style={{ flex: 1, backgroundColor: "black" }}>
            <Header
                title="Musics"
                total={total}
                scrollY={scrollY}
                containerStyles={{ height: HEADER_HEIGHT , backgroundColor: 'black',}}
            />

            <AnimatedFlashList
                data={allSongs}
                renderItem={({ item }) => (
                    <ListItem queue={allSongs} ID={"HOME"} item={item} />
                )}
                keyExtractor={item => item._id}
                onEndReachedThreshold={0.5}
                initialNumToRender={7}
                estimatedItemSize={80}
                window={10}
                onEndReached={() => {
                    if (!loading && hasMore) {
                        setPage(prev => prev + 1);
                    }
                }}
                contentContainerStyle={{
                    paddingBottom: 100,
                    paddingTop: HEADER_HEIGHT + 10
                }}
                ListFooterComponent={() => (
                    <Text style={styles.text}>
                        {loading
                            ? "Loading..."
                            : hasMore
                            ? null
                            : "No more songs"}
                    </Text>
                )}
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
