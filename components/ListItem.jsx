import React from "react";
import {
    View,
    Text,
    Dimensions,
    TouchableOpacity,
    StyleSheet,
    Image
} from "react-native";
// import { Image } from "expo-image";
import FastImage from "react-native-fast-image";
import LottieView from "lottie-react-native";
import TrackPlayer, {
    useActiveTrack,
    usePlaybackState,
    State
} from "react-native-track-player";

import jump from "../controllers/jumpTo.js";

const { height: vh, width: vw } = Dimensions.get("window");

const ListItem = ({ item }) => {
    const currTrack = useActiveTrack();
    const playbackState = usePlaybackState();

    return (
        <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => jump(item)}
            style={styles.container}
        >
            <View style={styles.imageContainer}>
                {
                    // <Image
                    //                 source={
                    //                     item.cover || require("../assets/images/images.jpeg")
                    //                 }
                    //                 style={{ width: "100%", height: "100%" }}
                    //                 contentFit="cover"
                    //             />
                }
                <FastImage
                    style={{ width: "100%", height: "100%" }}
                    source={
                        item.cover
                            ? {
                                  uri: item.cover,
                                  priority: FastImage.priority.normal
                              }
                            : require("../assets/images/images.jpeg")
                    }
                    resizeMode={FastImage.resizeMode.contain}
                />
            </View>
            <Text numberOfLines={2} style={styles.title}>
                {item?.title}
            </Text>

            {currTrack?._id === item?._id && (
                <LottieView
                    autoPlay
                    source={require("../assets/animations/musicPlayingAnim.json")}
                    loop={
                        playbackState.state === State.Playing ||
                        playbackState.state === State.Buffering
                            ? true
                            : false
                    }
                    style={{
                        width: 40,
                        height: 40,
                        marginLeft: -10
                    }}
                />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#080808",
        height: vh * 0.1,
        marginVertical: vh * 0.001,
        alignItems: "center",
        flexDirection: "row",
        gap: vw * 0.03,
        paddingHorizontal: vw * 0.02
    },
    imageContainer: {
        width: vh * 0.06,
        height: vh * 0.06,
        borderRadius: vh * 0.5,
        overflow: "hidden"
    },
    title: {
        color: "white",
        width: vw * 0.7,
        fontWeight: "bold"
    }
});

export default ListItem;
