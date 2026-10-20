# Client Bug & Performance Report

**Date:** Oct 19, 2026 · **Author:** @Adwaith Anand Sr

The client has 30 bugs and 13 performance problems in player and playlist code. Most trace to one gap: the player queue is identified only by playlist ID, so shuffle, downloads and removals can act on the wrong queue. Fixing that first removes or simplifies seven of the bugs below (A1, A2, A3, A6, B1, B2, C1) and makes the other patches smaller.

**Severity:**
- **High**: wrong playback or data in a common path, or constant heavy work.
- **Medium**: reproducible edge case.
- **Low**: polish.

*References are file:line under `client/src`; findings come from reading the code, not from running the app.*

---

## Fix Order

Start with the queue identity change in `store/player.js`, because steps 1 to 5 all edit the same three functions (`changePlaylistAndPlay`, `appendToQueue`, `next`). Doing them in this order avoids rewriting each patch twice. Steps 6 to 9 do not touch the store and can run in parallel once step 1 lands.

| Step | Patch | Resolves | Re-test after |
|---|---|---|---|
| 1 | Give the queue an identity. Store `queueKey` (`playlistId`, `isRandom`, `seed`) and `isLocalPlaylist` when `changePlaylistAndPlay` runs. Pass the same key from `getPlaylistSongs` into `appendToQueue`, key `playlistControllers` by it, and compare it in `shouldUpdateQueue`. | A1, A2, A3, half of A6 | Turn Shuffle on, Reshuffle, tap a song: playback order matches the list. |
| 2 | Use the local flag and honour shuffle. Replace both `queue[0].isLocal` checks with `isLocalPlaylist`. Stop `changePlaylistAndPlay` overwriting `tracksOverride`. Use Fisher-Yates. | B1, B2 | Play a cloud playlist whose first song is downloaded, press Next at the end. Shuffle Play in Downloads. |
| 3 | Make queue writes safe and sync loop mode in one place. Add a `mutateQueue` helper that reads `get()` inside `set` and bails if the key changed. Add one `syncLoopMode()` called after append, repeat change, controller update and download events. Wrap player teardown in try/catch. | A4, A7, B3, B5 | Repeat-all on a playlist with more than one page. Downloads finishing during playback. |
| 4 | Scope removals and deletes. `removeFromQueue(ids, key)` ignores other playlists. Call it after permanent delete. Prefix-match cache updates. Keep the cloud URL in download metadata. | C1, C2, C3, B4 | Remove a song from playlist A while playing B. Delete a downloaded song that is playing. |
| 5 | Pagination at the end of the queue. In queue mode, Next waits for `fetchNextPage` before wrapping. Controllers become getters and are cleared on unmount. | A5, A6 | Throttle the network, play the last loaded track. |
| 6 | Downloads screens (separate patch, independent). Stop the 2 s polling, throttle progress updates, select ids only. | P1, P2, B6 | Start a 20-song download with Downloads open. |
| 7 | Full-screen player. Reset lyrics state in `trackChanged`, split `VideoBackground`, fix the shadow and colour races. | D1, D2, D4, P3, P7 | Let a song with lyrics end while lyrics are open. |
| 8 | List rendering. Map items once with `select`, mount `LongPressOptions` on demand, add image recycling keys, drop duplicate requests. | P5, P6, P8, P9, P11, P12 | Scroll a 200-song playlist, toggle a favourite. |
| 9 | Server-side. Drop lyrics from list responses, implement shuffle for Favourites and Artist playlists. | P4, C4 | Needs a backend change and a lyrics-on-demand route. |

**Quick wins you can do at any time, each a few lines:**
D3 (regex escape), D2 (shadow fallback), D5, D6, C6, P10, P13.

---

## Issues Summary & Status

