import { router } from "expo-router";

import { usePlayer } from "@store/player";

const handleSwipeEnd = async (e, swipeStartPos) => {
    const endX = e.nativeEvent.pageX;
    const endY = e.nativeEvent.pageY;

    const diffX = endX - swipeStartPos.x;
    const diffY = endY - swipeStartPos.y;

    if (diffX > 100) usePlayer.getState().next();
    else if (diffX < -100) usePlayer.getState().prev();
    else if (diffY > 50) usePlayer.getState().clearPlayer();
    else if (diffY < -50) router.push("secure/TrackControllerFullView");
    else if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10) router.push("secure/TrackControllerFullView");
};

export default handleSwipeEnd;

