import { router } from "expo-router";
import TrackPlayer from "react-native-track-player"


const handleSwipeEnd = async (
    e,
    swipeStartPos
) => {
    const endX = e.nativeEvent.pageX;
    const endY = e.nativeEvent.pageY;

    const diffX = endX - swipeStartPos.x;
    const diffY = endY - swipeStartPos.y;

    if (diffX > 100) await TrackPlayer.skipToNext();
    else if (diffX < -100) await TrackPlayer.skipToPrevious();
    else if (diffX === 0) router.push("secure/TrackControllerFullView");
    else if (diffY > 45) await TrackPlayer.reset()
};

export default handleSwipeEnd;