| ID | Type | Severity | Description | Fixed |
|---|---|---|---|---|
| **A1** | Bug | High | `appendToQueue` only checks `playlistId` on shuffle toggle | `true` |
| **A2** | Bug | High | `shouldUpdateQueue` misses `randomSeed` comparison | `true` |
| **A3** | Bug | Medium | Length equality check causes unnecessary player teardown | `true` |
| **A4** | Bug | Medium | `getEffectiveLoopMode` stays `none` after last page loads | `true` |
| **A5** | Bug | Medium | `shouldFetchPage` false in queue repeat mode causes premature wrap | `true` |
| **A6** | Bug | Medium | Stale controller snapshot in `playlistControllers` | `true` |
| **A7** | Bug | Medium | Unhandled errors in `changePlaylistAndPlay` leave dead player | `true` |
| **A8** | Bug | Low | Missing trackId fallback, prev at 0, 1-song next issues | `true` |
| **A9** | Bug | Low | Duplicate lock screen / widget updates and artwork race | `true` |
| **B1** | Bug | High | Cloud playlist with downloaded first song treated as local | `true` |
| **B2** | Bug | High | Downloads Shuffle Play overwritten by stored order & biased shuffle | `true` |
| **B3** | Bug | Medium | Unfinished downloads loop wrap without waiting | `true` |
| **B4** | Bug | Medium | Deleted download reverts to dead file URL in queue | `true` |
| **B5** | Bug | Medium | Stale closure queue overwrite in download/delete handlers | `true` |
| **B6** | Bug | Medium | `DownloadedPlaylistSongs` mutation cache prevents re-render on change | `true` |
| **B7** | Bug | Low | Widget favourite toggle doesn't update `currentTrack.isFav` | `false` |
| **C1** | Bug | High | `removeFromQueue` removes song from wrong active playlist | `true` |
| **C2** | Bug | Medium | Permanent delete skips queue removal and busts all query cache | `true` |
| **C3** | Bug | Medium | Removed song stays in shuffled cache without prefix match | `true` |
| **C4** | Bug | Medium | Server ignores `isRandom` for special/artist/favourites | `false` |
| **C5** | Bug | Low | Tapping title scrolls using queue index instead of list index | `true` |
| **C6** | Bug | Low | Shuffle toggle button has no handler in Downloaded playlists | `true` |
| **C7** | Bug | Low | Search results queue does not append or register controller | `true` |
| **D1** | Bug | Medium | Lyrics state not reset on `trackChanged`, locks gesture | `true` |
| **D2** | Bug | Medium | `undefinedb0` shadow style crash on initial render | `true` |
| **D3** | Bug | Medium | Unescaped search text crashes regex in `HighlightedTitle` | `true` |
| **D4** | Bug | Low | Artwork color extraction race on rapid skips | `true` |
| **D5** | Bug | Low | `artistIndex` survives track changes showing empty chip | `true` |
| **D6** | Bug | Low | Equalizer animates on current track even when paused | `true` |
| **D7** | Bug | Low | Double-tap worklet captures entire track object | `true` |
| **P1** | Perf | High | 2s polling interval re-reads and re-renders downloaded playlists | `true` |
| **P2** | Perf | High | Unthrottled download progress re-renders screen every tick | `true` |
| **P3** | Perf | Medium | `VideoBackground` re-renders 2x/sec on position even when video off | `true` |
| **P4** | Perf | Medium | Heavy lyrics data included in playlist responses & serialized in meta | `false` |
| **P5** | Perf | Medium | Every playlist card mounts modal & subscribes to all `selectedSongs` | `true` |
| **P6** | Perf | Medium | In-place item re-mapping breaks React Query structural sharing | `true` |
| **P7** | Perf | Medium | Every lyric line subscribes to `currentLyricIndex` causing full re-renders | `true` |
| **P8** | Perf | Low | Duplicate fetch requests during Shuffle Play and pull-to-refresh | `true` |
| **P9** | Perf | Low | Missing `recyclingKey` and long transitions on list images | `true` |
| **P10** | Perf | Low | Seek slider fires 60 React renders/sec while dragging | `true` |
| **P11** | Perf | Low | Playback position/progress in same store notifies all subscribers | `true` |
| **P12** | Perf | Low | `handleToggleFavourite` predicate walks every cached query | `true` |
| **P13** | Perf | Low | Unneeded FlashList props & missing `keyExtractor` | `false` |

---

## Detailed Findings

### A. Queue, shuffle and pagination
The queue is matched to a screen by playlist ID alone, so anything that fetches the same playlist in a different order corrupts it.

#### A1 · High
- **Files:** `controllers/playlists/fetch.js:46`, `store/player.js:533`
- **Fixed:** `true`
- **Issue:** `getPlaylistSongs` calls `appendToQueue` inside the query function, and `appendToQueue` only checks `playlistId === currentPlaylistId`. Toggling Shuffle, Reshuffle, or switching back to the normal view fetches page 1 of a different order and appends its unseen songs to the end of the playing queue and the native playlist.
- **Fix Applied:** Passed `random` and `seed` from `getPlaylistSongs` into `appendToQueue`, and updated `appendToQueue` to accept and compare `isRandom`/`seed` against the store's `isRandomPlaylist`/`randomSeed`, bailing out on mismatch.

#### A2 · High
- **Files:** `store/player.js:472`
- **Fixed:** `true`
- **Issue:** `shouldUpdateQueue` compares playlist ID, shuffle flag and length but not `randomSeed`. After Reshuffle, tapping a song reuses the old queue when lengths match, so playback follows the old shuffle while the list shows the new one. A1 currently hides this by changing the length.
- **Fix Applied:** Added `get().randomSeed !== randomSeed` to the `shouldUpdateQueue` condition.

