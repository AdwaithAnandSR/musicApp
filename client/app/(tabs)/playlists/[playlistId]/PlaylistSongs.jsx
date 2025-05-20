import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useGlobalSearchParams } from "expo-router";
import { FlashList } from "@shopify/flash-list";

import useGetPlaylistSongs from "../../../../hooks/useGetPlaylistSongs.js";
import { useTrack } from "../../../../context/track.context.js";

import ListItem from "../../../../components/ListItem.jsx";

const limit = 25;
const PlaylistSongs = () => {
    const [page, setPage] = useState(1);
    const [songs, setSongs] = useState([1]);
    const { playlistId } = useGlobalSearchParams();
    const { loading, hasMore, playlistName } = useGetPlaylistSongs({
        playlistId,
        page,
        limit,
        setSongs
    });
    const { setList, setCurrentPlaylistName } = useTrack();

    const loadNewPlaylist = () => {
        setCurrentPlaylistName(`${playlistId}`);
        setList(songs);
    };

    return (
        <View style={styles.container}>
            <FlashList
                data={songs}
                renderItem={({ item }) => (
                    <ListItem
                        playlist={playlistId}
                        loadNewPlaylist={loadNewPlaylist}
                        item={item}
                    />
                )}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    <Text style={styles.loader}>
                        {loading
                            ? "loading..."
                            : !hasMore
                            ? `•  ${playlistName}  •`
                            : "Somthing went wrong."}
                    </Text>
                }
                onEndReached={() => {
                    if (hasMore) setPage(prev => prev + 1);
                }}
                estimatedItemSize={80}
                contentContainerStyle={{ paddingTop: 10, paddingBottom: 150 }}
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
