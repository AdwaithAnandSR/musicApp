import React from "react";
import {
    Box,
    Row,
    Column,
    Text,
    Image,
    Button,
    Spacer,
} from "@expo/ui/jetpack-compose";
import {
    fillMaxSize,
    fillMaxWidth,
    height,
    width,
    size,
    paddingAll,
    cornerRadius,
    background,
} from "@expo/ui/jetpack-compose/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

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

// systemMedium systemSmall

export function MusicWidgetLayout(
    props: MusicWidgetProps,
    environment: WidgetEnvironment,
) {
    "widget";

    const {
        title = "No track playing",
        artist = "Music",
        isPlaying = false,
        artworkUri = "",
        prevIconUri = "",
        nextIconUri = "",
        playIconUri = "",
        favIconUri = "",
        albumsIconUri = "",
        downloadIconUri = "",
    } = props;

    return (
        <Row
            modifiers={[
                fillMaxSize(),
                paddingAll(12),
                cornerRadius(16),
                background("#18181B"),
            ]}
        >
            <Column modifiers={[background("red")]} verticalAlignment="center">
                {/* Track Info Row*/}

                <Row
                    verticalAlignment="center"
                    modifiers={[background("green")]}
                >
                    {artworkUri ? (
                        <Image
                            source={{ uri: artworkUri }}
                            contentScale="crop"
                            modifiers={[size(52, 52), cornerRadius(8)]}
                        />
                    ) : (
                        <Box
                            modifiers={[
                                size(52, 52),
                                cornerRadius(8),
                                background("#27272A"),
                            ]}
                        />
                    )}

                    <Spacer modifiers={[width(12)]} />

                    <Column verticalArrangement="center">
                        <Text
                            color="#FFFFFF"
                            maxLines={1}
                            style={{ fontSize: 15, fontWeight: "bold" }}
                        >
                            {JSON.stringify(environment)}
                        </Text>
                        <Spacer modifiers={[height(2)]} />
                        <Text
                            color="#A1A1AA"
                            maxLines={1}
                            style={{ fontSize: 13 }}
                        >
                            {artist}
                        </Text>
                    </Column>
                </Row>

                {/* Track Controller Row*/}

                <Row
                    verticalAlignment="center"
                    modifiers={[
                        background(
                            environment.widgetFamily == "systemSmall"
                                ? "blue"
                                : environment.widgetFamily == "systemMedium"
                                  ? "brown"
                                  : "pink",
                        ),
                    ]}
                >
                    <Button target="prev" modifiers={[size(36, 36)]}>
                        <Image
                            source={{ uri: prevIconUri }}
                            contentScale="fit"
                            modifiers={[size(40, 40)]}
                        />
                    </Button>

                    <Spacer modifiers={[width(16)]} />

                    <Button target="play_pause">
                        <Image
                            source={{ uri: playIconUri }}
                            contentScale="fit"
                            modifiers={[size(45, 45)]}
                        />
                    </Button>

                    <Spacer modifiers={[width(16)]} />

                    <Button target="next" modifiers={[size(36, 36)]}>
                        <Image
                            source={{ uri: nextIconUri }}
                            contentScale="fit"
                            modifiers={[size(40, 40)]}
                        />
                    </Button>
                </Row>
            </Column>

            <Column>
                <Row>
                    <Button target="next" modifiers={[size(36, 36)]}>
                        <Image
                            source={{ uri: downloadIconUri }}
                            contentScale="fit"
                            modifiers={[size(40, 40)]}
                        />
                    </Button>
                    <Button target="next" modifiers={[size(36, 36)]}>
                        <Image
                            source={{ uri: favIconUri }}
                            contentScale="fit"
                            modifiers={[size(40, 40)]}
                        />
                    </Button>
                </Row>
                <Row>
                    <Button target="next" modifiers={[size(36, 36)]}>
                        <Image
                            source={{ uri: albumsIconUri }}
                            contentScale="fit"
                            modifiers={[size(40, 40)]}
                        />
                    </Button>
                </Row>
            </Column>
        </Row>
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
    downloadIconUri: "",
});