#### A3 · Medium
- **Files:** `store/player.js:477`
- **Fixed:** `true`
- **Issue:** Length equality stands in for "same list". Any drift forces a full player teardown and restarts the tapped song: a favourite removed from Favourites (list refetches to n-1), pull-to-refresh (list resets to one page), duplicate IDs across pages (Home dedupes for display, but the queue is built from the raw pages). Tapping the song that is already playing restarts it.
- **Fix Applied:** Added a guard before teardown: when the playlist identity (id, shuffle, seed) matches and the tapped track is already playing, update the queue in-place without destroying the player.

#### A4 · Medium
- **Files:** `store/player.js:88-98, 551`
- **Fixed:** `true`
- **Issue:** `getEffectiveLoopMode` returns `none` while the controller says `hasNextPage`. `appendToQueue` sets `player.loop` before the screen's effect has updated that controller, and `setPlaylistController` never recomputes it. After the last page loads, loop stays `none`, so repeat-all stops at the end of the last song instead of wrapping.
- **Fix Applied:** Added `player.loop = getEffectiveLoopMode()` at the end of `setPlaylistController` when the updated controller matches the current playlist.

#### A5 · Medium
- **Files:** `store/player.js:292, 333-336, 160`
- **Fixed:** `true`
- **Issue:** `shouldFetchPage` is false in the default queue repeat mode, so Next on the last loaded song wraps to index 0 even when more pages exist. Only the three-songs-left prefetch protects this. `hasEnded` is set on every finish but nothing reads it, so a slow or failed prefetch ends playback silently.
- **Fix Applied:** Changed `shouldFetchPage` to `repeatMode !== "one"` so fetching is allowed in queue mode, and guarded the wrap-to-0 with `!(controller && controller.hasNextPage)` so it only wraps when there are truly no more pages.

#### A6 · Medium
- **Files:** `PlaylistSongs.jsx:187-193`, `Home.jsx:41-47`, `store/player.js:78-86, 197`
- **Fixed:** `true`
- **Issue:** The controller stored per playlist is a snapshot of `fetchNextPage`, `hasNextPage` and `isFetchingNextPage` from the screen's last render. It is never removed on unmount, shares one slot between the shuffled and normal queries, and its booleans go stale. The prefetch can start a fetch while one is running, and React Query's `fetchNextPage` cancels and restarts the in-flight request by default; the axios call is not aborted, so its append still runs.
- **Fix Applied:** Replaced snapshot values with getter functions (`getHasNextPage`, `getIsFetchingNextPage`) that read live values from the closure. Added unmount cleanup to remove the controller. Updated all consumer sites in `player.js` to call the getters.

#### A7 · Medium
- **Files:** `store/player.js:400, 487-526`
- **Fixed:** `true`
- **Issue:** `changePlaylistAndPlay` has no error handling. After `player.destroy()` the store still points at the destroyed player until the new one is set, so a throw in `createAudioPlaylist` leaves `playPause` calling a dead object. It also reads `player`, `queue` and `currentPlaylistId` before the awaits and uses them after.
- **Fix Applied:** `set({ player: null })` right after destroy, wrapped `createAudioPlaylist` + listener setup + play in try/catch that calls `resetValues()` on failure.

#### A8 · Low
- **Files:** `store/player.js` (several)
- **Fixed:** `true`
- **Issue:** A trackId that is not found silently plays index 0 (467). `prev()` at index 0 with repeat off does nothing instead of restarting the song (382-387). Next on a one-song queue does nothing because `playByIndex` returns early when the index is current and playing (226). `isWaitingForDownload` is never initialised and `playbackRate` is not reset in `resetValues` (656-674).
- **Fix Applied:** Return `false` when `trackId` is given but not found. `prev()` at index 0 with repeat off now seeks to 0 and replays. `playByIndex` on the current index restarts the track instead of returning. Added `playbackRate: 1.0` to `resetValues`.

#### A9 · Low
- **Files:** `store/player.js:186-187, 241-242`, `services/widgetService.js:117-142`
- **Fixed:** `true`
- **Issue:** `playByIndex` updates the lock screen and widget, then the `trackChanged` event should do both again. Rapid skips also start overlapping artwork downloads that write the same `current_artwork.jpg`.
- **Fix Applied:** Removed `updateLockScreen` and `updateWidget` calls from `playByIndex`; they now fire only from the `trackChanged` listener, the single source of truth for track transitions.

---

### B. Downloads and local playback
The store guesses whether a queue is local from its first song, and several handlers write back a queue snapshot taken before an await.

#### B1 · High
- **Files:** `store/player.js:295, 686`
- **Fixed:** `true`
- **Issue:** `queue[0].isLocal` decides whether the queue is a downloaded playlist. `normalizeTrack` (12-50) marks any downloaded cloud song as `isLocal`, so a cloud playlist whose first song is downloaded is treated as local. Next at the end of the queue then returns early waiting for a download (323-330) when one is running for that playlist, and `onLocalSongDownloaded` can replace the cloud queue with the downloaded list and add mismatched native sources.
- **Fix:** Store `isLocalPlaylist` from the `isLocal` argument (step 2).

