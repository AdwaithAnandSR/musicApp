import { View } from "react-native";
import { Tabs } from "expo-router";
import {
    FontAwesome,
    Ionicons,
    MaterialCommunityIcons
} from "@expo/vector-icons";

import TrackControllerMinView from "../../../components/TrackControllerMinView.jsx";
// import TrackControllerMinView from "../../components/TrackControllerMinView.jsx";

const activeIconSize = 28,
    inactiveIconSize = 25;

const Layout = () => {
    return (
        <View style={{ flex: 1, backgroundColor: "black" }}>
            <Tabs
                screenOptions={{
                    tabBarActiveTintColor: "rgb(246,7,135)",
                    tabBarShowLabel: false,
                    headerShown: false,
                    tabBarStyle: {
                        position: "absolute",
                        zIndex: 99999,
                        paddingTop: 5,
                        backgroundColor: "#000000c5",
                        borderTopWidth: 0,
                        height: 45,
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
        </View>
    );
};

export default Layout;
