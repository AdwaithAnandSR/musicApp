import { useState, useRef } from "react";
import { StyleSheet, Text, View, Animated } from "react-native";
import { useGlobalSearchParams } from "expo-router";
import { FlashList } from "@shopify/flash-list";

import useGetPlaylistSongs from "../../../../hooks/useGetPlaylistSongs.js";
import { usePlayerStore } from "../../../../store/player.store.js";
import { useAppStatus } from "../../../../store/appState.store.js";

import ListItem from "../../../../components/ListItem.jsx";
import PopUpOptions from "../../../../components/PopUpOptions.jsx";
import Header from "../../../../components/ListHeader.jsx";

const setPopUpOption = useAppStatus.getState().setPopUpOption;

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

const limit = 50,
    HEADER_HEIGHT = 250;

const PlaylistSongs = () => {
    const [page, setPage] = useState(1);
    const scrollY = useRef(new Animated.Value(0)).current;

    const playlistId = useAppStatus(
        state => state.currentSelectedPlaylist?._id
    );
    const playlistName = useAppStatus(
        state => state.currentSelectedPlaylist?.name
    );

    const songs = usePlayerStore(state => state.playlists[playlistId]);

    const { loading, hasMore, total } = useGetPlaylistSongs({
        playlistId,
        page,
        limit
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
                    <ListItem ID={playlistId} item={item} />
                )}
                onEndReachedThreshold={0.5}
                showsVerticalScrollIndicator={false}
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
                contentContainerStyle={{
                    paddingTop: HEADER_HEIGHT + 10,
                    paddingBottom: 150
                }}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    {
                        useNativeDriver: true,
                        listener: event => {
                            setPopUpOption(-1, null, null);
                        }
                    }
                )}
            />

            <PopUpOptions />
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