#### B2 · High
- **Files:** `DownloadedPlaylistSongs.jsx:90-99`, `store/player.js:412-424`
- **Fixed:** `true`
- **Issue:** Shuffle Play in Downloads sends a shuffled `tracksOverride`, but `changePlaylistAndPlay` replaces tracks with `getDownloadedSongs` order whenever `isLocal` is set. Only the first song is random; the rest play in stored order. The shuffle itself (`sort(() => Math.random() - 0.5)`, also at `PlaylistSongs.jsx:165`) is biased.
- **Fix:** Honour the override and use Fisher-Yates.

#### B3 · Medium
- **Files:** `store/player.js:88-98, 323-330`
- **Fixed:** `true`
- **Issue:** This is the first item in `client/todo.txt`. When the downloaded songs end while more are still downloading, the native loop is `all` and wraps to the first song. `next()` handles a manual skip but the natural end is never intercepted.
- **Fix:** Set loop to `none` while the current local playlist has pending downloads and continue when the next one is saved.

#### B4 · Medium
- **Files:** `store/player.js:760-808`, `PopUpOptions.jsx:104-112`
- **Fixed:** `true`
- **Issue:** Download metadata stores `url: localUrl` and no cloud URL (`downloadService.js:576-582`). When a song from a local playlist is deleted, `onLocalSongDeleted` reverts it to `track.cloudUrl || track.url`, which is the deleted file path. Removing a download also never calls `removeFromQueue`, so the song stays queued with a dead source.
- **Fix Applied:** Added `cloudUrl: song.cloudUrl || song.url` to the `songToSave` object in `downloadService.js` so the original streaming URL is preserved in metadata. Added `removeFromQueue(songId, playId)` in `PopUpOptions.jsx` `handleRemoveDownload` so the song is removed from the queue when the local playlist is currently playing.

#### B5 · Medium
- **Files:** `store/player.js:537-556, 676-758, 760-808`
- **Fixed:** `true`
- **Issue:** `appendToQueue`, `onLocalSongDownloaded` and `onLocalSongDeleted` copy `queue` and `currentTrackIndex`, await, then call `set({ queue })` from the copy. This overwrites any change made meanwhile (favourite toggle, removal, another append) and decides which native source to swap from a stale index. The window is small once the metadata cache is loaded, because the awaits are microtask-only, but it is open on cold start and breaks if any await becomes real I/O.
- **Fix:** Compute inside `set(state => ...)` or serialise queue mutations.

#### B6 · Medium
- **Files:** `DownloadedPlaylistSongs.jsx:29-33, 48-50`, `services/downloads/downloadService.js:64-67, 234, 599`
- **Fixed:** `false`
- **Issue:** The screen only updates its list when the length differs. `getDownloadedSongs` returns the live cached array, which `downloadService` mutates with `push` and `splice`, so the previous and fetched values can be the same array and never differ. Deleting one song and adding another never shows.
- **Fix:** Return copies and compare an ID signature.

#### B7 · Low
- **Files:** `controllers/playlists/handleToggleFavourite.js:41-45`, `services/widgetService.js:274-291`
- **Fixed:** `false`
- **Issue:** The toggle updates the query cache and queue but not `currentTrack`. Toggling from the widget leaves `track.isFav` stale, and the full-screen double-tap (`TrackControllerFullView.jsx:228`) then decides from the stale value and can un-like a liked song.
- **Fix:** Update `currentTrack.isFav` when toggling.

---

### C. Playlist management
Remove and delete actions update the player queue without checking which playlist is playing, and cached shuffled lists are skipped.

#### C1 · High
- **Files:** `controllers/playlists/removeSong.js:28, 69`, `PopUpOptions.jsx:128, 270`
- **Fixed:** `true`
- **Issue:** `removeFromQueue(songId)` runs after every successful removal without comparing the edited playlist to the playing one. Removing song S from playlist A while playing playlist B, which also contains S, pulls S out of B's queue. If S is the current track, playback jumps to the next song.
- **Fix Applied:** Added an optional `playlistId` parameter to `removeFromQueue` with an early-return guard (`if (playlistId && playlistId !== get().currentPlaylistId) return`). Updated all four call sites to pass the playlist being edited: `removeSong.js` (single and batch) passes `playlistId`, `PopUpOptions.jsx` batch favourites passes `"FAVOURITES_PLAYLIST_ID"`, and single favourites passes `options.playId`.

