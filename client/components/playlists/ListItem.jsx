import { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Image
} from "react-native";
import { Entypo } from "@expo/vector-icons";
import { router } from "expo-router";

import { useAppState } from "../../context/appState.context.js";
import addSongsToPlaylist from "../../controllers/addSongsToPlaylist.js";
import LongPressOptions from "./LongPressOptions.jsx";

const { height: vh, width: vw } = Dimensions.get("window");

const ListItem = ({ item, setIsAddNewPlaylist, setPlaylists }) => {
    const { isSelecting, selectedSongs, setSelectedSongs, setIsSelecting } =
        useAppState();
    const [showOptions, setShowOptions] = useState(false);

    const handleLongPress = e => {
        setShowOptions(true);
    };

    return (
        <TouchableOpacity
            onPress={() => router.push(`playlists/${item._id}/PlaylistSongs`)}
            onLongPress={handleLongPress}
            style={styles.container}
        >
            <View style={styles.ImgNameCont}>
                <View style={styles.imageContainer}>
                    <Image
                        source={
                            item.cover
                                ? { uri: item.cover }
                                : require("../../assets/images/DefaultImage.jpeg")
                        }
                        defaultSource={require("../../assets/images/DefaultImage.jpeg")}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                    />
                </View>
                <Text style={styles.name}>{item?.name}</Text>
            </View>
            {isSelecting && (
                <TouchableOpacity
                    onPress={() =>
                        addSongsToPlaylist({
                            id: item._id,
                            selectedSongs,
                            setSelectedSongs,
                            setIsAddNewPlaylist,
                            setIsSelecting
                        })
                    }
                    style={styles.btn}
                >
                    <Entypo name="plus" size={15} color="white" />
                    <Text style={styles.text}>Add</Text>
                </TouchableOpacity>
            )}
            {showOptions && (
                <LongPressOptions id={item?._id} setShowOptions={setShowOptions} setPlaylists={setPlaylists} />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        height: vh * 0.09,
        paddingHorizontal: vw * 0.05,
        alignItems: "center",
        justifyContent: "space-between",
        flexDirection: "row"
    },
    ImgNameCont: {
        flexDirection: "row",
        alignItems: "center",
        gap: vw * 0.03
    },
    imageContainer: {
        width: vh * 0.06,
        height: vh * 0.06,
        borderRadius: vh * 0.5,
        overflow: "hidden"
    },
    name: {
        color: "white",
        fontSize: vw * 0.045,
        fontWeight: "bold"
    },
    btn: {
        padding: vw * 0.02,
        backgroundColor: "#22f97e",
        borderRadius: vw * 0.05,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        gap: vw * 0.01
    },
    text: {
        color: "white",
        fontWeight: "bold",
        fontSize: vw * 0.03
    }
});

export default ListItem;
