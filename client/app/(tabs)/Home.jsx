import { View, Text, StyleSheet, Dimensions } from "react-native";
import { FlashList } from "@shopify/flash-list";

import { useLists } from "../../context/list.context.js";
import { useTrack } from "../../context/track.context.js";

import useGetAllSongs from "../../hooks/useGetAllSongs.js";
import ListItem from "../../components/ListItem.jsx";

const { height: vh, width: vw } = Dimensions.get("window");

const Home = () => {
    const LIMIT = 25;

    const {
        allSongs,
        setAllSongs,
        allSongsPage: page,
        setAllSongsPage: setPage
    } = useLists();

    const { loading, hasMore } = useGetAllSongs({
        setAllSongs,
        page,
        limit: LIMIT
    });
    
    const { setList, setCurrentPlaylistName } = useTrack();

    const loadNewPlaylist = () => {
        setCurrentPlaylistName("allSongs");
        setList(allSongs);
    };

    return (
        <View style={{ backgroundColor: "black", height: "100%" }}>
            <FlashList
                data={allSongs}
                renderItem={({ item }) => (
                    <ListItem
                        playlist={"allSongs"}
                        loadNewPlaylist={loadNewPlaylist}
                        item={item}
                    />
                )}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    <Text
                        style={{
                            color: "white",
                            textAlign: "center",
                            marginTop: 10
                        }}
                    >
                        {loading
                            ? "loading..."
                            : !hasMore
                            ? "no more songs."
                            : ""}
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

export default Home;
