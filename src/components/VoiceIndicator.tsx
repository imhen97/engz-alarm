import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';
import { VoiceState } from '../types';
import { colors } from '../theme';

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
        return colors.primary;
      case 'processing':
        return colors.warning;
      case 'success':
        return colors.success;
      case 'fail':
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  const getLabel = () => {
    switch (state) {
      case 'idle':
        return '탭하여 말하기';
      case 'listening':
        return '듣고 있어요...';
      case 'processing':
        return '확인 중...';
      case 'success':
        return '잘했어요!';
      case 'fail':
        return '다시 시도해보세요';
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
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 36,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
