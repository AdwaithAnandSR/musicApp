import {
    View,
    Text,
    Dimensions,
    TouchableOpacity,
    StyleSheet,
    Image
} from "react-native";
import * as Haptics from 'expo-haptics';

import { useAppStatus } from "../store/appState.store.js";
import removeSong from "../controllers/playlists/removeSong.js"

const PopUpOptions = () => {
    const options = useAppStatus(state => state.popUpOption);
    if (!options.songId || options.y === -1 || !options.playId) return null;
    
    Haptics.selectionAsync();
    
    return (
        <View style={[styles.container, { top: options.y }]}>
            <TouchableOpacity
                style={styles.item}
                onPress={() => removeSong(options)}
            >
                <Text style={styles.itemText}>Remove</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.item}>
                <Text style={styles.itemText}>Add To Playlist</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        minWidth: 130,
        borderRadius: 22,
        overflow: "hidden",
        backgroundColor: "#0f0f0f",
        position: "absolute",
        zIndex: 99,
        right: 20,
        paddingHorizontal: 26,
        paddintVertical: 10
    },
    item: {
        height: 40,
        justifyContent: "center",
        alignItems: "center"
    },
    itemText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16
    }
});

export default PopUpOptions;
