import TrackPlayer, {
    Capability,
    AppKilledPlaybackBehavior
} from "react-native-track-player";

import { PlaybackService } from "./services/playerService.js";

TrackPlayer.registerPlaybackService(() => PlaybackService);

// Boot expo-router after setup
import "expo-router/entry";
