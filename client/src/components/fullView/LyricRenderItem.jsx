import { TouchableOpacity, Text, StyleSheet } from "react-native";

import { useStatus } from "../../store/appState.store.js";
import { usePlayer } from "../../store/player.js";

const LyricRenderItem = ({ item, index }) => {
    const showSyncedLyric = useStatus(state => state.showSyncedLyric);
    const currentLyricIndex = useStatus(state => state.currentLyricIndex);
    const seekTo = usePlayer(state => state.seekTo);

    const handleSeek = () => {
        if (typeof item?.start === "number") {
            seekTo(item.start);
        }
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={handleSeek}
            activeOpacity={0.7}
        >
            <Text
                style={[
                    styles.lyricText,
                    {
                        color:
                            currentLyricIndex === index - 1 && showSyncedLyric
                                ? "rgb(246,7,135)"
                                : "white"
                    }
                ]}
            >
                {item.line}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        paddingVertical: 20,
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
