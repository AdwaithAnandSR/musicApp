import TrackPlayer from "react-native-track-player";

const handleSwipeEnd = async (e, swipeStartPos, handleToFullView) => {
   const endX = e.nativeEvent.pageX;
   const endY = e.nativeEvent.pageY;
   const diffX = endX - swipeStartPos;
   if (diffX > 100) await TrackPlayer.skipToNext();
   else if (diffX < -100) await TrackPlayer.skipToPrevious();
   else if (diffX === 0) handleToFullView();
};

export default handleSwipeEnd;
