
import {
    View,
    Text,
    Dimensions,
    TouchableOpacity,
    StyleSheet
} from "react-native";
import { Image } from "expo-image";
import LottieView from "lottie-react-native";

import { useTrack, useQueueManager } from "../store/track.store.js";
import { useMultiSelect, useStatus } from "../store/appState.store.js";

const { height: vh, width: vw } = Dimensions.get("window");
const blurhash =
    "|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[";

const ListItem = ({ item, LoadQueue, ID }) => {
    const updateTrack = useTrack(state => state.update);
    const isCurrent = useTrack(state => state.track?._id === item._id);
    const queueId = useQueueManager(state => state.id);
    const updateQueueId = useQueueManager(state => state.updateId);
    const updateQueueIndex = useQueueManager(state => state.updateCurrentIndex);
    const loadQueue = useQueueManager(state => state.loadQueue);
    const updateSelected = useMultiSelect(state => state.updateSelectedSongs);
    const isSelecting = useMultiSelect(state => state.selectedSongs.length > 0);
    const isSelected = useMultiSelect(state =>
        state.selectedSongs.some(song => song._id === item._id)
    );
    const resetShowLyrics = useStatus(state => state.resetShowLyrics);

    if (!item?.url) return;

    const handleShortPress = () => {
        if (!isSelecting) {
            resetShowLyrics();
            if (queueId === ID) updateTrack(item);
            else {
                if (LoadQueue?.length > 0) {
                    loadQueue(LoadQueue || []);
                    updateQueueId(ID);
                    const index = (LoadQueue || []).findIndex(
                        song => song._id === item._id
                    );
                    updateQueueIndex(index > -1 ? index : 0);
                    updateTrack(item);
                }
            }
        } else {
            updateSelected(item);
        }
    };

    return (
        <TouchableOpacity
            activeOpacity={0.6}
            onPress={handleShortPress}
            onLongPress={() => updateSelected(item)}
            style={styles.container}
        >
            {isSelected && (
                <View style={styles.checkBoxContainer}>
                    <Text
                        style={{
                            color: "rgb(246,7,135)"
                        }}
                    >
                        ✓
                    </Text>
                </View>
            )}

            <View style={styles.imageContainer}>
                <Image
                    source={
                        item.cover || require("../assets/images/images.jpeg")
                    }
                    placeholder={{ blurhash }}
                    contentFit="cover"
                    transition={1000}
                    style={{ width: "100%", height: "100%" }}
                />
            </View>
            <Text
                numberOfLines={2}
                style={[
                    styles.title,
                    isCurrent ? { color: "rgb(246,7,135)" } : null
                ]}
            >
                {item.title}
            </Text>

            {isCurrent && (
                <LottieView
                    autoPlay
                    source={require("../assets/animations/musicPlayingAnim.json")}
                    loop={true}
                    style={{
                        width: 40,
                        height: 40,
                        marginLeft: -10,
                        color: "rgb(246,7,135)"
                    }}
                />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#070707",
        height: 80,
        alignItems: "center",
        flexDirection: "row",
        gap: vw * 0.03,
        paddingHorizontal: vw * 0.02
    },
    checkBoxContainer: {
        marginLeft: 10
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

export default ListItem
