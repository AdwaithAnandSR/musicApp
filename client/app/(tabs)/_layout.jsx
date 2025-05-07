import { View } from "react-native";
import { Tabs } from "expo-router";
import {
    FontAwesome,
    Ionicons,
    MaterialCommunityIcons
} from "@expo/vector-icons";

import TrackControllerMinView from "../../components/TrackControllerMinView.jsx";

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
                        paddingTop: 10,
                        backgroundColor: "black",
                        borderTopWidth: 0,
                        height: 55
                    }
                }}
            >
                <Tabs.Screen
                    name="Home"
                    options={{
                        tabBarIcon: ({ color }) => (
                            <FontAwesome name="music" size={24} color={color} />
                        )
                    }}
                />
                <Tabs.Screen
                    name="Search"
                    options={{
                        tabBarIcon: ({ color }) => (
                            <Ionicons name="search" size={24} color={color} />
                        )
                    }}
                />
                <Tabs.Screen
                    name="playlists"
                    options={{
                        tabBarIcon: ({ color }) => (
                            <MaterialCommunityIcons
                                name="playlist-music"
                                size={24}
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
