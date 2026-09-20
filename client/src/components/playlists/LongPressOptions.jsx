import React, { useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Dimensions
} from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import Ionicons from "@react-native-vector-icons/ionicons/static";

import handleDelete from "@controllers/playlists/handleDeletePlaylist.js";
import { deleteDownloadedPlaylist } from "@services/downloads/downloadService.js";

const { width: vw } = Dimensions.get("window");

const SPRING_CONFIG = {
    damping: 20,
    stiffness: 200,
    mass: 0.8
};

const LongPressOptions = ({
    id,
    visible,
    onClose,
    isLocal,
    playlistName
}) => {
    const translateY = useSharedValue(300);
    const backdropOpacity = useSharedValue(0);

    const close = useCallback(() => {
        translateY.value = withTiming(300, { duration: 200 });
        backdropOpacity.value = withTiming(0, { duration: 200 }, () => {
            runOnJS(onClose)();
        });
    }, [onClose]);

    useEffect(() => {
        if (visible) {
            translateY.value = withSpring(0, SPRING_CONFIG);
            backdropOpacity.value = withTiming(1, { duration: 250 });
        }
    }, [visible]);

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }]
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value
    }));

    const handleDeletePress = () => {
        close();
        // Small delay to let close animation play before triggering delete
        setTimeout(() => {
            if (isLocal) {
                deleteDownloadedPlaylist(id);
            } else {
                handleDelete({ id });
            }
        }, 250);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={close}
        >
            {/* Blurred backdrop (non-interactive layer) */}
            <Animated.View
                style={[styles.backdrop, backdropStyle]}
                pointerEvents="none"
            >
                <BlurView
                    intensity={30}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>

            {/* Full-screen tap target to dismiss */}
            <TouchableOpacity
                style={styles.dismissArea}
                activeOpacity={1}
                onPress={close}
            >
                {/* Bottom sheet */}
                <Animated.View style={[styles.sheetContainer, sheetStyle]}>
                    <View
                        style={styles.sheet}
                        onStartShouldSetResponder={() => true}
                    >
                        {/* Drag handle */}
                        <View style={styles.handleBar} />

                        {/* Header */}
                        {playlistName && (
                            <View style={styles.header}>
                                <Ionicons
                                    name="musical-notes"
                                    size={20}
                                    color="#a0a0a0"
                                />
                                <Text
                                    style={styles.headerText}
                                    numberOfLines={1}
                                >
                                    {playlistName}
                                </Text>
                            </View>
                        )}

                        <View style={styles.divider} />

                        {/* Options */}
                        <TouchableOpacity
                            style={styles.option}
                            activeOpacity={0.6}
                            onPress={handleDeletePress}
                        >
                            <View
                                style={[
                                    styles.iconCircle,
                                    styles.deleteIconBg
                                ]}
                            >
                                <Ionicons
                                    name="trash-outline"
                                    size={20}
                                    color="#ff3b5c"
                                />
                            </View>
                            <Text
                                style={[styles.optionText, styles.deleteText]}
                            >
                                Delete Playlist
                            </Text>
                            <Ionicons
                                name="chevron-forward"
                                size={18}
                                color="#555"
                            />
                        </TouchableOpacity>

                        {/* Cancel button */}
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            activeOpacity={0.7}
                            onPress={close}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.4)"
    },
    dismissArea: {
        flex: 1,
        justifyContent: "flex-end"
    },
    sheetContainer: {
    },
    sheet: {
        backgroundColor: "#1a1a1a",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 10,
        paddingBottom: 40,
        paddingHorizontal: 20
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#555",
        alignSelf: "center",
        marginBottom: 16
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingBottom: 14
    },
    headerText: {
        color: "#e0e0e0",
        fontSize: vw * 0.045,
        fontWeight: "600",
        flex: 1
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: "#333",
        marginBottom: 8
    },
    option: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        gap: 14
    },
    iconCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: "center",
        alignItems: "center"
    },
    deleteIconBg: {
        backgroundColor: "rgba(255, 59, 92, 0.12)"
    },
    optionText: {
        color: "#e0e0e0",
        fontSize: 16,
        fontWeight: "500",
        flex: 1
    },
    deleteText: {
        color: "#ff3b5c"
    },
    cancelBtn: {
        marginTop: 12,
        backgroundColor: "#2a2a2a",
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center"
    },
    cancelText: {
        color: "#22f97e",
        fontSize: 16,
        fontWeight: "bold"
    }
});

export default LongPressOptions;
