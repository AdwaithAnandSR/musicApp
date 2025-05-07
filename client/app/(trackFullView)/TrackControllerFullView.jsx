import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Image
} from "react-native";
import { Entypo } from "@expo/vector-icons";
import { getColors } from "react-native-image-colors";
import { router } from "expo-router";

import { useTrack } from "../../context/track.context.js";

import Controllers from "../../components/ControllersContainer.jsx";
import SliderContainer from "../../components/SliderContainer.jsx";

const { height: vh, width: vw } = Dimensions.get("window");

const TrackControllerFullView = ({}) => {
    const [colors, setColors] = useState(null);
    const { track } = useTrack();

    useEffect(() => {
        if (track && track.cover) {
            getColors(track?.cover, {
                fallback: "#228B22",
                cache: true,
                key: track._id
            }).then(setColors);
        }
    }, [track]);

    return (
        <View style={[styles.container]}>
            {/* navbar */}
            <View style={styles.navbar}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Entypo name="chevron-down" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity>
                    <Entypo
                        name="dots-three-vertical"
                        size={24}
                        color="white"
                    />
                </TouchableOpacity>
            </View>
            {/* title */}
            <View style={{ height: vh * 0.125, justifyContent: "center" }}>
                <Text numberOfLines={2} style={styles.title}>
                    {track?.title}
                </Text>
            </View>
            {/* image */}
            <View
                style={[
                    styles.imageContainer,
                    { shadowColor: colors?.lightVibrant || "#32ffd4" }
                ]}
            >
                <Image
                    source={
                        track?.cover
                            ? { uri: track.cover }
                            : require("../../assets/images/images.jpeg")
                    }
                    defaultSource={require("../../assets/images/images.jpeg")}
                    contentFit="cover"
                    filter="contrast(1.25) brightness(0.8)"
                    style={{ width: "100%", height: "100%" }}
                />
            </View>
            {/* slider */}

            <SliderContainer lightVibrant={colors?.lightVibrant} />

            {/* controllers */}
            <Controllers />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000000"
    },
    navbar: {
        width: "100%",
        height: "10%",
        justifyContent: "flex-end",
        flexDirection: "row",
        alignItems: "flex-end",
        paddingHorizontal: vw * 0.04,
        gap: vw * 0.05
    },
    title: {
        color: "white",
        fontSize: vw * 0.045,
        fontWeight: "bold",
        alignSelf: "center",
        width: "80%",
        textAlign: "center"
    },
    imageContainer: {
        width: vw * 0.85,
        height: vw * 0.85,
        borderRadius: vw * 0.1,
        overflow: "hidden",
        alignSelf: "center",
        marginTop: vh * 0.02,
        marginBottom: vh * 0.04,
        shadowOpacity: 1,
        elevation: 80
    }
});

export default React.memo(TrackControllerFullView);
