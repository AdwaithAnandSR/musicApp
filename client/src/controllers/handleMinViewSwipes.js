import { router } from "expo-router";

import { usePlayer } from "@store/player";

const handleSwipeEnd = async (e, swipeStartPos) => {
    const endX = e.nativeEvent.pageX;
    const endY = e.nativeEvent.pageY;

    const diffX = endX - swipeStartPos.x;
    const diffY = endY - swipeStartPos.y;

    if (diffX > 100) usePlayer.getState().next();
    else if (diffX < -100) usePlayer.getState().prev();
    else if (diffX === 0) router.push("secure/TrackControllerFullView");
    else if (diffY > 45) {
        usePlayer.getState().clearPlayer();
    }
};

export default handleSwipeEnd;

