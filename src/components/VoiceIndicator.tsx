import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';
import { VoiceState } from '../types';

interface VoiceIndicatorProps {
  state: VoiceState;
}

export default function VoiceIndicator({ state }: VoiceIndicatorProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'listening') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulse.setValue(1);
    }
  }, [state]);

  const getColor = () => {
    switch (state) {
      case 'listening':
        return '#4CAF50';
      case 'processing':
        return '#FFC107';
      case 'success':
        return '#2196F3';
      case 'fail':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const getLabel = () => {
    switch (state) {
      case 'idle':
        return 'Tap to speak';
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      case 'success':
        return 'Great job!';
      case 'fail':
        return 'Try again';
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.circle,
          { backgroundColor: getColor(), transform: [{ scale: pulse }] },
        ]}
      >
        <Text style={styles.icon}>🎤</Text>
      </Animated.View>
      <Text style={[styles.label, { color: getColor() }]}>{getLabel()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
