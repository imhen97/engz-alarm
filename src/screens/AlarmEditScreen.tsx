import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import ScrollPicker from '../components/ScrollPicker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { v4 as uuidv4 } from 'uuid';
import { useAppStore } from '../store/useAppStore';
import { Alarm, UnlockMode, DAYS } from '../types';
import { daysToRepeatMask, repeatMaskToDays } from '../utils/time';
import { scheduleAlarm, rescheduleAllAlarms } from '../services/alarmScheduler';
import { RootStackParamList } from '../navigation/types';

type EditNav = NativeStackNavigationProp<RootStackParamList, 'AlarmEdit'>;
type EditRoute = RouteProp<RootStackParamList, 'AlarmEdit'>;

export default function AlarmEditScreen() {
  const navigation = useNavigation<EditNav>();
  const route = useRoute<EditRoute>();
  const { alarms, addAlarm, updateAlarm, removeAlarm, settings } = useAppStore();

  const editingId = route.params?.alarmId;
  const existingAlarm = editingId
    ? alarms.find((a) => a.id === editingId)
    : null;

  const [hour, setHour] = useState(existingAlarm?.hour ?? 7);
  const [minute, setMinute] = useState(existingAlarm?.minute ?? 0);
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

  const handleSave = async () => {
    const alarm: Alarm = {
      id: editingId ?? uuidv4(),
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
    Alert.alert('Delete Alarm', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
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

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{editingId ? 'Edit Alarm' : 'New Alarm'}</Text>

      {/* Time Picker */}
      <View style={styles.timeContainer}>
        <ScrollPicker
          values={hours}
          selectedValue={hour}
          onValueChange={setHour}
        />
        <Text style={styles.timeSeparator}>:</Text>
        <ScrollPicker
          values={minutes}
          selectedValue={minute}
          onValueChange={setMinute}
        />
      </View>

      {/* Repeat Days */}
      <Text style={styles.sectionTitle}>Repeat</Text>
      <View style={styles.daysRow}>
        {DAYS.map((day, idx) => (
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
      <Text style={styles.sectionTitle}>Unlock Mode</Text>
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
            Voice
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
            Typing
          </Text>
        </TouchableOpacity>
      </View>

      {/* Label */}
      <Text style={styles.sectionTitle}>Label (optional)</Text>
      <TextInput
        style={styles.input}
        value={label}
        onChangeText={setLabel}
        placeholder="e.g., Wake up for work"
        placeholderTextColor="#666"
        maxLength={50}
      />

      {/* Save Button */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>
          {editingId ? 'Save Changes' : 'Create Alarm'}
        </Text>
      </TouchableOpacity>

      {/* Delete Button */}
      {editingId && (
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete Alarm</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121218',
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 32,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  timeSeparator: {
    fontSize: 48,
    fontWeight: '300',
    color: '#FFFFFF',
    marginHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#AAA',
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
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1E1E2E',
    alignItems: 'center',
  },
  dayBtnActive: {
    backgroundColor: '#4CAF50',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#1E1E2E',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeBtnActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#1a2e1a',
  },
  modeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  modeTextActive: {
    color: '#4CAF50',
  },
  input: {
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 32,
  },
  saveBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
});
