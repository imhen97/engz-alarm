import React from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { Alarm } from '../types';
import { formatTime12, repeatDescription } from '../utils/time';

interface AlarmCardProps {
  alarm: Alarm;
  onPress: (alarm: Alarm) => void;
  onToggle: (id: string, isActive: boolean) => void;
}

export default function AlarmCard({ alarm, onPress, onToggle }: AlarmCardProps) {
  return (
    <TouchableOpacity
      style={[styles.container, !alarm.is_active && styles.inactive]}
      onPress={() => onPress(alarm)}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <Text style={[styles.time, !alarm.is_active && styles.inactiveText]}>
          {formatTime12(alarm.hour, alarm.minute)}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.repeat, !alarm.is_active && styles.inactiveText]}>
            {repeatDescription(alarm.repeat_mask)}
          </Text>
          <Text style={[styles.mode, !alarm.is_active && styles.inactiveText]}>
            {alarm.unlock_mode === 'voice' ? '🎤 Voice' : '⌨️ Typing'}
          </Text>
        </View>
        {alarm.label ? (
          <Text style={[styles.label, !alarm.is_active && styles.inactiveText]}>
            {alarm.label}
          </Text>
        ) : null}
      </View>
      <Switch
        value={alarm.is_active}
        onValueChange={(val) => onToggle(alarm.id, val)}
        trackColor={{ false: '#555', true: '#4CAF50' }}
        thumbColor={alarm.is_active ? '#fff' : '#ccc'}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  inactive: {
    opacity: 0.5,
  },
  left: {
    flex: 1,
  },
  time: {
    fontSize: 36,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  inactiveText: {
    color: '#888',
  },
  meta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  repeat: {
    fontSize: 14,
    color: '#AAA',
  },
  mode: {
    fontSize: 14,
    color: '#7C9EFF',
  },
  label: {
    fontSize: 14,
    color: '#AAA',
    marginTop: 4,
  },
});
