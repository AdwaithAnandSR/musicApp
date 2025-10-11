import { memo, useState, useEffect } from "react";
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    Animated,
    View
} from "react-native";

import { useMultiSelect } from "../store/appState.store.js";
import { usePlayerStore } from "../store/player.store.js";

const HEADER_HEIGHT = 250;
const MIN_HEADER_HEIGHT = HEADER_HEIGHT - 80;

const Header = ({
    title,
    containerStyles,
    total,
    scrollY,
    scrollToMiddle,
    ID
}) => {
    const translateY = scrollY?.interpolate({
        inputRange: [0, MIN_HEADER_HEIGHT],
        outputRange: [0, -MIN_HEADER_HEIGHT],
        extrapolate: "clamp"
    });

    const selectedSongs = useMultiSelect(state => state.selectedSongs);

    const handleShortPress = () => {
        const index = usePlayerStore
            .getState()
            .playlists[ID].findIndex(
                item => item.id === usePlayerStore.getState().currentTrackId
            );
        if (index != -1) scrollToMiddle(index);
    };
    
    const handleLongPress = ()=> scrollToMiddle(0);
    
    return (
        <Animated.View
            style={[
                styles.header,
                containerStyles,
                {
                    transform: [{ translateY }],
                    marginTop: selectedSongs?.length > 0 ? 23 : 0
                }
            ]}
        >
            <TouchableOpacity
                activeOpacity={0.3}
                style={styles.textCont}
                onPress={handleShortPress}
                onLongPress={handleLongPress}
            >
                <Animated.Text style={[styles.headerText]}>
                    {title}
                </Animated.Text>
                {total > -1 && <Text style={styles.headerText2}>{total}</Text>}
            </TouchableOpacity>
            {selectedSongs?.length > 0 && (
                <TouchableOpacity
                    onLongPress={() => useMultiSelect.getState().reset()}
                    activeOpacity={0.3}
                >
                    <Text style={styles.selectedText}>
                        Selected: {selectedSongs?.length}
                    </Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    header: {
        overflow: "hidden",
        paddingBottom: 5,
        paddingHorizontal: 13,
        justifyContent: "flex-end",
        position: "absolute",
        alignSelf: "flex-start",
        top: 0,
        width: "100%",
        zIndex: 1
    },

    textCont: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        gap: 20,
        width: "100%"
    },
    headerText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 50,
        letterSpacing: -2,
        textShadowColor: "rgba(0,0,0,1)",
        textShadowOffset: { width: 3, height: 3 },
        textShadowRadius: 5
    },
    headerText2: {
        color: "white",
        fontWeight: "bold",
        fontSize: 20,
        opacity: 0.7,
        letterSpacing: -2,
        alignSelf: "center"
    },
    selectedText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 20,
        letterSpacing: -2,
        paddingLeft: 13
    }
});

export default Header;
