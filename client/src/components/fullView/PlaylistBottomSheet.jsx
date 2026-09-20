import { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Pressable,
    BackHandler
} from "react-native";
import Animated, {
    useAnimatedStyle,
    withTiming,
    runOnJS,
    useAnimatedReaction,
    interpolate,
    Extrapolation
} from "react-native-reanimated";
import { ScrollView } from "react-native-gesture-handler";
import Ionicons from "@react-native-vector-icons/ionicons/static";

import { usePlayer } from "@store/player.js";
import queryClient from "@services/queryClient";
import addSongsToPlaylist from "@controllers/playlists/addSongsToPlaylist.js";

const { height: vh, width: vw } = Dimensions.get("window");

const PLAYLIST_CLOSED_Y = vh * 0.7;
const OPEN_THRESHOLD = vh * 0.65;

const MenuItem = ({ label, onPress }) => (
    <TouchableOpacity
        onPress={onPress}
        style={styles.menuItem}
        activeOpacity={0.7}
    >
        <View style={styles.iconContainer}>
            <Ionicons name="musical-notes" size={24} color="#fff" />
        </View>
        <Text style={styles.menuText} numberOfLines={1}>
            {label}
        </Text>
    </TouchableOpacity>
);

const PlaylistBottomSheet = ({ playlistTranslateY, closeSheet }) => {
    const track = usePlayer(state => state.currentTrack);
    const [isOpen, setIsOpen] = useState(false);

    useAnimatedReaction(
        () => playlistTranslateY.value < OPEN_THRESHOLD,
        (isOpenNow, wasOpen) => {
            if (isOpenNow !== wasOpen) {
                runOnJS(setIsOpen)(isOpenNow);
            }
        },
        [playlistTranslateY]
    );

    const playlists = (
        queryClient
            .getQueryData(["playlists"])
            ?.pages.flatMap(page => page.playlists) || []
    ).filter(item => {
        const name = item?.name?.toLowerCase()?.trim();
        const id = (item?._id || item?.id || "")?.toString()?.toLowerCase();
        return (
            name !== "recently added" &&
            name !== "recently-added" &&
            name !== "recentlyadded" &&
            id !== "recently-added" &&
            id !== "recently_added" &&
            id !== "recentlyadded"
        );
    });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: playlistTranslateY.value }]
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            playlistTranslateY.value,
            [0, PLAYLIST_CLOSED_Y],
            [0.6, 0],
            Extrapolation.CLAMP
        )
    }));

    const handleAdd = item => {
        addSongsToPlaylist({
            id: item._id || item.id,
            selectedSongs: [track],
            reset: () => {
                playlistTranslateY.value = withTiming(
                    PLAYLIST_CLOSED_Y,
                    { duration: 200 },
                    finished => {
                        if (finished) {
                            if (closeSheet) runOnJS(closeSheet)();
                        }
                    }
                );
            }
        });
    };

    const handleClose = () => {
        playlistTranslateY.value = withTiming(
            PLAYLIST_CLOSED_Y,
            { duration: 200 },
            finished => {
                if (finished && closeSheet) runOnJS(closeSheet)();
            }
        );
    };

    useEffect(() => {
        const onBackPress = () => {
            if (isOpen) {
                handleClose();
                return true;
            }
            return false;
        };

        const subscription = BackHandler.addEventListener(
            "hardwareBackPress",
            onBackPress
        );
        return () => subscription.remove();
    }, [isOpen]);

    return (
        <>
            {isOpen && (
                <Animated.View style={[styles.backdrop, backdropStyle]}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={handleClose}
                    />
                </Animated.View>
            )}
            <Animated.View style={[styles.bottomSheet, animatedStyle]}>
                <View style={styles.handleContainer}>
                    <View style={styles.handle} />
                    <Text style={styles.headerTitle}>Add to Playlist</Text>
                </View>
                <ScrollView
                    style={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    bounces={true}
                >
                    {playlists.length > 0 ? (
                        playlists.map((item, index) => (
                            <MenuItem
                                key={item._id || item.id || `${index}`}
                                label={item.name}
                                onPress={() => handleAdd(item)}
                            />
                        ))
                    ) : (
                        <Text style={styles.emptyText}>No playlists found</Text>
                    )}
                </ScrollView>
            </Animated.View>
        </>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "black",
        zIndex: 90
    },
    bottomSheet: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: PLAYLIST_CLOSED_Y,
        backgroundColor: "#000000e0",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: 16,
        paddingHorizontal: vw * 0.05,
        zIndex: 100
    },
    handleContainer: {
        alignItems: "center",
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255, 255, 255, 0.05)",
        marginBottom: 16
    },
    handle: {
        width: 48,
        height: 5,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: 3,
        marginBottom: 16
    },
    headerTitle: {
        color: "white",
        fontSize: 18,
        fontWeight: "700",
        letterSpacing: 0.3
    },
    scrollContainer: {
        flex: 1
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 12,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderRadius: 16
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16
    },
    menuText: {
        color: "#f8fafc",
        fontWeight: "600",
        fontSize: 16,
        flex: 1
    },
    emptyText: {
        color: "#94a3b8",
        fontSize: 15,
        textAlign: "center",
        paddingVertical: 40,
        fontWeight: "500"
    }
});

export default PlaylistBottomSheet;
