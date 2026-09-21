import { View, Text, StyleSheet, Dimensions } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { usePlayer } from "@store/player";

const { height: vh, width: vw } = Dimensions.get("window");

const TrackTitle = () => {
    const title = usePlayer(state => state.currentTrack?.title);
    const videoUrl = usePlayer(state => state.currentTrack?.videoUrl);

    return (
        <View style={styles.titleWrapper}>
            <View style={styles.titleRow}>
                {videoUrl ? (
                    <Ionicons
                        name="videocam"
                        size={vw * 0.04}
                        color="rgba(255,255,255,0.7)"
                        style={styles.videoIcon}
                    />
                ) : null}
                <Text numberOfLines={2} style={styles.title}>
                    {title}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    titleWrapper: {
        minHeight: vh * 0.08,
        justifyContent: "center"
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        width: "80%",
        alignSelf: "center",
        marginTop: vh * 0.03,
        gap: vw * 0.015
    },
    title: {
        color: "white",
        fontSize: vw * 0.045,
        fontWeight: "bold",
        textAlign: "center",
        flexShrink: 1
    },
    videoIcon: {
        marginTop: 1
    }
});

export default TrackTitle;