#### C2 · Medium
- **Files:** `PopUpOptions.jsx:200-206, 242-245`, `ListHeader.jsx:90-96`, `Search.jsx:102`
- **Fixed:** `true`
- **Issue:** Permanent delete from Home or Search never calls `removeFromQueue`, so deleted songs stay queued. All four paths then call `queryClient.invalidateQueries()` with no key, which refetches every page of every active list.
- **Fix Applied:** Added `removeFromQueue(songId(s))` (without a `playlistId`, since permanently deleted songs must leave any queue) in all four delete paths: `PopUpOptions.jsx` single delete, `PopUpOptions.jsx` batch delete, `ListHeader.jsx` batch delete, and `Search.jsx` batch delete. Replaced blanket `queryClient.invalidateQueries()` with targeted calls scoped to the affected playlist key and `["HOME"]`.

#### C3 · Medium
- **Files:** `removeSong.js:30, 72`
- **Fixed:** `true`
- **Issue:** The cache update targets `[playlistId]` exactly. Shuffled results live under `[playlistId, "random", seed]`, so a removed song stays visible in the shuffled view until it refetches.
- **Fix Applied:** Changed `queryClient.setQueryData` to `queryClient.setQueriesData({ queryKey: [playlistId] }, ...)` for both single and batch song removals to match all shuffled/seeded query key variations by prefix.

#### C4 · Medium
- **Files:** `server/handlers/playlists/songs.playlist.js`, `ListHeader.jsx:46-50`
- **Fixed:** `false`
- **Issue:** The server checks the artist, special and favourites branches before `isRandom`, so random is ignored for them. The client still shows Shuffle, Reshuffle and "Shuffled" for any ID except Home and Search, and Shuffle Play plays in normal order.
- **Fix:** Shuffle on the client for those lists, or hide the buttons.

#### C5 · Low
- **Files:** `ListHeader.jsx:20-65`, `Home.jsx:82-89`, `PlaylistSongs.jsx:338-350`, `DownloadedPlaylistSongs.jsx:119-127`
- **Fixed:** `true`
- **Issue:** Tapping the title scrolls to `currentTrackIndex`, which is an index in the player queue, not in this list. It lands on the wrong row, or nowhere, when the playing queue is another playlist or a shuffled order.
- **Fix Applied:** In parent screens (`Home.jsx`, `PlaylistSongs.jsx`, `DownloadedPlaylistSongs.jsx`), encapsulated active track index lookup inside `scrollToMiddle()` so `<Header>` never needs `data` passed as a prop, avoiding header re-renders on pagination. In `handleShortPress`, `<Header>` delegates to `scrollToMiddle()`, scrolling to the matched track only when the screen's playlist is active.

#### C6 · Low
- **Files:** `DownloadedPlaylistSongs.jsx:103-111`
- **Fixed:** `true`
- **Issue:** The header shows a Shuffle toggle for downloaded playlists but no `onToggleRandom` handler is passed, so the button does nothing.
- **Fix Applied:** In `ListHeader.jsx`, wrapped the shuffle toggle button in `{onToggleRandom && (...)}` so the non-functional toggle button is hidden when no handler is provided, while keeping the functional "Shuffle Play" button.

#### C7 · Low
- **Files:** `Search.jsx:67-90`
- **Fixed:** `true`
- **Issue:** Search results play through `ID = SEARCH-<text>`, but search never calls `appendToQueue` or registers a controller. The queue stops at the pages loaded when the song was tapped, and later taps hit the length mismatch in A3.
- **Fix Applied:** Registered pagination controller for `SEARCH-${debouncedText}` (`fetchNextPage`, `getHasNextPage`, `getIsFetchingNextPage`) with cleanup in `useEffect`. Added an effect to call `appendToQueue(SEARCH-${debouncedText}, songs)` whenever new search pages are loaded, enabling automatic pre-fetching and queue synchronization for search playback.

---

### D. Full-screen player and list UI
Per-track UI state is reset by button handlers, not by the track change itself.

#### D1 · Medium
- **Files:** `TrackControllerFullView.jsx:43-45, 121`, `LyricsView.jsx:28, 57`, `store/player.js:173-203`
- **Fixed:** `true`
- **Issue:** `resetShowLyrics` runs only from a list tap and the Next and Previous buttons, not from the `trackChanged` listener or the mini-player swipes. If lyrics are open and a song without lyrics starts, `showLyrics` stays true, `LyricsView` renders nothing, and the pan gesture is disabled (`.enabled(!showLyrics)`), so swipe-down to close stops working. The lyric buttons are hidden because the new track has no lyrics, so there is nothing to toggle off. `lastIndexRef` and `currentLyricIndex` also carry over between tracks.
- **Fix Applied:** Called `useStatus.getState().resetShowLyrics()` in the `trackChanged` listener in `store/player.js` so all track transitions reset lyrics visibility and current lyric index. In `LyricsView.jsx`, reset `lastIndexRef.current = -1` on track ID changes so lyric offset sync doesn't carry over.

