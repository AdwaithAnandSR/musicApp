import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { FlashList } from "@shopify/flash-list";

import { useStatus } from "../../store/appState.store.js";
const { height: vh, width: vw } = Dimensions.get("window");

const RenderItem = ({ item }) => (
    <View style={styles.lyricTextCont}>
        <Text style={styles.lyricText}>{item}</Text>
    </View>
);

const LyricsView = ({ track }) => {
    const showLyrics1 = useStatus(state => state.showLyrics1);
    const showLyrics2 = useStatus(state => state.showLyrics2);
    const setShowLyrics1 = useStatus(state => state.setShowLyrics1);
    const setShowLyrics2 = useStatus(state => state.setShowLyrics2);

    return (
        <View style={styles.container}>
            <FlashList
                data={
                    showLyrics1
                        ? ["", ...track.lyricsAsText1, ""]
                        : setShowLyrics2
                        ? ["", ...track.lyricsAsText2, ""]
                        : []
                }
                estimatedItemSize={100}
                showsVerticalScrollIndicator={false}
                keyExtractor={(item, index) => `${item.id}+${index}`}
                renderItem={({ item }) => <RenderItem item={item} />}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        height: "100%",
        position: "absolute",
        zIndex: 9999,
        top: "50%",
        left: "50%",
        transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
        backgroundColor: "#000000cd",
        paddingHorizontal: "2%"
    },
    lyricTextCont: {
        width: "100%",
        height: 100,
        justifyContent: "center"
    },
    lyricText: {
        color: "white",
        textAlign: "center",
        fontWeight: "bold",
        fontSize: 28
    }
});

export default LyricsView;
