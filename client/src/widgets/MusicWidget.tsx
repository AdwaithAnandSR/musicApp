import React from "react";
import {
    Box,
    Row,
    Column,
    Text,
    Image,
    Button,
    Spacer
} from "@expo/ui/jetpack-compose";
import {
    fillMaxSize,
    fillMaxHeight,
    height,
    width,
    size,
    paddingAll,
    cornerRadius,
    background
} from "@expo/ui/jetpack-compose/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

declare module "@expo/ui/jetpack-compose" {
    interface ButtonProps {
        target?: string;
    }
}

export interface MusicWidgetProps {
    title?: string;
    artist?: string;
    isPlaying?: boolean;
    artworkUri?: string;
    playIconUri?: string;
    nextIconUri?: string;
    prevIconUri?: string;
    favIconUri?: string;
    albumsIconUri?: string;
    downloadIconUri?: string;
}

export function MusicWidgetLayout(
    props: MusicWidgetProps,
    environment: WidgetEnvironment
) {
    "widget";

    const {
        title = "No track playing",
        artist = "Tap to open Music",
        isPlaying = false,
        artworkUri = "",
        prevIconUri = "",
        nextIconUri = "",
        playIconUri = "",
        favIconUri = "",
        albumsIconUri = "",
        downloadIconUri = ""
    } = props;

    const isDark = environment?.colorScheme !== "light";
    const cardBg = isDark ? "#141416" : "#F4F4F5";
    const buttonBg = isDark ? "#242428" : "#E4E4E7";
    const playButtonBg = isDark ? "#FFFFFF" : "#18181B";
    const playIconTint = isDark ? "#18181B" : "#FFFFFF";
    const titleColor = isDark ? "#FFFFFF" : "#09090B";
    const artistColor = isDark ? "#A1A1AA" : "#71717A";
    const artworkPlaceholderBg = isDark ? "#1F1F23" : "#E4E4E7";

    return (
        <Box
            modifiers={[
                fillMaxSize(),
                paddingAll(10),
                cornerRadius(20),
                background(cardBg)
            ]}
        >
            <Row verticalAlignment="center" modifiers={[fillMaxSize()]}>
                {/* Left Section: Track Info and Playback Controls */}
                <Column verticalArrangement="center" modifiers={[fillMaxHeight()]}>
                    {/* Track Info Row */}
                    <Row verticalAlignment="center">
                        <Button
                            target="open_app"
                            modifiers={[
                                size(46, 46),
                                cornerRadius(10),
                                background(artworkPlaceholderBg)
                            ]}
                        >
                            {artworkUri ? (
                                <Image
                                    source={{ uri: artworkUri }}
                                    contentScale="crop"
                                    modifiers={[size(46, 46), cornerRadius(10)]}
                                />
                            ) : albumsIconUri ? (
                                <Image
                                    source={{ uri: albumsIconUri }}
                                    contentScale="fit"
                                    modifiers={[size(24, 24)]}
                                    alpha={0.4}
                                />
                            ) : (
                                <Text color={artistColor} style={{ fontSize: 18 }}>
                                    ♫
                                </Text>
                            )}
                        </Button>

                        <Spacer modifiers={[width(10)]} />

                        <Button target="open_app" modifiers={[width(135)]}>
                            <Column verticalArrangement="center" modifiers={[width(135)]}>
                                <Text
                                    color={titleColor}
                                    maxLines={1}
                                    style={{ fontSize: 13, fontWeight: "bold" }}
                                >
                                    {title}
                                </Text>
                                <Spacer modifiers={[height(2)]} />
                                <Text
                                    color={artistColor}
                                    maxLines={1}
                                    style={{ fontSize: 11 }}
                                >
                                    {artist}
                                </Text>
                            </Column>
                        </Button>
                    </Row>

                    <Spacer modifiers={[height(8)]} />

                    {/* Playback Controls Row */}
                    <Row verticalAlignment="center">
                        <Button
                            target="prev"
                            modifiers={[
                                size(34, 34),
                                cornerRadius(17),
                                background(buttonBg)
                            ]}
                        >
                            {prevIconUri ? (
                                <Image
                                    source={{ uri: prevIconUri }}
                                    contentScale="fit"
                                    modifiers={[size(18, 18)]}
                                />
                            ) : (
                                <Text color={titleColor} style={{ fontSize: 12 }}>
                                    ⏮
                                </Text>
                            )}
                        </Button>

                        <Spacer modifiers={[width(10)]} />

                        <Button
                            target="play_pause"
                            modifiers={[
                                size(38, 38),
                                cornerRadius(19),
                                background(playButtonBg)
                            ]}
                        >
                            {playIconUri ? (
                                <Image
                                    source={{ uri: playIconUri }}
                                    contentScale="fit"
                                    modifiers={[size(22, 22)]}
                                    tint={playIconTint}
                                />
                            ) : (
                                <Text color={playIconTint} style={{ fontSize: 14 }}>
                                    {isPlaying ? "⏸" : "▶"}
                                </Text>
                            )}
                        </Button>

                        <Spacer modifiers={[width(10)]} />

                        <Button
                            target="next"
                            modifiers={[
                                size(34, 34),
                                cornerRadius(17),
                                background(buttonBg)
                            ]}
                        >
                            {nextIconUri ? (
                                <Image
                                    source={{ uri: nextIconUri }}
                                    contentScale="fit"
                                    modifiers={[size(18, 18)]}
                                />
                            ) : (
                                <Text color={titleColor} style={{ fontSize: 12 }}>
                                    ⏭
                                </Text>
                            )}
                        </Button>
                    </Row>
                </Column>

                <Spacer modifiers={[width(12)]} />

                {/* Right Section: Quick Actions (Download, Favorite, Albums, Open App) */}
                <Column verticalArrangement="center" modifiers={[fillMaxHeight()]}>
                    <Row verticalAlignment="center">
                        <Button
                            target="download"
                            modifiers={[
                                size(32, 32),
                                cornerRadius(16),
                                background(buttonBg)
                            ]}
                        >
                            {downloadIconUri ? (
                                <Image
                                    source={{ uri: downloadIconUri }}
                                    contentScale="fit"
                                    modifiers={[size(16, 16)]}
                                />
                            ) : (
                                <Text color={titleColor} style={{ fontSize: 11 }}>
                                    ⬇
                                </Text>
                            )}
                        </Button>

                        <Spacer modifiers={[width(8)]} />

                        <Button
                            target="fav"
                            modifiers={[
                                size(32, 32),
                                cornerRadius(16),
                                background(buttonBg)
                            ]}
                        >
                            {favIconUri ? (
                                <Image
                                    source={{ uri: favIconUri }}
                                    contentScale="fit"
                                    modifiers={[size(16, 16)]}
                                />
                            ) : (
                                <Text color={titleColor} style={{ fontSize: 11 }}>
                                    ★
                                </Text>
                            )}
                        </Button>
                    </Row>

                    <Spacer modifiers={[height(8)]} />

                    <Row verticalAlignment="center">
                        <Button
                            target="albums"
                            modifiers={[
                                size(32, 32),
                                cornerRadius(16),
                                background(buttonBg)
                            ]}
                        >
                            {albumsIconUri ? (
                                <Image
                                    source={{ uri: albumsIconUri }}
                                    contentScale="fit"
                                    modifiers={[size(16, 16)]}
                                />
                            ) : (
                                <Text color={titleColor} style={{ fontSize: 11 }}>
                                    💿
                                </Text>
                            )}
                        </Button>

                        <Spacer modifiers={[width(8)]} />

                        <Button
                            target="open_app"
                            modifiers={[
                                size(32, 32),
                                cornerRadius(16),
                                background(buttonBg)
                            ]}
                        >
                            <Text
                                color={titleColor}
                                style={{ fontSize: 12, fontWeight: "bold" }}
                            >
                                ↗
                            </Text>
                        </Button>
                    </Row>
                </Column>
            </Row>
        </Box>
    );
}

export const musicWidget = createWidget("MusicWidget", MusicWidgetLayout, {
    title: "No track playing",
    artist: "Tap to open Music",
    isPlaying: false,
    artworkUri: "",
    playIconUri: "",
    nextIconUri: "",
    prevIconUri: "",
    favIconUri: "",
    albumsIconUri: "",
    downloadIconUri: ""
});
