'use no memo';
import React from 'react';
import {
    FlexWidget,
    TextWidget,
    ImageWidget,
    ListWidget,
} from 'react-native-android-widget';

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
    isTimerOn?: boolean;
    timerLabel?: string;
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
    isLoadingInitial?: boolean;
}

function normalizeColor(color?: string, fallback = "#FFFFFF"): `#${string}` {
    if (!color) return fallback as `#${string}`;
    if (color.startsWith('#') || color.startsWith('rgba')) return color as `#${string}`;
    return `#${color}` as `#${string}`;
}

function getAlphaColor(color: string, alphaHex = "33"): `#${string}` {
    const clean = color.replace('#', '');
    if (clean.length === 6) {
        return `#${clean}${alphaHex}` as `#${string}`;
    }
    if (clean.length === 8) {
        return `#${clean.substring(0, 6)}${alphaHex}` as `#${string}`;
    }
    return `#38BDF8${alphaHex}` as `#${string}`;
}

export function MusicWidget(props: MusicWidgetProps) {
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
        isTimerOn = false,
        timerLabel = "",
        randomActiveColor = "#38BDF8",
        widgetView = "controls",
        downloadedPlaylists = [],
        selectedPlaylistName = "Songs",
        downloadedSongs = [],
        hasMoreSongs = false,
        isLoadingMore = false,
        isLoadingInitial = false,
    } = props;

    const cardBg = trackBg ? normalizeColor(trackBg, "#121214") : "#121214";
    const buttonBg = "#242428";
    const playButtonBg = "#FFFFFF";
    const titleColor = "#FFFFFF";
    const artistColor = "#A1A1AA";
    const artworkPlaceholderBg = "#1F1F23";
    const activeAccent = normalizeColor(randomActiveColor, "#38BDF8");
    const activeAccentBg = getAlphaColor(activeAccent, "33");

    return (
        <FlexWidget
            style={{
                height: 'match_parent',
                width: 'match_parent',
                flexDirection: 'row',
                alignItems: 'center',
                padding: 10,
                borderRadius: 20,
                backgroundColor: cardBg,
            }}
        >
            {/* Left Section: Track Info and Playback Controls */}
            <FlexWidget
                style={{
                    flex: 1,
                    height: 'match_parent',
                    justifyContent: 'center',
                }}
            >
                {/* Track Info Row */}
                <FlexWidget
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        width: 'match_parent',
                    }}
                >
                    {/* Artwork / Icon Button */}
                    <FlexWidget
                        clickAction="OPEN_APP"
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 10,
                            backgroundColor: artworkPlaceholderBg,
                            justifyContent: 'center',
                            alignItems: 'center',
                            overflow: 'hidden',
                        }}
                    >
                        {artworkUri ? (
                            <ImageWidget
                                image={artworkUri as any}
                                imageWidth={44}
                                imageHeight={44}
                                radius={10}
                                resizeMode="cover"
                            />
                        ) : albumsIconUri ? (
                            <ImageWidget
                                image={albumsIconUri as any}
                                imageWidth={24}
                                imageHeight={24}
                                resizeMode="contain"
                            />
                        ) : (
                            <TextWidget
                                text="♫"
                                style={{
                                    fontSize: 18,
                                    color: artistColor,
                                }}
                            />
                        )}
                    </FlexWidget>

                    {/* Title and Artist Column */}
                    <FlexWidget
                        clickAction="OPEN_APP"
                        style={{
                            flex: 1,
                            marginLeft: 10,
                            justifyContent: 'center',
                        }}
                    >
                        <TextWidget
                            text={title}
                            maxLines={1}
                            truncate="END"
                            style={{
                                fontSize: 13,
                                fontWeight: 'bold',
                                color: titleColor,
                            }}
                        />
                        <TextWidget
                            text={artist}
                            maxLines={1}
                            truncate="END"
                            style={{
                                fontSize: 11,
                                color: artistColor,
                                marginTop: 2,
                            }}
                        />
                    </FlexWidget>
                </FlexWidget>

                {/* Playback Controls Row */}
                <FlexWidget
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: 14,
                    }}
                >
                    {/* Prev Button */}
                    <FlexWidget
                        clickAction="PREV"
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        {prevIconUri ? (
                            <ImageWidget
                                image={prevIconUri as any}
                                imageWidth={26}
                                imageHeight={26}
                                resizeMode="contain"
                            />
                        ) : (
                            <TextWidget
                                text="⏮"
                                style={{ fontSize: 16, color: titleColor }}
                            />
                        )}
                    </FlexWidget>

                    {/* Play/Pause Button */}
                    <FlexWidget
                        clickAction="PLAY_PAUSE"
                        style={{
                            width: 42,
                            height: 42,
                            borderRadius: 21,
                            backgroundColor: playButtonBg,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginHorizontal: 12,
                        }}
                    >
                        {playIconUri ? (
                            <ImageWidget
                                image={playIconUri as any}
                                imageWidth={28}
                                imageHeight={28}
                                resizeMode="contain"
                            />
                        ) : (
                            <TextWidget
                                text={isPlaying ? "⏸" : "▶"}
                                style={{ fontSize: 18, color: '#18181B' }}
                            />
                        )}
                    </FlexWidget>

                    {/* Next Button */}
                    <FlexWidget
                        clickAction="NEXT"
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        {nextIconUri ? (
                            <ImageWidget
                                image={nextIconUri as any}
                                imageWidth={26}
                                imageHeight={26}
                                resizeMode="contain"
                            />
                        ) : (
                            <TextWidget
                                text="⏭"
                                style={{ fontSize: 16, color: titleColor }}
                            />
                        )}
                    </FlexWidget>
                </FlexWidget>
            </FlexWidget>

            {/* Right Section: Controls, Playlists, or Songs */}
            <FlexWidget
                style={{
                    width: 110,
                    height: 'match_parent',
                    marginLeft: 8,
                    justifyContent: 'center',
                }}
            >
                {widgetView === "songs" ? (
                    <FlexWidget style={{ width: 'match_parent', height: 'match_parent' }}>
                        {/* Header: Back + Playlist Title */}
                        <FlexWidget
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                width: 'match_parent',
                                marginBottom: 4,
                            }}
                        >
                            <FlexWidget
                                clickAction="BACK_TO_PLAYLISTS"
                                style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 10,
                                    backgroundColor: buttonBg,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: 4,
                                }}
                            >
                                <TextWidget
                                    text="←"
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 'bold',
                                        color: titleColor,
                                    }}
                                />
                            </FlexWidget>
                            <FlexWidget style={{ flex: 1 }}>
                                <TextWidget
                                    text={selectedPlaylistName}
                                    maxLines={1}
                                    truncate="END"
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 'bold',
                                        color: titleColor,
                                    }}
                                />
                            </FlexWidget>
                        </FlexWidget>

                        {/* Content: Initial loading, empty state, or list */}
                        {isLoadingInitial ? (
                            <FlexWidget
                                style={{
                                    flex: 1,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <TextWidget
                                    text="Loading..."
                                    style={{ fontSize: 10, color: activeAccent }}
                                />
                            </FlexWidget>
                        ) : downloadedSongs.length === 0 ? (
                            <FlexWidget
                                style={{
                                    flex: 1,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <TextWidget
                                    text="No songs"
                                    style={{ fontSize: 10, color: artistColor }}
                                />
                            </FlexWidget>
                        ) : (
                            <FlexWidget style={{ flex: 1, width: 'match_parent' }}>
                                <ListWidget style={{ height: 'match_parent', width: 'match_parent' }}>
                                    {downloadedSongs.map((s) => (
                                        <FlexWidget
                                            key={s.id}
                                            clickAction="PLAY_SONG"
                                            clickActionData={{ songId: s.id }}
                                            style={{
                                                width: 'match_parent',
                                                height: 26,
                                                borderRadius: 6,
                                                backgroundColor: s.isPlaying ? activeAccentBg : '#00000000',
                                                justifyContent: 'center',
                                                paddingHorizontal: 4,
                                                marginBottom: 2,
                                            }}
                                        >
                                            <TextWidget
                                                text={s.title}
                                                maxLines={1}
                                                truncate="END"
                                                style={{
                                                    fontSize: 10,
                                                    fontWeight: s.isPlaying ? 'bold' : 'normal',
                                                    color: s.isPlaying ? activeAccent : titleColor,
                                                }}
                                            />
                                        </FlexWidget>
                                    ))}
                                    {hasMoreSongs && (
                                        <FlexWidget
                                            clickAction="LOAD_MORE_SONGS"
                                            style={{
                                                width: 'match_parent',
                                                height: 24,
                                                borderRadius: 6,
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                marginTop: 2,
                                            }}
                                        >
                                            <TextWidget
                                                text={isLoadingMore ? "Loading..." : "Load More ▾"}
                                                style={{
                                                    fontSize: 9,
                                                    fontWeight: 'bold',
                                                    color: titleColor,
                                                }}
                                            />
                                        </FlexWidget>
                                    )}
                                </ListWidget>
                            </FlexWidget>
                        )}
                    </FlexWidget>
                ) : widgetView === "playlists" ? (
                    <FlexWidget style={{ width: 'match_parent', height: 'match_parent' }}>
                        {/* Header: Title + Exit Button */}
                        <FlexWidget
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: 'match_parent',
                                marginBottom: 4,
                            }}
                        >
                            <TextWidget
                                text="Playlists"
                                maxLines={1}
                                style={{
                                    fontSize: 11,
                                    fontWeight: 'bold',
                                    color: titleColor,
                                }}
                            />
                            <FlexWidget
                                clickAction="EXIT_TO_CONTROLS"
                                style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 10,
                                    backgroundColor: buttonBg,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <TextWidget
                                    text="✕"
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 'bold',
                                        color: titleColor,
                                    }}
                                />
                            </FlexWidget>
                        </FlexWidget>

                        {/* Content: Empty state or playlists list */}
                        {downloadedPlaylists.length === 0 ? (
                            <FlexWidget
                                style={{
                                    flex: 1,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <TextWidget
                                    text="No downloads"
                                    style={{ fontSize: 10, color: artistColor }}
                                />
                            </FlexWidget>
                        ) : (
                            <FlexWidget style={{ flex: 1, width: 'match_parent' }}>
                                <ListWidget style={{ height: 'match_parent', width: 'match_parent' }}>
                                    {downloadedPlaylists.map((p) => (
                                        <FlexWidget
                                            key={p.id}
                                            clickAction="SELECT_PLAYLIST"
                                            clickActionData={{ playlistId: p.id }}
                                            style={{
                                                width: 'match_parent',
                                                height: 28,
                                                borderRadius: 6,
                                                backgroundColor: buttonBg,
                                                justifyContent: 'center',
                                                paddingHorizontal: 6,
                                                marginBottom: 3,
                                            }}
                                        >
                                            <TextWidget
                                                text={p.name}
                                                maxLines={1}
                                                truncate="END"
                                                style={{
                                                    fontSize: 10,
                                                    color: titleColor,
                                                }}
                                            />
                                        </FlexWidget>
                                    ))}
                                </ListWidget>
                            </FlexWidget>
                        )}
                    </FlexWidget>
                ) : (
                    /* Default View: 2x2 Quick Actions (Download, Fav, Random, Timer) */
                    <FlexWidget style={{ width: 'match_parent', justifyContent: 'center' }}>
                        {/* Row 1: Download & Fav */}
                        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <FlexWidget
                                clickAction="DOWNLOAD"
                                style={{
                                    width: 48,
                                    height: 46,
                                    borderRadius: 12,
                                    backgroundColor: buttonBg,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: 8,
                                }}
                            >
                                {downloadIconUri ? (
                                    <ImageWidget
                                        image={downloadIconUri as any}
                                        imageWidth={28}
                                        imageHeight={28}
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <TextWidget
                                        text="⬇"
                                        style={{ fontSize: 16, color: titleColor }}
                                    />
                                )}
                            </FlexWidget>

                            <FlexWidget
                                clickAction="FAV"
                                style={{
                                    width: 48,
                                    height: 46,
                                    borderRadius: 12,
                                    backgroundColor: buttonBg,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                {favIconUri ? (
                                    <ImageWidget
                                        image={favIconUri as any}
                                        imageWidth={28}
                                        imageHeight={28}
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <TextWidget
                                        text="♥"
                                        style={{ fontSize: 16, color: titleColor }}
                                    />
                                )}
                            </FlexWidget>
                        </FlexWidget>

                        {/* Row 2: Random & Timer */}
                        <FlexWidget
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginTop: 8,
                            }}
                        >
                            <FlexWidget
                                clickAction="RANDOM"
                                style={{
                                    width: 48,
                                    height: 46,
                                    borderRadius: 12,
                                    backgroundColor: isRandomOn ? activeAccentBg : buttonBg,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: 8,
                                }}
                            >
                                {randomIconUri ? (
                                    <ImageWidget
                                        image={randomIconUri as any}
                                        imageWidth={28}
                                        imageHeight={28}
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <TextWidget
                                        text="🔀"
                                        style={{
                                            fontSize: 16,
                                            color: isRandomOn ? activeAccent : titleColor,
                                        }}
                                    />
                                )}
                            </FlexWidget>

                            <FlexWidget
                                clickAction="TIMER"
                                style={{
                                    width: 48,
                                    height: 46,
                                    borderRadius: 12,
                                    backgroundColor: isTimerOn ? activeAccentBg : buttonBg,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                {isTimerOn && timerLabel ? (
                                    <TextWidget
                                        text={timerLabel}
                                        style={{
                                            fontSize: 9,
                                            fontWeight: 'bold',
                                            color: activeAccent,
                                            marginBottom: 1,
                                        }}
                                    />
                                ) : null}
                                {timerIconsUri ? (
                                    <ImageWidget
                                        image={timerIconsUri as any}
                                        imageWidth={isTimerOn ? 20 : 28}
                                        imageHeight={isTimerOn ? 20 : 28}
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <TextWidget
                                        text="⏱"
                                        style={{
                                            fontSize: 16,
                                            color: isTimerOn ? activeAccent : titleColor,
                                        }}
                                    />
                                )}
                            </FlexWidget>
                        </FlexWidget>
                    </FlexWidget>
                )}
            </FlexWidget>
        </FlexWidget>
    );
}

// Backward-compatibility export alias
export const MusicWidgetLayout = MusicWidget;
