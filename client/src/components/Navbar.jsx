import React, { useState } from "react";
import {
    View,
    Text,
    Dimensions,
    TouchableOpacity,
    StyleSheet
} from "react-native";
import { Entypo, Ionicons } from "@expo/vector-icons";

import { useMultiSelect, useAppStatus } from "../store/appState.store.js";
import DestinationPickerModal from "./playlists/DestinationPickerModal.jsx";
import Toast from "../services/Toast.js";

const { height: vh, width: vw } = Dimensions.get("window");

const Navbar = () => {
    const isSelecting = useMultiSelect(
        state => state.selectedSongs?.length > 0
    );
    const reset = useMultiSelect(state => state.reset);
    const selectedSongsLen = useMultiSelect(
        state => state.selectedSongs?.length
    );
    const selectedSongs = useMultiSelect(state => state.selectedSongs);
    const currentSelectedPlaylist = useAppStatus(state => state.currentSelectedPlaylist);
    
    const [modalVisible, setModalVisible] = useState(false);

    if (!isSelecting) return null;

    const handleDownloadSubmit = async (playlistName, concurrency) => {
        const { downloadPlaylistSongs } = require("../services/downloads/downloadService.js");
        
        const safePlaylistName = playlistName.trim() || "My Downloads";
        const playlistId = "local_" + safePlaylistName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
        
        const playlistToSave = {
            id: playlistId,
            name: safePlaylistName,
            cover: currentSelectedPlaylist?.cover || null
        };
        
        const songsToDownload = [...selectedSongs];
        reset();
        
        Toast.show(`Downloading ${songsToDownload.length} songs...`, "pending");
        try {
            await downloadPlaylistSongs(playlistToSave, songsToDownload, concurrency);
            Toast.show("Download Complete!", "success");
        } catch(e) {
            Toast.show("Download Failed", "error");
        }
    };

    return (
        <>
            <View style={styles.container}>
                <View style={styles.selectDetsContainer}>
                    <Text style={styles.text}>Selected: {selectedSongsLen}</Text>
                </View>
                <View style={styles.toolsContainer}>
                    <TouchableOpacity onPress={() => setModalVisible(true)} style={{marginRight: 10}}>
                        <Ionicons name="download-outline" size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={reset}>
                        <Entypo name="cross" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
            
            {modalVisible && (
                <DestinationPickerModal 
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    onSelect={handleDownloadSubmit}
                    defaultName={currentSelectedPlaylist?.name || "My Downloads"}
                />
            )}
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        height: vh * 0.045,
        paddingHorizontal: vw * 0.055,
        position: "absolute",
        backgroundColor: "red",
        marginTop: vh * 0.08,
        zIndex: 999
    },
    selectDetsContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5
    },
    text: {
        color: "white",
        fontWeight: "bold",
        marginBottom: 10,
        fontSize: vw * 0.05
    },
    toolsContainer: {
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 20
    }
});

export default Navbar;
