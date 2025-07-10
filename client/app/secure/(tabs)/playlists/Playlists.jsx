import { useState, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { FlashList } from "@shopify/flash-list";

import FloatingAdd from "../../../../components/playlists/FloatingAdd.jsx";
import ListItem from "../../../../components/playlists/ListItem.jsx";
import Header from "../../../../components/ListHeader.jsx";

import { useGlobalSongs } from "../../../../store/list.store.js";
import useGetPlaylists from "../../../../hooks/useGetPlaylists.js";

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);
const HEADER_HEIGHT = 100;

const Playlists = () => {
    const playlists = useGlobalSongs(state => state.playlists);

    const scrollY = useRef(new Animated.Value(0)).current;

    const { loading } = useGetPlaylists();

    return (
        <View style={styles.container}>
            <Header
                title="Playlists"
                scrollY={scrollY}
                containerStyles={{ height: HEADER_HEIGHT }}
            />
            <AnimatedFlashList
                data={playlists}
                renderItem={({ item }) => <ListItem item={item} />}
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
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
            />

            <FloatingAdd />
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
