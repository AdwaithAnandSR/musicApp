import React, { memo } from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Animated
} from "react-native";
import Entypo from "@react-native-vector-icons/entypo/static";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

const { height: vh, width: vw } = Dimensions.get("window");
const CARD_HEIGHT = 150;
const CARD_MARGIN = 15;

const CreatePlaylistCard = ({ index = 0, scrollY }) => {
    // Header is approx 250px
    const itemOffset = 250 + (CARD_HEIGHT + CARD_MARGIN) * index;
    const translateY = scrollY ? scrollY.interpolate({
        inputRange: [itemOffset - vh, itemOffset + CARD_HEIGHT],
        outputRange: [-35, 35],
        extrapolate: 'clamp'
    }) : 0;

    const handlePress = () => {
        Haptics.impactAsync("light");
        router.push('secure/others/AddPlaylist');
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={styles.cardContainer}
            activeOpacity={0.8}
        >
            <View style={styles.imageContainer}>
                {/* Simulated parallax background for consistency */}
                <Animated.View style={[styles.parallaxBackground, { transform: [{ translateY }] }]}>
                    <View style={styles.gradientOverlay} />
                </Animated.View>
                
                <View style={styles.content}>
                    <View style={styles.iconCircle}>
                        <Entypo name="plus" size={36} color="#f60787" />
                    </View>
                    <Text style={styles.name}>Create New Playlist</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        height: CARD_HEIGHT,
        marginHorizontal: vw * 0.05,
        marginBottom: CARD_MARGIN,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: "#161616", // Slightly different background to stand out
        borderWidth: 1.5,
        borderColor: "rgba(246,7,135,0.4)",
        borderStyle: "dashed",
    },
    imageContainer: {
        width: "100%",
        height: "100%",
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center"
    },
    parallaxBackground: {
        width: "100%",
        height: CARD_HEIGHT + 70, 
        position: "absolute",
        top: -35,
        backgroundColor: "rgba(246,7,135,0.03)",
    },
    gradientOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.2)"
    },
    content: {
        alignItems: "center",
        justifyContent: "center",
        gap: 12
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "rgba(246,7,135,0.15)",
        justifyContent: "center",
        alignItems: "center"
    },
    name: {
        color: "white",
        fontSize: vw * 0.045,
        fontWeight: "bold",
        letterSpacing: 0.5
    }
});

export default memo(CreatePlaylistCard);
