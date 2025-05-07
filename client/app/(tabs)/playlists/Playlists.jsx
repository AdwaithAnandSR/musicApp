import { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";

import FloatingAdd from "../../../components/playlists/FloatingAdd.jsx";
import AddPlaylist from "../../../components/playlists/AddPlaylist.jsx";
import ListItem from "../../../components/playlists/ListItem.jsx";


import useGetPlaylists from "../../../hooks/useGetPlaylists.js";

const Playlists = () => {
    const [playlists, setPlaylists] = useState([]);
    const [isAddNewPlaylist, setIsAddNewPlaylist] = useState(false);

    const { loading } = useGetPlaylists({ setPlaylists });

    return (
        <View style={styles.container}>
            <FlashList
                data={playlists}
                renderItem={({ item }) => <ListItem item={item} setIsAddNewPlaylist={setIsAddNewPlaylist} />}
                ListEmptyComponent={
                    <Text
                        style={{
                            color: "white",
                            textAlign: "center",
                            marginTop: 10
                        }}
                    >
                        {loading ? "loading..." : "no playlists."}
                    </Text>
                }
                estimatedItemSize={80}
                contentContainerStyle={{ paddingTop: 10, paddingBottom: 150 }}
            />

            {isAddNewPlaylist && (
                <AddPlaylist setIsAddNewPlaylist={setIsAddNewPlaylist} />
            )}

            {!isAddNewPlaylist && (
                <FloatingAdd handlePress={() => setIsAddNewPlaylist(true)} />
            )}
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