#### D2 · Medium
- **Files:** `components/fullView/CoverArtwork.jsx:57`
- **Fixed:** `true`
- **Issue:** The shadow is built as ``0px 30px 100px ${shadowColor}b0``. On the first render `colors` is null, so `shadowColor` is undefined and the value becomes `undefinedb0`. A 100 px blur on an 85%-width view is also expensive on Android.
- **Fix Applied:** Built style conditionally with `shadowColor ? \`0px 30px 40px ${shadowColor}b0\` : "none"`, guarding against `undefined` and reducing blur radius to 40px for Android performance.

#### D3 · Medium
- **Files:** `components/HighlightedTitle.jsx:20`
- **Fixed:** `true`
- **Issue:** The search text goes straight into `new RegExp(...)`. Any search containing an unbalanced `(` or `[` throws a `SyntaxError` and crashes the Search screen.
- **Fix Applied:** Escaped special regex characters using `cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")` before constructing `RegExp`.

#### D4 · Low
- **Files:** `TrackControllerMinView.jsx:30-42`, `TrackControllerFullView.jsx:54-69`
- **Fixed:** `true`
- **Issue:** Both call `getColors(...).then(setColors)` with no cancellation, so a slow result from a skipped track can overwrite the current colours. A track with no cover keeps the previous track's colours. The two components also extract separately with different cache keys (`url` and `trackId`).
- **Fix Applied:** Added cancellation guard (`isCurrent`) in `useEffect` in both `TrackControllerMinView.jsx` and `TrackControllerFullView.jsx` to ignore stale promises on rapid skips. Added explicit `setColors(null)` when artwork is missing. Aligned cache keys to `trackId || url` and saved extracted colors into `currentTrack.colors` so extraction only runs once per track.

#### D5 · Low
- **Files:** `components/fullView/OptionsContainer.jsx:20`
- **Fixed:** `true`
- **Issue:** `artistIndex` is component state and survives track changes. After cycling to the third artist, a track with one artist shows an empty chip.
- **Fix Applied:** Added `key={trackId}` to `<OptionsContainer />` in `TrackControllerFullView.jsx` so the component remounts on track change and resets `artistIndex` to 0.

#### D6 · Low
- **Files:** `components/ListItem.jsx:125-136`
- **Fixed:** `true`
- **Issue:** The equalizer animation renders for the current track whether or not it is playing.
- **Fix Applied:** Updated the selector in `ListItem.jsx` to `state => state.currentTrackId === (item.id || item._id) && state.isPlaying`, so the equalizer only renders when actively playing.

#### D7 · Low
- **Files:** `TrackControllerFullView.jsx:249-265`
- **Fixed:** `true`
- **Issue:** The double-tap worklet captures the whole track object, which carries the lyrics arrays, so Reanimated copies it to the UI runtime whenever the gesture is rebuilt.
- **Fix Applied:** Moved favorite status check and haptics into `handleDoubleTap` on the JS thread (`usePlayer.getState().currentTrack?.isFav`), invoked via `runOnJS(handleDoubleTap)()`. `triggerHeartAnimation` runs immediately on the UI thread without capturing the `track` object or serializing lyrics arrays into the UI runtime.

---

### Performance and re-renders
The two biggest costs are on the Downloads screens, which do constant background work. None of the fixes below need `memo`, `useMemo` or `useCallback`; the compiler handles those, and the causes here are changing props, subscriptions and side effects.

#### P1 · High
- **Files:** `DownloadedPlaylists.jsx:17-44`
- **Fixed:** `true`
- **Issue:** A 2-second `setInterval` re-reads every playlist's songs and always calls `setPlaylists` with a new array of new objects. While the screen is focused the whole list re-renders every 2 seconds and each card rebuilds its image source. Runs can also overlap.
- **Fix Applied:** Removed the polling interval. Load on focus via `useFocusEffect` and on download count changes via a `useDownloadStatus` selector that returns only the total downloading song count (a scalar). Added `inFlightRef` guard against overlapping loads and a signature comparison (`id:songCount:sizeBytes`) in `setPlaylists` to skip no-op updates.

#### P2 · High
- **Files:** `store/appState.store.js:137-163`, `services/downloads/downloadService.js:339-361`, `DownloadedPlaylistSongs.jsx:24, 37-56`
- **Fixed:** `true`
- **Issue:** Each progress callback is unthrottled and rebuilds `downloadingPlaylists` (a map over the playlist) and `downloadingSongs`. The screen selects the whole array, so every tick re-renders it. The effect then sees a new array, reads metadata, and sets state again, which is two renders and a metadata lookup per tick.
- **Fix Applied:** (1) Added `throttledUpdateProgress` in `downloadService.js` that only fires on ≥1% change or ≥250ms elapsed. (2) Changed `updateSongProgress` in `appState.store.js` to mutate the target song in-place via `Object.assign` and only return a new `downloadingSongs` reference, keeping the `downloadingPlaylists` array reference stable. (3) In `DownloadedPlaylistSongs.jsx`, replaced the full-array selector with an ID-string selector so only add/remove triggers re-renders. Also made `getDownloadedSongs`/`getDownloadedPlaylists` return shallow copies to prevent shared-array mutation (B6).

