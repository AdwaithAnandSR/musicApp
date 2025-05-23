import { router } from "expo-router";

const handleSwipeEnd = async (
    e,
    swipeStartPos,
    skipToNext,
    skipToPrevious,
    updateTrack
) => {
    const endX = e.nativeEvent.pageX;
    const endY = e.nativeEvent.pageY;

    const diffX = endX - swipeStartPos.x;
    const diffY = endY - swipeStartPos.y;

    if (diffX > 100) skipToNext();
    else if (diffX < -100) skipToPrevious();
    else if (diffX === 0) router.push("TrackControllerFullView");
    else if (diffY > 45) updateTrack({});
};

export default handleSwipeEnd;
