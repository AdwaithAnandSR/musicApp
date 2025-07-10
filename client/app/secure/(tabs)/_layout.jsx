import { SafeAreaView } from "react-native-safe-area-context";
import { Tabs } from "expo-router";
import {
    FontAwesome,
    Ionicons,
    MaterialCommunityIcons
} from "@expo/vector-icons";

import TrackControllerMinView from "../../../components/TrackControllerMinView.jsx";

const activeIconSize = 28,
    inactiveIconSize = 25;

const Layout = () => {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "black" }}>
            <Tabs
                screenOptions={{
                    tabBarActiveTintColor: "rgb(246,7,135)",
                    tabBarHideOnKeyboard: true,
                    tabBarShowLabel: false,
                    headerShown: false,
                    tabBarStyle: {
                        position: "absolute",
                        zIndex: 99999,
                        paddingTop: 3,
                        backgroundColor: "#000000d0",
                        borderTopWidth: 0,
                        height: 43,
                        borderTopLeftRadius: 30,
                        borderTopRightRadius: 30
                    }
                }}
            >
                <Tabs.Screen
                    name="Home"
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <FontAwesome
                                name="music"
                                size={
                                    focused ? activeIconSize : inactiveIconSize
                                }
                                color={color}
                            />
                        )
                    }}
                />
                <Tabs.Screen
                    name="Search"
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons
                                name="search"
                                size={
                                    focused ? activeIconSize : inactiveIconSize
                                }
                                color={color}
                            />
                        )
                    }}
                />
                <Tabs.Screen
                    name="playlists"
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <MaterialCommunityIcons
                                name="playlist-music"
                                size={
                                    focused ? activeIconSize : inactiveIconSize
                                }
                                color={color}
                            />
                        )
                    }}
                />
            </Tabs>
            <TrackControllerMinView />
        </SafeAreaView>
    );
};

export default Layout;
