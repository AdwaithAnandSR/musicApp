import React, { useEffect } from "react";
import { View } from "react-native"
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";

import Toast from "../../services/Toast.js";

import { SqlControllerProvider } from "../../context/sql.context.js";

const _layout = () => {
    return (
        <View style={{ flex: 1, backgroundColor: "black" }}>
            <SQLiteProvider databaseName="musicApp.db">
                <SqlControllerProvider>
                    <Stack
                        screenOptions={{
                            headerShown: false,
                            animation: "none"
                        }}
                    >
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen
                            name="(trackFullView)/TrackControllerFullView"
                            options={{
                                animation: "slide_from_bottom",
                                animationDuration: 50
                            }}
                        />
                        <Stack.Screen
                            name="others/AddPlaylist"
                            options={{
                                animation: "slide_from_right"
                            }}
                        />
                    </Stack>
                    <Toast />
                </SqlControllerProvider>
            </SQLiteProvider>
        </View>
    );
};

export default _layout;
