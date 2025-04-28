import React from "react";
import {
    View,
    Text,
    Dimensions,
    TouchableOpacity,
    StyleSheet,
    Image
} from "react-native";
import LottieView from "lottie-react-native";
import { useAudioPlayerStatus } from "expo-audio";

import { useTrack } from "../context/track.context.js"

const { height: vh, width: vw } = Dimensions.get("window");

const ListItem = ({ item }) => {
    const { setTrack, togglePlay ,player, track} = useTrack();
    const {playing, isBuffering} = useAudioPlayerStatus(player)

    return (
        <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => setTrack(item)}
            style={styles.container}
        >
            <View style={styles.imageContainer}>
                <Image
                    source={
                        item.cover
                            ? { uri: item.cover }
                            : require("../assets/images/images.jpeg")
                    }
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                />
            </View>
            <Text numberOfLines={2} style={styles.title}>
                {item?.title}
            </Text>

            {track._id === item._id && (
                <LottieView
                    autoPlay
                    source={require("../assets/animations/musicPlayingAnim.json")}
                    loop={(isBuffering || playing) ? true : false}
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