#### P3 · Medium
- **Files:** `components/fullView/VideoBackground.jsx:7-9, 23-26, 50`
- **Fixed:** `true`
- **Issue:** The component subscribes to `position`, so it re-renders twice a second while music plays with the full-screen player open, even when video is off. `useVideoPlayer(videoUrl)` also runs for every track with a video before the `return null` at line 50. That likely starts loading video data you never show; confirm in a network profile.
- **Fix Applied:** Split `VideoBackground` into a top-level wrapper that returns `null` immediately when `!showVideo || !videoUrl`, and an `ActiveVideoBackground` child component that mounts only when video mode is active. This completely removes the 2x/sec position subscription and avoids initializing the native video player when video is disabled.

#### P4 · Medium
- **Files:** `server/handlers/playlists/songs.playlist.js:6`, `downloadService.js:48-57`
- **Fixed:** `false`
- **Issue:** `MUSIC_SELECT_FIELDS` includes `lyrics` and `lyricsAsText`, so every song in every list page carries its full lyrics. They are held in the query cache, the queue, multi-select and the download metadata, and `saveMeta` serialises the entire `meta.json` after each downloaded song.
- **Fix:** Return lyrics only for the current track from a separate route.

#### P5 · Medium
- **Files:** `components/playlists/ListItem.jsx:30, 146-152`
- **Fixed:** `true`
- **Issue:** Every playlist card renders a `LongPressOptions` modal, each with two shared values and two animated styles. Each card also subscribes to the whole `selectedSongs` array. The Playlists tab stays mounted under `PlaylistSongs`, so every song selection re-renders all its cards.
- **Fix Applied:** Removed `selectedSongs` array subscription from `components/playlists/ListItem.jsx` and read `selectedSongs: useMultiSelect.getState().selectedSongs` on demand inside the Add button callback, preventing cards from re-rendering during song selection. Wrapped `<LongPressOptions>` in `{showOptions && ...}` so modals and shared values are mounted purely on demand.

#### P6 · Medium
- **Files:** `PlaylistSongs.jsx:201-211`, `Home.jsx:49-60`, `Search.jsx:57-65`
- **Fixed:** `true`
- **Issue:** Every song is re-mapped to `{ id, _id, artwork, cover, ...rest }` whenever data changes. Each page fetch, favourite toggle or refetch gives all mounted rows a new item object, so they all re-render. The compiler cannot avoid this because the props really changed.
- **Fix Applied:** Moved data re-mapping into the `select` option of `useInfiniteQuery` across `Home.jsx`, `Search.jsx`, and `PlaylistSongs.jsx`. React Query preserves references for unmodified items across pages and refetches via structural sharing, preventing unchanged list rows from re-rendering.

#### P7 · Medium
- **Files:** `components/fullView/LyricRenderItem.jsx:14-15`, `LyricsView.jsx:25`
- **Fixed:** `true`
- **Issue:** Every lyric line subscribes to `currentLyricIndex`, so each line change re-renders every mounted line. `LyricsView` also re-renders at 2 Hz on `position`.
- **Fix Applied:** In `LyricRenderItem.jsx`, replaced individual `showSyncedLyric` and `currentLyricIndex` subscriptions with a single boolean selector (`state => state.showSyncedLyric && state.currentLyricIndex === index - 1`), limiting re-renders on line changes to only the two affected items. In `LyricsView.jsx`, removed the component-level `usePlayer(state => state.position)` subscription and substituted an off-render `usePlayer.subscribe` listener active only when synced lyrics are displayed, eliminating 2 Hz parent re-renders.

#### P8 · Low
- **Files:** `PlaylistSongs.jsx:134-201`, `Playlists.jsx:53-56`, `Home.jsx:72-75`
- **Fixed:** `true`
- **Issue:** Shuffle Play requests page 1 itself while the new query key from `setSeed` and `setIsRandom` requests the same page. Pull-to-refresh calls `resetQueries` then `refetch`, a second request.
- **Fix Applied:** In `PlaylistSongs.jsx:handlePlayShuffled`, utilized `queryClient.fetchInfiniteQuery` to pre-fetch and populate cache under the new random seed key prior to updating state, allowing `useInfiniteQuery` to consume cached data without firing an extra request. In `handleRefresh` across `PlaylistSongs.jsx`, `Playlists.jsx`, and `Home.jsx`, removed redundant `refetch()` invocations after `queryClient.resetQueries` (and only re-seeded when random), eliminating duplicate concurrent requests on pull-to-refresh.

