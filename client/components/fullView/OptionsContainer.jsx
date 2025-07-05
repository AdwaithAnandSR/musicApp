import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity
} from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";

import { useStatus } from "../../store/appState.store.js";

const { height: vh, width: vw } = Dimensions.get("window");

const activeLyricColor = "rgb(246,7,135)",
    iconSize = 12;

const OptionsContainer = ({
    lyric1,
    lyric2,
    isSynced,
    syncedLyric,
    artist
}) => {
    const showLyrics1 = useStatus(state => state.showLyrics1);
    const showLyrics2 = useStatus(state => state.showLyrics2);
    const showSyncedLyric = useStatus(state => state.showSyncedLyric);
    const setShowLyrics1 = useStatus(state => state.setShowLyrics1);
    const setShowLyrics2 = useStatus(state => state.setShowLyrics2);
    const setShowSyncedLyric = useStatus(state => state.setShowSyncedLyric);

    return (
        <View style={styles.optionsContainer}>
            <View style={styles.left}>
                {artist && artist.toLowerCase() != "unknown" && (
                    <TouchableOpacity
                        style={[
                            styles.options,
                            { borderColor: activeLyricColor }
                        ]}
                    >
                        <Feather
                            name="user"
                            size={15}
                            color={activeLyricColor}
                        />
                        <Text
                            adjustsFontSizeToFit
                            numberOfLines={1}
                            style={[
                                styles.optionsText,
                                { color: activeLyricColor }
                            ]}
                        >
                            {artist}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.right}>
                {isSynced && showLyrics1 && (
                    <TouchableOpacity
                        onPress={setShowSyncedLyric}
                        style={[
                            styles.options,
                            {
                                borderColor: showSyncedLyric
                                    ? activeLyricColor
                                    : "white"
                            }
                        ]}
                    >
                        <MaterialCommunityIcons
                            name="music-circle"
                            size={iconSize}
                            color={showSyncedLyric ? activeLyricColor : "white"}
                        />
                        <Text
                            adjustsFontSizeToFit
                            numberOfLines={1}
                            style={[
                                styles.optionsText,
                                {
                                    color: showSyncedLyric
                                        ? activeLyricColor
                                        : "white"
                                }
                            ]}
                        >
                            sync
                        </Text>
                    </TouchableOpacity>
                )}

                {lyric1?.length > 0 && (
                    <TouchableOpacity
                        onPress={setShowLyrics1}
                        style={[
                            styles.options,
                            {
                                borderColor: showLyrics1
                                    ? activeLyricColor
                                    : "white"
                            }
                        ]}
                    >
                        <MaterialCommunityIcons
                            name="music-circle"
                            size={iconSize}
                            color={showLyrics1 ? activeLyricColor : "white"}
                        />
                        <Text
                            adjustsFontSizeToFit
                            numberOfLines={1}
                            style={[
                                styles.optionsText,
                                {
                                    color: showLyrics1
                                        ? activeLyricColor
                                        : "white"
                                }
                            ]}
                        >
                            lyric 1
                        </Text>
                    </TouchableOpacity>
                )}

                {lyric2?.length > 0 && (
                    <TouchableOpacity
                        onPress={setShowLyrics2}
                        style={[
                            styles.options,
                            {
                                borderColor: showLyrics2
                                    ? activeLyricColor
                                    : "white"
                            }
                        ]}
                    >
                        <MaterialCommunityIcons
                            name="music-circle"
                            size={iconSize}
                            color={showLyrics2 ? activeLyricColor : "white"}
                        />
                        <Text
                            style={[
                                styles.optionsText,
                                {
                                    color: showLyrics2
                                        ? activeLyricColor
                                        : "white"
                                }
                            ]}
                        >
                            lyric 2
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    optionsContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: vw * 0.075,
        minHeight: vh * 0.04
    },
    right: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: vw * 0.03
    },
    options: {
        paddingHorizontal: vw * 0.02,
        paddingVertical: vh * 0.004,
        borderWidth: 1,
        borderRadius: 22,
        flexDirection: "row",
        alignItems: "center",
        gap: 3
    },
    optionsText: {
        color: "white",
        fontSize: 11,
        fontWeight: 600
    }
});

export default OptionsContainer;
