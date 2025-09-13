import { useState } from "react";
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Text,
    ScrollView
} from "react-native";
import { Entypo, Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { useGlobalSongs } from "../../store/list.store.js";
import TrackPlayer from "react-native-track-player";

import addSongsToPlaylist from "../../controllers/playlists/addSongsToPlaylist.js";

const { height: vh, width: vw } = Dimensions.get("window");
const activeLyricColor = "rgb(246,7,135)";

const MenuOptions = ({ setShowMenu }) => {
    const playlists = useGlobalSongs(state => state.playlists);
    const track = TrackPlayer.getActiveTrack();

    const [showPlaylist, setShowPlaylist] = useState(false);

    const Playlists = () => (
        <ScrollView>
            {playlists.map(item => (
                <TouchableOpacity
                    key={item._id}
                    onPress={() =>
                        addSongsToPlaylist({
                            id: item._id,
                            selectedSongs: [track],
                            reset: () => setShowMenu(false)
                        })
                    }
                    style={styles.menuItem}
                >
                    <Text style={styles.menuText}> {item.name}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    return (
        <View style={styles.menu}>
            {showPlaylist ? (
                <Playlists />
            ) : (
                <TouchableOpacity
                    onPress={() => setShowPlaylist(true)}
                    style={styles.menuItem}
                >
                    <Entypo name="plus" size={20} color="white" />
                    <Text style={styles.menuText}>Playlist</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const NavBar = () => {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <View style={styles.navbar}>
            {showMenu && <MenuOptions setShowMenu={setShowMenu} />}
            <View style={styles.right}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Entypo name="chevron-down" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={e => setShowMenu(prev => !prev)}>
                    <Entypo
                        name="dots-three-vertical"
                        size={24}
                        color="white"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    navbar: {
        width: "100%",
        height: "10%",
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "flex-end",
        paddingHorizontal: vw * 0.05
    },
    right: {
        flexDirection: "row",
        alignItems: "center",
        gap: vw * 0.05
    },
    left: {
        flexDirection: "row",
        alignItems: "center",
        gap: vw * 0.05
    },
    options: {
        paddingHorizontal: vw * 0.02,
        paddingVertical: vh * 0.004,
        borderWidth: 1,
        borderRadius: 22,
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        maxWidth: 120,
        overflow: "hidden",
        borderColor: activeLyricColor
    },
    optionsText: {
        color: activeLyricColor,
        maxWidth: "90%",
        fontSize: 11,
        fontWeight: 600
    },
    menu: {
        backgroundColor: "#000000df",
        borderColor: "#323232",
        borderWidth: 1,
        minWidth: vw * 0.4,
        maxHeight: vh * 0.3,
        maxWidth: vw * 0.7,
        borderRadius: 23,
        position: "absolute",
        top: 70 - vh * 0.01,
        right: (vw * 0.3) / 2 - 20,
        zIndex: 999,
        overflow: "hidden"
    },
    menuItem: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: vw * 0.01,
        paddingVertical: vh * 0.01
    },
    menuText: {
        color: "white",
        fontWeight: "bold",
        textAlign: "center",
        fontSize: vw * 0.04
    }
});

export default NavBar;
