import { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity
} from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";

import { useStatus } from "../../store/appState.store.js";
import { useTrack } from "../../store/track.store.js";

const { height: vh, width: vw } = Dimensions.get("window");

const activeLyricColor = "rgb(246,7,135)",
    iconSize = 12;

const OptionsContainer = () => {
    const [artistIndex, setArtistIndex] = useState(0);

    const showLyrics1 = useStatus(state => state.showLyrics1);
    const showLyrics2 = useStatus(state => state.showLyrics2);
    const showSyncedLyric = useStatus(state => state.showSyncedLyric);
    const setShowLyrics1 = useStatus(state => state.setShowLyrics1);
    const setShowLyrics2 = useStatus(state => state.setShowLyrics2);
    const setShowSyncedLyric = useStatus(state => state.setShowSyncedLyric);
    const track = useTrack(state => state.track);

    const artists = track?.artist?.split(",") || [];

    console.log(track.artist);

    const handleShowArtist = () => {
        if (artistIndex < artists?.length - 1) {
            setArtistIndex(prev => prev + 1);
        } else setArtistIndex(0);
    };

    return (
        <View style={styles.optionsContainer}>
            <View style={styles.left}>
                {!track?.artist || track?.artist?.toLowerCase() != "unknown" && (
                    <TouchableOpacity
                        onPress={handleShowArtist}
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
                            {artists[artistIndex]?.trim()}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.right}>
                {track?.synced && showLyrics1 && (
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

                {track?.lyrics?.length > 0 && (
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
                            {"Lyric 1"}
                        </Text>
                    </TouchableOpacity>
                )}

                {track?.lyricsAsText?.length > 0 && (
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
                            {"lyric 2"}
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
        minHeight: vh * 0.05
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
