import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";

import { useGlobalSongs } from "../../store/list.store.js";
import handleDelete from "../../controllers/playlists/handleDeletePlaylist.js";

const LongPressOptions = ({ id, setShowOptions }) => {
    const deletePlaylist = useGlobalSongs(state=> state.deletePlaylist)
    
    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={()=> setShowOptions(false)} style={styles.btn}>
                <Text style={[styles.text, {color: "#1cf71c"}]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => handleDelete({ id, deletePlaylist })}
                style={styles.btn}
            >
                <Text style={[styles.text, {color: "#fd2249"}]}>Delete</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        right: "6%",
        flexDirection: "row",
        gap: 6,
    },
    btn: {
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#161616",
        paddingHorizontal: 13,
        paddingVertical: 8,
        borderRadius: 8
    },
    text: {
        color: "white",
        fontSize: 12,
    }
});

export default LongPressOptions;
