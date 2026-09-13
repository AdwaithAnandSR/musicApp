import { View } from "react-native";
import { NativeTabs } from "expo-router/unstable-native-tabs";

import { getUser } from "@services/storage.js";
import TrackControllerMinView from "../../../components/TrackControllerMinView.jsx";

const Layout = () => {
    const user = getUser();
    const isAdmin = user?.role === "admin";

    return (
        <View style={{ flex: 1, backgroundColor: "black" }}>
            <NativeTabs backgroundColor="black">
                <NativeTabs.Trigger name="Home">
                    <NativeTabs.Trigger.Icon md="music_note" sf="music.note" />
                </NativeTabs.Trigger>

                <NativeTabs.Trigger name="Search">
                    <NativeTabs.Trigger.Icon md="search" sf="magnifyingglass" />
                </NativeTabs.Trigger>

                <NativeTabs.Trigger name="playlists">
                    <NativeTabs.Trigger.Icon
                        md="queue_music"
                        sf="music.note.list"
                    />
                </NativeTabs.Trigger>

                {isAdmin && (
                    <NativeTabs.Trigger name="AdminPanel">
                        <NativeTabs.Trigger.Icon
                            md="admin_panel_settings"
                            sf="shield.lefthalf.filled"
                        />
                    </NativeTabs.Trigger>
                )}
            </NativeTabs>

            <TrackControllerMinView tabBarHeight={100} />
        </View>
    );
};

export default Layout;
