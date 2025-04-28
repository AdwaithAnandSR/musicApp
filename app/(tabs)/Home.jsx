import { View, Text, StyleSheet, Dimensions } from "react-native";
import { FlashList } from "@shopify/flash-list";

import { useLists } from "../../context/list.context.js";

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

    return (
        <View style={{ backgroundColor: "black", height: "100%" }}>
            <FlashList
                data={allSongs}
                renderItem={({ item }) => <ListItem item={item} />}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    <Text
                        style={{
                            color: "white",
                            alignSelf: "center",
                            marginVertical: 10
                        }}
                    >
                        {loading
                            ? "loading..."
                                ? !hasMore
                                : "no more songs"
                            : "no songs."}
                    </Text>
                }
                onEndReached={() => {
                    if (hasMore) setPage(prev => prev + 1);
                }}
                estimatedItemSize={vh * 0.95 || 100}
            />
        </View>
    );
};

export default Home;