#### P9 · Low
- **Files:** `components/ListItem.jsx:93-103`, `components/playlists/ListItem.jsx:113`
- **Fixed:** `true`
- **Issue:** List images use `transition={1000}` with no `recyclingKey`, so a recycled FlashList row cross-fades from the placeholder for a full second. Playlist cards use 500 ms with a parallax image.
- **Fix Applied:** Added `recyclingKey={item.id || item._id}` to `ListItem.jsx` and `recyclingKey={item._id || item.id}` to `playlists/ListItem.jsx`, and reduced transition to 200 ms.

#### P10 · Low
- **Files:** `components/fullView/SliderContainer.jsx:69-77`
- **Fixed:** `true`
- **Issue:** While dragging, `runOnJS(setSeekTime)` fires every frame, about 60 React renders a second, but only whole seconds are shown.
- **Fix Applied:** Added `lastFlooredSec` shared value in `SliderContainer.jsx` to only call `runOnJS(setSeekTime)` when `Math.floor(time)` changes, reducing seeking renders to ~1/sec.

#### P11 · Low
- **Files:** `store/player.js:151-185`, `components/fullView/SliderContainer.jsx`, `components/fullView/LyricsView.jsx`, `components/fullView/VideoBackground.jsx`
- **Fixed:** `true`
- **Issue:** `position`, `progress` and `duration` live in the same store as the queue, so every 500 ms tick notifies all subscribers. Each selector is cheap but every ListItem has several.
- **Fix Applied:** Created a dedicated `useProgress` Zustand store for `position`, `duration`, and `progress`, updated off `playlistStatusUpdate`. Removed continuous position/progress updates from `usePlayer`, preventing store notifications and selector executions across all queue/list items during playback ticks. Updated `SliderContainer.jsx`, `LyricsView.jsx`, and `VideoBackground.jsx` to subscribe to `useProgress`.

#### P12 · Low
- **Files:** `controllers/playlists/handleToggleFavourite.js:21-38`
- **Fixed:** `true`
- **Issue:** `setQueriesData({ predicate: () => true })` walks every cached query, including each search and shuffle seed, on every favourite tap.
- **Fix Applied:** Replaced blanket predicate with targeted predicate matching only `currentPlaylistId` from player store.

#### P13 · Low
- **Files:** Eight FlashList usages, `Home.jsx:88`
- **Fixed:** `false`
- **Issue:** `estimatedItemSize` and `initialNumToRender` are no longer needed by FlashList 2.x as far as I know; check the v2 migration notes before removing them. `DownloadedPlaylistSongs.jsx:113` has no `keyExtractor`.
- **Fix:** Review FlashList 2.x migration notes and add missing `keyExtractor`.

---

## Checked and Fine (Do Not Chase)
- The slider's progress path (shared value fed by `useProgress.subscribe`)
- The `CurrentTimeDisplay` leaf component
- The selectors in `ListItem` and the controls (all return primitives)

---

## Limits of this Audit

This is a code reading only: I did not run the app, attach a profiler, or run the test suite, so each item needs a quick on-device check before and after its patch.

- **React Compiler not verified:** The package registry was unreachable from my environment, so I could not run the compiler's healthcheck. Run `npx react-compiler-healthcheck` and your react-compiler lint rule to see which components it skips.
  - *First suspects:* `ListHeader.jsx` and `playlists/ListItem.jsx` (they call `scrollY.interpolate` during render), `ItemSeparator` defined inside `PlaylistSongs` at line 237 (if it is not memoised, FlashList remounts every separator on each render), and inline `require()` calls in `player.js`, `PopUpOptions.jsx` and `ListHeader.jsx`.
- **Native behaviour assumed:** I assumed `skipTo` fires `trackChanged` (A9), that loop `none` stops at the end of the queue (A4, B3), and that `didJustFinish` arrives once. Confirm these three on a device.
- **Read in full:** the stores, playlist and search screens, controllers, `downloadService`, `widgetService`, the full-screen player components, `PopUpOptions`, `ListHeader`.
- **Skimmed:** `SleepTimerPopup` and `WheelPicker` (timer selection only).
- **Not read:** `AdminPanel`, `Youtube`, `ColorExtractor`, `index.jsx`, `Loader`, `DestinationPickerModal`, `DownloadOptionsModal`, `AddPlaylist`, `MusicWidget.tsx`, and the server except `songs.playlist.js`.
- **Dead code:** `components/Navbar.jsx` is not imported anywhere, and the append subscriber in `services/queryClient.js` is commented out.
