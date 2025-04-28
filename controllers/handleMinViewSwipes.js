const handleSwipeEnd = async (
    e,
    swipeStartPos,
    handleToFullView,
    skipToNext,
    skipToPrevious,
    
) => {
    const endX = e.nativeEvent.pageX;

    const diffX = endX - swipeStartPos;
    if (diffX > 100) skipToNext();
    else if (diffX < -100) skipToPrevious();
    else if (diffX === 0) handleToFullView();
};

export default handleSwipeEnd;
