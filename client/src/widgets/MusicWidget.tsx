import React from "react";
import {
    Box,
    Row,
    Column,
    LazyColumn,
    Text,
    Image,
    Button,
    TextButton,
    Spacer,
    CircularProgressIndicator,
} from "@expo/ui/jetpack-compose";
import {
    fillMaxSize,
    fillMaxHeight,
    height,
    width,
    size,
    weight,
    paddingAll,
    cornerRadius,
    background,
    fillMaxWidth,
    blur,
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
    trackBg?: string;
    playIconUri?: string;
    nextIconUri?: string;
    prevIconUri?: string;
    favIconUri?: string;
    albumsIconUri?: string;
    downloadIconUri?: string;
    randomIconUri?: string;
    timerIconsUri?: string;
    closeIconUri?: string;
    isRandomOn?: boolean;
    randomActiveColor?: string;
    widgetView?: "controls" | "playlists" | "songs";
    downloadedPlaylists?: Array<{ id: string; name: string }>;
    selectedPlaylistName?: string;
    downloadedSongs?: Array<{
        id: string;
        title: string;
        isPlaying: boolean;
    }>;
    hasMoreSongs?: boolean;
    isLoadingMore?: boolean;
}

export function MusicWidgetLayout(
    props: MusicWidgetProps,
    environment: WidgetEnvironment,
) {
    "widget";

    const {
        title = "No track playing",
        artist = "Tap to open Music",
        isPlaying = false,
        artworkUri = "",
        trackBg = "",
        prevIconUri = "",
        nextIconUri = "",
        playIconUri = "",
        favIconUri = "",
        albumsIconUri = "",
        downloadIconUri = "",
        randomIconUri = "",
        timerIconsUri = "",
        closeIconUri = "",
        isRandomOn = false,
        randomActiveColor = "#38BDF8",
        widgetView = "controls",
        downloadedPlaylists = [],
        selectedPlaylistName = "Songs",
        downloadedSongs = [],
        hasMoreSongs = false,
        isLoadingMore = false,
    } = props;

    const isDark = environment?.colorScheme !== "light";
    const cardBg = trackBg ? trackBg : isDark ? "#000000" : "#F4F4F5";
    const buttonBg = isDark ? "#242428c5" : "#E4E4E7";
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
                background(cardBg),
            ]}
        >
            <Row verticalAlignment="center" modifiers={[fillMaxSize()]}>
                {/* Left Section: Track Info and Playback Controls */}
                <Column
                    verticalArrangement="center"
                    horizontalArrangement="center"
                    modifiers={[fillMaxHeight()]}
                >
                    {/* Track Info Row */}
                    <Row verticalAlignment="center" modifiers={[]}>
                        <Button
                            target="open_app"
                            modifiers={[
                                size(46, 46),
                                cornerRadius(10),
                                background(artworkPlaceholderBg),
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
                                <Text
                                    color={artistColor}
                                    style={{ fontSize: 18 }}
                                >
                                    ♫
                                </Text>
                            )}
                        </Button>

                        <Spacer modifiers={[width(10)]} />

                        <Button target="open_app" modifiers={[width(135)]}>
                            <Column
                                verticalArrangement="center"
                                modifiers={[width(135)]}
                            >
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

                    <Spacer modifiers={[height(20)]} />

                    {/* Playback Controls Row */}

                    <Row verticalAlignment="center">
                        <Button
                            target="prev"
                            modifiers={[size(34, 34), cornerRadius(17)]}
                        >
                            <Image
                                source={{ uri: prevIconUri }}
                                contentScale="fit"
                                modifiers={[size(28, 28)]}
                            />
                        </Button>

                        <Spacer modifiers={[width(15)]} />

                        <Button
                            target="play_pause"
                            modifiers={[
                                size(42, 42),
                                cornerRadius(25),
                                background(playButtonBg),
                            ]}
                        >
                            <Image
                                source={{ uri: playIconUri }}
                                contentScale="fit"
                                modifiers={[size(30, 30)]}
                                tint={playIconTint}
                            />
                        </Button>

                        <Spacer modifiers={[width(15)]} />

                        <Button
                            target="next"
                            modifiers={[size(34, 34), cornerRadius(17)]}
                        >
                            <Image
                                source={{ uri: nextIconUri }}
                                contentScale="fit"
                                modifiers={[size(28, 28)]}
                            />
                        </Button>
                    </Row>
                </Column>

                <Spacer modifiers={[width(8)]} />

                {/* Right Section: Quick Actions, Downloaded Playlists, or Songs */}
                {widgetView === "songs" ? (
                    <Column
                        verticalArrangement="top"
                        modifiers={[fillMaxHeight(), width(115)]}
                    >
                        {/* Header Row: Back + Title + Exit */}
                        <Row
                            verticalAlignment="center"
                            horizontalArrangement="spaceBetween"
                            modifiers={[fillMaxWidth()]}
                        >
                            <Row verticalAlignment="center" modifiers={[width(88)]}>
                                <TextButton
                                    target="back_to_playlists"
                                    modifiers={[
                                        size(20, 20),
                                        cornerRadius(10),
                                        background(buttonBg),
                                    ]}
                                >
                                    <Text
                                        color={titleColor}
                                        style={{ fontSize: 11, fontWeight: "bold" }}
                                    >
                                        ←
                                    </Text>
                                </TextButton>
                                <Spacer modifiers={[width(4)]} />
                                <Text
                                    color={titleColor}
                                    maxLines={1}
                                    style={{ fontSize: 10, fontWeight: "bold" }}
                                >
                                    {selectedPlaylistName}
                                </Text>
                            </Row>
                            <TextButton
                                target="exit_to_controls"
                                modifiers={[
                                    size(20, 20),
                                    cornerRadius(10),
                                    background(buttonBg),
                                ]}
                            >
                                <Text
                                    color={titleColor}
                                    style={{ fontSize: 11, fontWeight: "bold" }}
                                >
                                    ✕
                                </Text>
                            </TextButton>
                        </Row>

                        <Spacer modifiers={[height(4)]} />

                        {downloadedSongs.length === 0 ? (
                            <Column
                                verticalArrangement="center"
                                horizontalArrangement="center"
                                modifiers={[fillMaxSize()]}
                            >
                                <Text
                                    color={artistColor}
                                    style={{ fontSize: 10 }}
                                >
                                    No songs
                                </Text>
                            </Column>
                        ) : (
                            <LazyColumn modifiers={[fillMaxSize()]}>
                                {downloadedSongs.map((s) => (
                                    <Button
                                        key={s.id}
                                        target={`play_song:${s.id}`}
                                        modifiers={[
                                            fillMaxWidth(),
                                            height(30),
                                            cornerRadius(8),
                                            background(
                                                s.isPlaying
                                                    ? `${randomActiveColor}33`
                                                    : buttonBg,
                                            ),
                                            paddingAll(4),
                                        ]}
                                    >
                                        <Row
                                            verticalAlignment="center"
                                            modifiers={[fillMaxWidth()]}
                                        >
                                            {s.isPlaying && (
                                                <Text
                                                    color={randomActiveColor}
                                                    style={{
                                                        fontSize: 8,
                                                        fontWeight: "bold",
                                                    }}
                                                >
                                                    ▶{" "}
                                                </Text>
                                            )}
                                            <Text
                                                color={
                                                    s.isPlaying
                                                        ? randomActiveColor
                                                        : titleColor
                                                }
                                                maxLines={1}
                                                style={{
                                                    fontSize: 10,
                                                    fontWeight: s.isPlaying
                                                        ? "bold"
                                                        : "normal",
                                                }}
                                            >
                                                {s.title}
                                            </Text>
                                        </Row>
                                    </Button>
                                ))}

                                {hasMoreSongs && (
                                    <Button
                                        target="load_more_songs"
                                        modifiers={[
                                            fillMaxWidth(),
                                            height(28),
                                            cornerRadius(8),
                                            background(buttonBg),
                                            paddingAll(4),
                                        ]}
                                    >
                                        <Row
                                            verticalAlignment="center"
                                            horizontalArrangement="center"
                                            modifiers={[fillMaxWidth()]}
                                        >
                                            {isLoadingMore ? (
                                                <CircularProgressIndicator
                                                    color={randomActiveColor}
                                                    modifiers={[size(14, 14)]}
                                                />
                                            ) : (
                                                <Text
                                                    color={titleColor}
                                                    style={{
                                                        fontSize: 9,
                                                        fontWeight: "bold",
                                                    }}
                                                >
                                                    Load More ▾
                                                </Text>
                                            )}
                                        </Row>
                                    </Button>
                                )}
                            </LazyColumn>
                        )}
                    </Column>
                ) : widgetView === "playlists" ? (
                    <Column
                        verticalArrangement="top"
                        modifiers={[fillMaxHeight(), width(115)]}
                    >
                        {/* Header Row: Title + Exit Button */}
                        <Row
                            verticalAlignment="center"
                            horizontalArrangement="spaceBetween"
                            modifiers={[fillMaxWidth()]}
                        >
                            <Text
                                color={titleColor}
                                maxLines={1}
                                style={{ fontSize: 11, fontWeight: "bold" }}
                            >
                                Playlists
                            </Text>
                            <TextButton
                                target="exit_to_controls"
                                modifiers={[
                                    size(20, 20),
                                    cornerRadius(10),
                                    background(buttonBg),
                                ]}
                            >
                                <Text
                                    color={titleColor}
                                    style={{ fontSize: 11, fontWeight: "bold" }}
                                >
                                    ✕
                                </Text>
                            </TextButton>
                        </Row>

                        <Spacer modifiers={[height(4)]} />

                        {downloadedPlaylists.length === 0 ? (
                            <Column
                                verticalArrangement="center"
                                horizontalArrangement="center"
                                modifiers={[fillMaxSize()]}
                            >
                                <Text
                                    color={artistColor}
                                    style={{ fontSize: 10 }}
                                >
                                    No downloads
                                </Text>
                            </Column>
                        ) : (
                            <LazyColumn modifiers={[fillMaxSize()]}>
                                {downloadedPlaylists.map((p) => (
                                    <Button
                                        key={p.id}
                                        target={`select_playlist:${p.id}`}
                                        modifiers={[
                                            fillMaxWidth(),
                                            height(32),
                                            cornerRadius(8),
                                            background(buttonBg),
                                            paddingAll(4),
                                        ]}
                                    >
                                        <Text
                                            color={titleColor}
                                            maxLines={1}
                                            style={{ fontSize: 10 }}
                                        >
                                            {p.name}
                                        </Text>
                                    </Button>
                                ))}
                            </LazyColumn>
                        )}
                    </Column>
                ) : (
                    <Column
                        verticalArrangement="center"
                        modifiers={[fillMaxHeight()]}
                    >
                        <Row verticalAlignment="center">
                            <TextButton
                                target="download"
                                modifiers={[
                                    size(50, 50),
                                    cornerRadius(15),
                                    blur(50),
                                ]}
                            >
                                <Image
                                    source={{ uri: downloadIconUri }}
                                    contentScale="fit"
                                    modifiers={[size(35, 35)]}
                                />
                            </TextButton>

                            <Spacer modifiers={[width(10)]} />

                            <TextButton
                                target="fav"
                                modifiers={[size(50, 50), cornerRadius(15)]}
                            >
                                <Image
                                    source={{ uri: favIconUri }}
                                    contentScale="fit"
                                    modifiers={[size(35, 35)]}
                                />
                            </TextButton>
                        </Row>

                        <Spacer modifiers={[height(20)]} />

                        <Row verticalAlignment="center">
                            <TextButton
                                target="random"
                                modifiers={[
                                    size(50, 50),
                                    cornerRadius(15),
                                    background(
                                        isRandomOn
                                            ? `${randomActiveColor}33`
                                            : buttonBg,
                                    ),
                                ]}
                            >
                                <Image
                                    source={{ uri: randomIconUri }}
                                    contentScale="fit"
                                    modifiers={[size(35, 35)]}
                                    tint={
                                        isRandomOn
                                            ? randomActiveColor
                                            : "#FFFFFF"
                                    }
                                />
                            </TextButton>

                            <Spacer modifiers={[width(10)]} />

                            <TextButton modifiers={[size(50, 50), cornerRadius(15)]}>
                                <Image
                                    source={{ uri: timerIconsUri }}
                                    contentScale="fit"
                                    modifiers={[size(35, 35)]}
                                />
                            </TextButton>
                        </Row>
                    </Column>
                )}
            </Row>
        </Box>
    );
}

export const musicWidget = createWidget("MusicWidget", MusicWidgetLayout, {
    title: "No track playing",
    artist: "Tap to open Music",
    isPlaying: false,
    artworkUri: "",
    trackBg: "",
    playIconUri: "",
    nextIconUri: "",
    prevIconUri: "",
    favIconUri: "",
    albumsIconUri: "",
    downloadIconUri: "",
    randomIconUri: "",
    timerIconsUri: "",
    closeIconUri: "",
    isRandomOn: false,
    randomActiveColor: "#38BDF8",
    widgetView: "controls",
    downloadedPlaylists: [],
    selectedPlaylistName: "Songs",
    downloadedSongs: [],
    hasMoreSongs: false,
    isLoadingMore: false,
});
