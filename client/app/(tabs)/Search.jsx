import { View, Text, StyleSheet, TextInput, Dimensions } from "react-native";
import React, { useState, useMemo } from "react";
import { FlashList } from "@shopify/flash-list";
import ListItem from "../../components/ListItem.jsx";

import useSearch from "../../hooks/useSearch.js";
import { useTrack } from "../../context/track.context.js";

const { height: vh, width: vw } = Dimensions.get("window");

const Search = () => {
    const [text, setText] = useState();
    const { songs, setSongs } = useSearch({ text });

    const { setList, setCurrentPlaylistName } = useTrack();

    const loadNewPlaylist = () => {
        setCurrentPlaylistName("allSongs");
        setList(songs);
    };

    const listHeader = useMemo(
        () => (
            <View>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search Song"
                    placeholderTextColor="white"
                    value={text}
                    onChangeText={setText}
                />
                <Text>Search</Text>
            </View>
        ),
        [text]
    );

    return (
        <View style={styles.container}>
            <FlashList
                data={songs}
                estimatedItemSize={vh * 0.95 || 100}
                ListHeaderComponent={listHeader}
                renderItem={({ item }) => (
                    <ListItem
                        playlist={"searchSongs"}
                        loadNewPlaylist={loadNewPlaylist}
                        item={item}
                    />
                )}
                contentContainerStyle={{ paddingTop: 10, paddingBottom: 150 }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "black",
        position: "relative",
        top: 0,
        paddingTop: 25
    },
    searchInput: {
        width: vw * 0.9,
        height: vh * 0.05,
        color: "white",
        fontWeight: 900,
        backgroundColor: "rgb(66, 66, 66)",
        borderRadius: vw * 0.04,
        fontSize: 17,
        paddingHorizontal: vw * 0.03,
        marginHorizontal: "auto",
        marginTop: vh * 0.01
    }
});

export default Search;
