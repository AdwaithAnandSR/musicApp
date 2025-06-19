import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useStatus } from "../../store/appState.store.js";

const { height: vh, width: vw } = Dimensions.get("window");

const activeLyricColor = "rgb(246,7,135)",
    iconSize = 15;

const OptionsContainer = ({ lyric1, lyric2 }) => {
    const showLyrics1 = useStatus(state => state.showLyrics1);
    const showLyrics2 = useStatus(state => state.showLyrics2);
    const setShowLyrics1 = useStatus(state => state.setShowLyrics1);
    const setShowLyrics2 = useStatus(state => state.setShowLyrics2);

    return (
        <View style={styles.optionsContainer}>
            {lyric1.length > 0 && (
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
                        style={[
                            styles.optionsText,
                            {
                                color: showLyrics1 ? activeLyricColor : "white"
                            }
                        ]}
                    >
                        lyric 1
                    </Text>
                </TouchableOpacity>
            )}

            {lyric2.length > 0 && (
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
                                color: showLyrics2 ? activeLyricColor : "white"
                            }
                        ]}
                    >
                        lyric 2
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    optionsContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: vw * 0.02,
        paddingHorizontal: vw * 0.075,
        minHeight: vh * 0.04
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
