import { View, Text, StyleSheet, Animated } from "react-native";

import { useStatus } from "../../store/appState.store.js";

const LyricRenderItem = ({ item, index }) => {
    const showSyncedLyric = useStatus(state => state.showSyncedLyric);
    const  currentLyricIndex = useStatus(state => state.currentLyricIndex);

    console.log(item)

    return (
        <View style={styles.container}>
            <Animated.Text
                style={[
                    styles.lyricText,
                    {
                        color:
                            currentLyricIndex == index -1 && showSyncedLyric
                                ? "rgb(246,7,135)"
                                : "white"
                    }
                ]}
            >
                {item.line}
            </Animated.Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
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

export default LyricRenderItem;
