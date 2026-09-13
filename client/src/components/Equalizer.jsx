import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    withRepeat, 
    Easing, 
    cancelAnimation 
} from 'react-native-reanimated';

const Bar = ({ isPlaying, color, minHeight, maxHeight, duration }) => {
    const height = useSharedValue(minHeight);

    useEffect(() => {
        if (isPlaying) {
            height.value = withRepeat(
                withTiming(maxHeight, { 
                    duration, 
                    easing: Easing.inOut(Easing.ease) 
                }),
                -1,
                true // reverse
            );
        } else {
            cancelAnimation(height);
            height.value = withTiming(minHeight, { duration: 300 });
        }
    }, [isPlaying]);

    const animatedStyle = useAnimatedStyle(() => ({
        height: height.value,
        backgroundColor: color
    }));

    return <Animated.View style={[styles.bar, animatedStyle]} />;
};

const Equalizer = ({ isPlaying, color = 'white', size = 35 }) => {
    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Bar isPlaying={isPlaying} color={color} minHeight={4} maxHeight={size * 0.6} duration={400} />
            <Bar isPlaying={isPlaying} color={color} minHeight={4} maxHeight={size * 0.9} duration={300} />
            <Bar isPlaying={isPlaying} color={color} minHeight={4} maxHeight={size * 0.7} duration={500} />
            <Bar isPlaying={isPlaying} color={color} minHeight={4} maxHeight={size * 0.5} duration={350} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4
    },
    bar: {
        width: 4,
        borderRadius: 2,
    }
});

export default Equalizer;
