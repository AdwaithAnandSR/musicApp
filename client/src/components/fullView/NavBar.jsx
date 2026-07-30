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
import { FlashList } from "@shopify/flash-list";

import { usePlayer } from "@store/player.js";
import queryClient from "@services/queryClient";

import addSongsToPlaylist from "@controllers/playlists/addSongsToPlaylist.js";

const { height: vh, width: vw } = Dimensions.get("window");
const activeLyricColor = "rgb(246,7,135)";

const MenuItem = ({ label, icon, onPress, onLongPress }) => (
    <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        style={styles.menuItem}
    >
        {icon}
        <Text style={styles.menuText}>{label}</Text>
    </TouchableOpacity>
);

const MenuOptions = ({ setShowMenu }) => {
    const playlists =
        queryClient
            .getQueryData(["playlists"])
            ?.pages.flatMap(page => page.playlists) || [];

    const track = usePlayer(state => state.currentTrack);

    const [showPlaylist, setShowPlaylist] = useState(false);

    return (
        <View style={styles.menu}>
            {showPlaylist ? (
                <View style={styles.playlistListWrapper}>
                    <View style={styles.playlistHeader}>
                        <TouchableOpacity
                            onPress={() => setShowPlaylist(false)}
                            style={styles.backBtn}
                        >
                            <Entypo name="chevron-left" size={18} color="#94a3b8" />
                            <Text style={styles.headerTitle}>Add to Playlist</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.flashListContainer}>
                        <FlashList
                            data={playlists}
                            showsVerticalScrollIndicator={false}
                            estimatedItemSize={45}
                            keyExtractor={(item, index) =>
                                item?._id || item?.id || `${index}`
                            }
                            renderItem={({ item }) => (
                                <MenuItem
                                    key={item._id || item.id}
                                    label={item.name}
                                    onPress={() =>
                                        addSongsToPlaylist({
                                            id: item._id || item.id,
                                            selectedSongs: [track],
                                            reset: () => setShowMenu(false)
                                        })
                                    }
                                />
                            )}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>
                                    No playlists found
                                </Text>
                            }
                        />
                    </View>
                </View>
            ) : (
                <MenuItem
                    label="Add to Playlist"
                    icon={<Entypo name="plus" size={18} color="white" />}
                    onPress={() => setShowPlaylist(true)}
                />
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
                <TouchableOpacity onPress={() => setShowMenu(prev => !prev)}>
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
    menu: {
        backgroundColor: "#000000ea",
        borderColor: "#2a2a32",
        borderWidth: 1,
        minWidth: vw * 0.45,
        maxWidth: vw * 0.7,
        borderRadius: 18,
        position: "absolute",
        top: 70 - vh * 0.01,
        right: (vw * 0.3) / 2 - 20,
        zIndex: 999,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 12
    },
    playlistListWrapper: {
        width: "100%"
    },
    playlistHeader: {
        borderBottomWidth: 1,
        borderBottomColor: "#ffffff15",
        paddingVertical: 8,
        paddingHorizontal: 10
    },
    backBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4
    },
    headerTitle: {
        color: "#94a3b8",
        fontSize: 12,
        fontWeight: "600",
        textTransform: "uppercase"
    },
    flashListContainer: {
        height: 180,
        width: "100%"
    },
    emptyText: {
        color: "#64748b",
        fontSize: 12,
        textAlign: "center",
        paddingVertical: 15
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: vw * 0.02,
        paddingVertical: 10,
        paddingHorizontal: 12
    },
    menuText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 14
    }
});

export default NavBar;
