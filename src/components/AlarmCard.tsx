import React from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { Alarm } from '../types';
import { formatTime12, repeatDescription } from '../utils/time';
import { colors, shadows, borderRadius } from '../theme';

interface AlarmCardProps {
  alarm: Alarm;
  onPress: (alarm: Alarm) => void;
  onToggle: (id: string, isActive: boolean) => void;
}

export default function AlarmCard({ alarm, onPress, onToggle }: AlarmCardProps) {
  const isAM = alarm.hour < 12;
  const periodLabel = isAM ? '오전' : '오후';
  const periodEmoji = isAM ? '☀️' : '🌙';

  return (
    <TouchableOpacity
      style={[styles.container, !alarm.is_active && styles.inactive]}
      onPress={() => onPress(alarm)}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <View style={styles.periodRow}>
          <Text style={styles.periodEmoji}>{periodEmoji}</Text>
          <Text style={[styles.period, !alarm.is_active && styles.inactiveText]}>
            {periodLabel}
          </Text>
        </View>
        <Text style={[styles.time, !alarm.is_active && styles.inactiveText]}>
          {formatTime12(alarm.hour, alarm.minute)}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.repeat, !alarm.is_active && styles.inactiveTextLight]}>
            {repeatDescription(alarm.repeat_mask)}
          </Text>
          <Text style={[styles.mode, !alarm.is_active && styles.inactiveTextLight]}>
            {alarm.unlock_mode === 'voice' ? '🎤 음성' : '⌨️ 타이핑'}
          </Text>
        </View>
        {alarm.label ? (
          <Text style={[styles.label, !alarm.is_active && styles.inactiveTextLight]}>
            {alarm.label}
          </Text>
        ) : null}
      </View>
      <Switch
        value={alarm.is_active}
        onValueChange={(val) => onToggle(alarm.id, val)}
        trackColor={{ false: colors.switchTrackOff, true: colors.switchTrackOn }}
        thumbColor={colors.white}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: 20,
    marginBottom: 12,
    ...shadows.card,
  },
  inactive: {
    opacity: 0.5,
  },
  left: {
    flex: 1,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  periodEmoji: {
    fontSize: 14,
  },
  period: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  time: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  inactiveText: {
    color: colors.textSecondary,
  },
  inactiveTextLight: {
    color: colors.textMuted,
  },
  meta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  repeat: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  mode: {
    fontSize: 14,
    color: colors.primary,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
