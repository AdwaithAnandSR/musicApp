import { useState, useEffect } from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";

import {
    FontAwesome,
    Ionicons,
    MaterialCommunityIcons
} from "@expo/vector-icons";

import TrackControllerMinView from "../../../components/TrackControllerMinView.jsx";
import { SetupService } from "../../../services/setUpPlayer.ts";

const activeIconSize = 28,
    inactiveIconSize = 25,
    tabBarHeight = 55,
    tabBarActiveTintColor = "rgb(246,7,135)";

const Layout = () => {
    const playerReady = useSetupPlayer();
    return (
        <View style={{ flex: 1, backgroundColor: "black"}}>
        <NativeTabs backgroundColor="black">
            <NativeTabs.Trigger name="Home">
                <Label>Home</Label>
                <Icon drawable="ic_music" />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="Search">
                <Label>Search</Label>
                <Icon drawable="ic_search" />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="playlists">
                <Label>Playlists</Label>
                <Icon drawable="ic_queue" />
            </NativeTabs.Trigger>
        </NativeTabs>
        <TrackControllerMinView tabBarHeight={100} />
        </View>
    );
};

function useSetupPlayer() {
    const [playerReady, setPlayerReady] = useState(false);

    useEffect(() => {
        let unmounted = false;
        (async () => {
            await SetupService();
            if (unmounted) return;
            setPlayerReady(true);
        })();
        return () => {
            unmounted = true;
        };
    }, []);
    return playerReady;
}

export default Layout;
