import { View } from "react-native";
import { NativeTabs } from "expo-router/unstable-native-tabs";

import TrackControllerMinView from "../../../components/TrackControllerMinView.jsx";
// ic_menu_slideshow
const Layout = () => {
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
            </NativeTabs>

            <TrackControllerMinView tabBarHeight={100} />
        </View>
    );
};

export default Layout;
