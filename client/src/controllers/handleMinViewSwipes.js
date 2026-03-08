import { router } from "expo-router";

import { usePlayer } from "@store/player";

const next = usePlayer.getState().next;
const prev = usePlayer.getState().prev;
const clearPlayer = usePlayer.getState().clearPlayer;

const handleSwipeEnd = async (e, swipeStartPos) => {
    const endX = e.nativeEvent.pageX;
    const endY = e.nativeEvent.pageY;

    const diffX = endX - swipeStartPos.x;
    const diffY = endY - swipeStartPos.y;

    if (diffX > 100) next();
    else if (diffX < -100) prev();
    else if (diffX === 0) router.push("secure/TrackControllerFullView");
    else if (diffY > 45) {
        clearPlayer();
    }
};

export default handleSwipeEnd;
