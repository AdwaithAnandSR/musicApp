import { useState, useRef } from "react";
import { StyleSheet, Text, View, Animated } from "react-native";
import { useGlobalSearchParams } from "expo-router";
import { FlashList } from "@shopify/flash-list";

// import useGetPlaylistSongs from "../../../../hooks/useGetPlaylistSongs.js";

// import ListItem from "../../../../components/ListItem.jsx";
// import Header from "../../../../components/ListHeader.jsx";

import useGetPlaylistSongs from "../../../../../hooks/useGetPlaylistSongs.js";

import ListItem from "../../../../../components/ListItem.jsx";
import Header from "../../../../../components/ListHeader.jsx";

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);
const limit = 50,
    HEADER_HEIGHT = 250;

const PlaylistSongs = () => {
    const [page, setPage] = useState(1);
    const [songs, setSongs] = useState([]);
    const scrollY = useRef(new Animated.Value(0)).current;

    const { playlistId, playlistName } = useGlobalSearchParams();
    const { loading, hasMore, total } = useGetPlaylistSongs({
        playlistId,
        page,
        limit,
        setSongs
    });

    return (
        <View style={styles.container}>
            <Header
                title={playlistName}
                total={total}
                scrollY={scrollY}
                containerStyles={{ height: HEADER_HEIGHT }}
            />

            <AnimatedFlashList
                data={songs}
                renderItem={({ item }) => (
                    <ListItem LoadQueue={songs} ID={playlistId} item={item} />
                )}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    <Text style={styles.loader}>
                        {loading && hasMore
                            ? "Loading..."
                            : `•  ${playlistName}  •`}
                    </Text>
                }
                onEndReached={() => {
                    if (!loading && hasMore) setPage(prev => prev + 1);
                }}
                estimatedItemSize={79}
                contentContainerStyle={{
                    paddingTop: HEADER_HEIGHT + 10,
                    paddingBottom: 150
                }}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
            />
        </View>
    );
};

export default PlaylistSongs;

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
