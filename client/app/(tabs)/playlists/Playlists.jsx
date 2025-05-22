import { useState, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { FlashList } from "@shopify/flash-list";

import FloatingAdd from "../../../components/playlists/FloatingAdd.jsx";
import AddPlaylist from "../../../components/playlists/AddPlaylist.jsx";
import ListItem from "../../../components/playlists/ListItem.jsx";
import Header from "../../../components/ListHeader.jsx";

import * as storage from "../../../services/storage.js";
import useGetPlaylists from "../../../hooks/useGetPlaylists.js";
const savedPlaylists = storage.playlists;

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);
const limit = 25,
    HEADER_HEIGHT = 100;

const Playlists = () => {
    const [playlists, setPlaylists] = useState(savedPlaylists || []);
    const [isAddNewPlaylist, setIsAddNewPlaylist] = useState(false);
    const scrollY = useRef(new Animated.Value(0)).current;

    const { loading } = useGetPlaylists({ setPlaylists });

    return (
        <View style={styles.container}>
            <Header
                title="Playlists"
                scrollY={scrollY}
                containerStyles={{ height: 100 }}
            />
            <FlashList
                data={playlists}
                renderItem={({ item }) => (
                    <ListItem
                        item={item}
                        setPlaylists={setPlaylists}
                        setIsAddNewPlaylist={setIsAddNewPlaylist}
                    />
                )}
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
                contentContainerStyle={{
                    paddingTop: HEADER_HEIGHT,
                    paddingBottom: 150
                }}
            />

            {isAddNewPlaylist && (
                <AddPlaylist
                    setIsAddNewPlaylist={setIsAddNewPlaylist}
                    setPlaylists={setPlaylists}
                />
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
