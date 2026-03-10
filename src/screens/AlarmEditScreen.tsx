import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import ScrollPicker from '../components/ScrollPicker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppStore } from '../store/useAppStore';
import { Alarm, UnlockMode, DAYS } from '../types';
import { daysToRepeatMask } from '../utils/time';
import { rescheduleAllAlarms } from '../services/alarmScheduler';
import { RootStackParamList } from '../navigation/types';
import { colors, shadows, borderRadius } from '../theme';

type EditNav = NativeStackNavigationProp<RootStackParamList, 'AlarmEdit'>;
type EditRoute = RouteProp<RootStackParamList, 'AlarmEdit'>;

const DAY_LABELS_KO = ['일', '월', '화', '수', '목', '금', '토'];

export default function AlarmEditScreen() {
  const navigation = useNavigation<EditNav>();
  const route = useRoute<EditRoute>();
  const { alarms, addAlarm, updateAlarm, removeAlarm, settings } = useAppStore();

  const editingId = route.params?.alarmId;
  const existingAlarm = editingId
    ? alarms.find((a) => a.id === editingId)
    : null;

  const initHour24 = existingAlarm?.hour ?? 7;
  const [displayHour, setDisplayHour] = useState(() => {
    const h = initHour24 % 12;
    return h === 0 ? 12 : h;
  });
  const [isAM, setIsAM] = useState(initHour24 < 12);
  const [minute, setMinute] = useState(existingAlarm?.minute ?? 0);

  const getHour24 = () => {
    if (isAM) {
      return displayHour === 12 ? 0 : displayHour;
    } else {
      return displayHour === 12 ? 12 : displayHour + 12;
    }
  };

  const [selectedDays, setSelectedDays] = useState<number[]>(() => {
    if (!existingAlarm) return [];
    const days: number[] = [];
    for (let i = 0; i < 7; i++) {
      if (existingAlarm.repeat_mask & (1 << i)) days.push(i);
    }
    return days;
  });
  const [unlockMode, setUnlockMode] = useState<UnlockMode>(
    existingAlarm?.unlock_mode ?? settings.default_unlock_mode
  );
  const [label, setLabel] = useState(existingAlarm?.label ?? '');

  const toggleDay = (idx: number) => {
    setSelectedDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
    );
  };

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
  };

  const handleSave = async () => {
    const hour = getHour24();
    const alarm: Alarm = {
      id: editingId ?? generateId(),
      hour,
      minute,
      repeat_mask: daysToRepeatMask(selectedDays),
      label,
      unlock_mode: unlockMode,
      is_active: true,
      created_at: existingAlarm?.created_at ?? new Date().toISOString(),
    };

    if (editingId) {
      await updateAlarm(alarm);
    } else {
      await addAlarm(alarm);
    }

    const updatedAlarms = useAppStore.getState().alarms;
    await rescheduleAllAlarms(updatedAlarms);
    navigation.goBack();
  };

  const handleDelete = () => {
    if (!editingId) return;
    Alert.alert('알람 삭제', '정말 삭제하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await removeAlarm(editingId);
          const updatedAlarms = useAppStore.getState().alarms;
          await rescheduleAllAlarms(updatedAlarms);
          navigation.goBack();
        },
      },
    ]);
  };

  const hours12 = useMemo(() => [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← 뒤로</Text>
      </TouchableOpacity>

      <Text style={styles.title}>
        {editingId ? '알람 수정' : '새 알람'} {isAM ? '☀️' : '🌙'}
      </Text>

      {/* AM/PM Toggle */}
      <View style={styles.ampmRow}>
        <TouchableOpacity
          style={[styles.ampmBtn, isAM && styles.ampmBtnActive]}
          onPress={() => setIsAM(true)}
        >
          <Text style={[styles.ampmText, isAM && styles.ampmTextActive]}>
            ☀️ 오전
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ampmBtn, !isAM && styles.ampmBtnActive]}
          onPress={() => setIsAM(false)}
        >
          <Text style={[styles.ampmText, !isAM && styles.ampmTextActive]}>
            🌙 오후
          </Text>
        </TouchableOpacity>
      </View>

      {/* Time Picker */}
      <View style={styles.pickerCard}>
        <View style={styles.timeContainer}>
          <ScrollPicker
            values={hours12}
            selectedValue={displayHour}
            onValueChange={setDisplayHour}
          />
          <Text style={styles.timeSeparator}>:</Text>
          <ScrollPicker
            values={minutes}
            selectedValue={minute}
            onValueChange={setMinute}
          />
        </View>
      </View>

      {/* Repeat Days */}
      <Text style={styles.sectionTitle}>반복</Text>
      <View style={styles.daysRow}>
        {DAY_LABELS_KO.map((day, idx) => (
          <TouchableOpacity
            key={day}
            style={[styles.dayBtn, selectedDays.includes(idx) && styles.dayBtnActive]}
            onPress={() => toggleDay(idx)}
          >
            <Text
              style={[
                styles.dayText,
                selectedDays.includes(idx) && styles.dayTextActive,
              ]}
            >
              {day}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Unlock Mode */}
      <Text style={styles.sectionTitle}>해제 방법</Text>
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, unlockMode === 'voice' && styles.modeBtnActive]}
          onPress={() => setUnlockMode('voice')}
        >
          <Text style={styles.modeIcon}>🎤</Text>
          <Text
            style={[
              styles.modeText,
              unlockMode === 'voice' && styles.modeTextActive,
            ]}
          >
            음성
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, unlockMode === 'typing' && styles.modeBtnActive]}
          onPress={() => setUnlockMode('typing')}
        >
          <Text style={styles.modeIcon}>⌨️</Text>
          <Text
            style={[
              styles.modeText,
              unlockMode === 'typing' && styles.modeTextActive,
            ]}
          >
            타이핑
          </Text>
        </TouchableOpacity>
      </View>

      {/* Label */}
      <Text style={styles.sectionTitle}>라벨 (선택)</Text>
      <TextInput
        style={styles.input}
        value={label}
        onChangeText={setLabel}
        placeholder="예: 출근 준비"
        placeholderTextColor={colors.textMuted}
        maxLength={50}
      />

      {/* Save Button */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>
          {editingId ? '저장' : '알람 만들기'} ✨
        </Text>
      </TouchableOpacity>

      {/* Delete Button */}
      {editingId && (
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>알람 삭제</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  backBtn: {
    marginBottom: 8,
  },
  backBtnText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  ampmRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  ampmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.card,
  },
  ampmBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  ampmText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMuted,
  },
  ampmTextActive: {
    color: colors.primary,
  },
  pickerCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: 16,
    marginBottom: 24,
    ...shadows.card,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSeparator: {
    fontSize: 48,
    fontWeight: '300',
    color: colors.textPrimary,
    marginHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    marginTop: 8,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  dayBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    ...shadows.card,
  },
  dayBtnActive: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayTextActive: {
    color: colors.white,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.card,
  },
  modeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  modeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeTextActive: {
    color: colors.primary,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 32,
    ...shadows.card,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    ...shadows.fab,
  },
  saveBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  deleteBtn: {
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
});
