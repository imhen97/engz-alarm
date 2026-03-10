import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ScrollView,
  Linking,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { UnlockMode } from '../types';
import { colors, shadows, borderRadius } from '../theme';
import { getLevelLabel, getLevelEmoji } from '../data/badges';
import { SENTENCE_PACKS } from '../data/sentencePacks';
import {
  rescheduleNightInputFromSettings,
  formatNightInputTime,
} from '../services/nightInputScheduler';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

export default function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { settings, updateSetting } = useAppStore();
  const [customTimeModalVisible, setCustomTimeModalVisible] = useState(false);
  const [customHour, setCustomHour] = useState(22);
  const [customMinute, setCustomMinute] = useState(0);

  const handleUnlockModeChange = (mode: UnlockMode) => {
    updateSetting('default_unlock_mode', mode);
  };

  const handleSnoozeToggle = (val: boolean) => {
    updateSetting('snooze_enabled', val.toString());
  };

  const handleSnoozeMinutes = (minutes: number) => {
    updateSetting('snooze_minutes', minutes.toString());
  };

  const handleNightInputTimeChange = async (time: string) => {
    await updateSetting('night_input_time', time);
    await rescheduleNightInputFromSettings({
      ...settings,
      night_input_time: time,
    });
  };

  const openCustomTimeModal = () => {
    const raw = settings.night_input_time ?? '22:00';
    if (raw === 'off') {
      setCustomHour(22);
      setCustomMinute(0);
    } else {
      const [h, m] = raw.split(':').map((s) => parseInt(s, 10) || 0);
      setCustomHour(Number.isNaN(h) ? 22 : Math.max(0, Math.min(23, h)));
      setCustomMinute(Number.isNaN(m) ? 0 : Math.max(0, Math.min(59, m)));
    }
    setCustomTimeModalVisible(true);
  };

  const applyCustomTime = async () => {
    const time = formatNightInputTime(customHour, customMinute);
    setCustomTimeModalVisible(false);
    await handleNightInputTimeChange(time);
  };

  const nightInputTime = settings.night_input_time ?? '22:00';
  const isNightInputOff = nightInputTime === 'off';
  const CUSTOM_MINUTES = [0, 15, 30, 45];
  const CUSTOM_HOURS = [18, 19, 20, 21, 22, 23];

  const handleLevelChange = (level: number) => {
    updateSetting('user_level', level.toString());
  };

  const handlePackToggle = (packId: string) => {
    const current = settings.selected_packs;
    let updated: string[];
    if (current.includes(packId)) {
      updated = current.filter((p) => p !== packId);
      if (updated.length === 0) updated = [packId];
    } else {
      updated = [...current, packId];
    }
    updateSetting('selected_packs', JSON.stringify(updated));
  };

  const PACKS = SENTENCE_PACKS;

  const LEVELS = Array.from({ length: 8 }, (_, i) => ({
    value: i + 1,
    label: getLevelLabel(i + 1),
    emoji: getLevelEmoji(i + 1),
  }));

  const handleRetakeTest = () => {
    navigation.navigate('LevelTest');
  };

  const openAppSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← 뒤로</Text>
      </TouchableOpacity>

      <Text style={styles.title}>설정 ⚙️</Text>

      {/* Default Unlock Mode */}
      <Text style={styles.sectionTitle}>기본 해제 방법</Text>
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[
            styles.modeBtn,
            settings.default_unlock_mode === 'voice' && styles.modeBtnActive,
          ]}
          onPress={() => handleUnlockModeChange('voice')}
        >
          <Text style={styles.modeIcon}>🎤</Text>
          <Text
            style={[
              styles.modeText,
              settings.default_unlock_mode === 'voice' && styles.modeTextActive,
            ]}
          >
            음성
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeBtn,
            settings.default_unlock_mode === 'typing' && styles.modeBtnActive,
          ]}
          onPress={() => handleUnlockModeChange('typing')}
        >
          <Text style={styles.modeIcon}>⌨️</Text>
          <Text
            style={[
              styles.modeText,
              settings.default_unlock_mode === 'typing' && styles.modeTextActive,
            ]}
          >
            타이핑
          </Text>
        </TouchableOpacity>
      </View>

      {/* Snooze */}
      <Text style={styles.sectionTitle}>스누즈</Text>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>스누즈 허용</Text>
        <Switch
          value={settings.snooze_enabled}
          onValueChange={handleSnoozeToggle}
          trackColor={{ false: colors.switchTrackOff, true: colors.switchTrackOn }}
          thumbColor={colors.white}
        />
      </View>

      {settings.snooze_enabled && (
        <View style={styles.snoozeOptions}>
          {[3, 5, 10].map((min) => (
            <TouchableOpacity
              key={min}
              style={[
                styles.snoozeBtn,
                settings.snooze_minutes === min && styles.snoozeBtnActive,
              ]}
              onPress={() => handleSnoozeMinutes(min)}
            >
              <Text
                style={[
                  styles.snoozeText,
                  settings.snooze_minutes === min && styles.snoozeTextActive,
                ]}
              >
                {min}분
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 하루에 배울 문장 수 */}
      <Text style={styles.sectionTitle}>하루에 배울 문장 수</Text>
      <View style={styles.nightRow}>
        {[1, 2, 3].map((n) => (
          <TouchableOpacity
            key={n}
            style={[
              styles.nightBtn,
              (settings.daily_new_sentences ?? 2) === n && styles.nightBtnActive,
            ]}
            onPress={() => updateSetting('daily_new_sentences', String(n))}
          >
            <Text
              style={[
                styles.nightText,
                (settings.daily_new_sentences ?? 2) === n && styles.nightTextActive,
              ]}
            >
              {n}문장
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.nightHint}>
        Night Input와 오늘 알람에서 이 개수만큼 같은 문장이 사용돼요.
      </Text>

      {/* Night Input */}
      <Text style={styles.sectionTitle}>Night Input 알림 시간</Text>
      <View style={styles.nightRow}>
        <TouchableOpacity
          style={[styles.nightBtn, !isNightInputOff && styles.nightBtnActive]}
          onPress={openCustomTimeModal}
        >
          <Text
            style={[
              styles.nightText,
              !isNightInputOff && styles.nightTextActive,
            ]}
          >
            {isNightInputOff ? '시간 설정' : nightInputTime}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nightBtn, isNightInputOff && styles.nightBtnActive]}
          onPress={() => handleNightInputTimeChange('off')}
        >
          <Text
            style={[
              styles.nightText,
              isNightInputOff && styles.nightTextActive,
            ]}
          >
            끄기
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.nightHint}>
        시간 설정에서 알림 시각을 정할 수 있어요.
      </Text>

      {/* 맞춤 시간 모달 */}
      <Modal
        visible={customTimeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomTimeModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCustomTimeModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>알림 시간</Text>
            <View style={styles.modalRow}>
              <View style={styles.modalColumn}>
                <Text style={styles.modalLabel}>시</Text>
                <ScrollView style={styles.modalScroll} nestedScrollEnabled>
                  {CUSTOM_HOURS.map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[
                        styles.modalOption,
                        customHour === h && styles.modalOptionActive,
                      ]}
                      onPress={() => setCustomHour(h)}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          customHour === h && styles.modalOptionTextActive,
                        ]}
                      >
                        {String(h).padStart(2, '0')}시
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.modalColumn}>
                <Text style={styles.modalLabel}>분</Text>
                <ScrollView style={styles.modalScroll} nestedScrollEnabled>
                  {CUSTOM_MINUTES.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.modalOption,
                        customMinute === m && styles.modalOptionActive,
                      ]}
                      onPress={() => setCustomMinute(m)}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          customMinute === m && styles.modalOptionTextActive,
                        ]}
                      >
                        {String(m).padStart(2, '0')}분
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <Text style={styles.modalPreview}>
              {formatNightInputTime(customHour, customMinute)}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCustomTimeModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={applyCustomTime}
              >
                <Text style={styles.modalConfirmText}>확인</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* User Level */}
      <Text style={styles.sectionTitle}>나의 영어 레벨</Text>
      <View style={styles.levelRow}>
        {LEVELS.map((lvl) => (
          <TouchableOpacity
            key={lvl.value}
            style={[
              styles.levelBtn,
              settings.user_level === lvl.value && styles.levelBtnActive,
            ]}
            onPress={() => handleLevelChange(lvl.value)}
          >
            <Text style={styles.levelEmoji}>{lvl.emoji}</Text>
            <Text
              style={[
                styles.levelText,
                settings.user_level === lvl.value && styles.levelTextActive,
              ]}
            >
              {lvl.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.levelHint}>
        성공률에 따라 난이도가 자동으로 조절됩니다
      </Text>
      <TouchableOpacity style={styles.retakeBtn} onPress={handleRetakeTest}>
        <Text style={styles.retakeBtnText}>📝 레벨 테스트 다시하기</Text>
      </TouchableOpacity>

      {/* Sentence Packs */}
      <Text style={styles.sectionTitle}>문장 팩 선택</Text>
      <View style={styles.packGrid}>
        {PACKS.map((pack) => {
          const isSelected = settings.selected_packs.includes(pack.id);
          return (
            <TouchableOpacity
              key={pack.id}
              style={[
                styles.packCard,
                isSelected && styles.packCardActive,
              ]}
              onPress={() => handlePackToggle(pack.id)}
            >
              <Text style={styles.packEmoji}>{pack.emoji}</Text>
              <Text
                style={[
                  styles.packLabel,
                  isSelected && styles.packLabelActive,
                ]}
              >
                {pack.label}
              </Text>
              <Text style={styles.packDesc}>{pack.desc}</Text>
              {isSelected && <Text style={styles.packCheck}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Permissions */}
      <Text style={styles.sectionTitle}>권한</Text>
      <TouchableOpacity style={styles.permissionBtn} onPress={openAppSettings}>
        <View>
          <Text style={styles.permissionTitle}>앱 권한 설정</Text>
          <Text style={styles.permissionDesc}>
            알림 및 마이크 접근 관리
          </Text>
        </View>
        <Text style={styles.permissionArrow}>→</Text>
      </TouchableOpacity>

      {/* App Info */}
      <Text style={styles.sectionTitle}>정보</Text>
      <View style={styles.infoCard}>
        <Text style={styles.appName}>ENGZ Alarm ✨</Text>
        <Text style={styles.appVersion}>버전 1.0.0</Text>
        <Text style={styles.appDesc}>
          매일 아침 영어 문장을 말하거나 타이핑해서 알람을 해제하세요.
        </Text>
      </View>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    marginTop: 24,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: 16,
    ...shadows.card,
  },
  rowLabel: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  snoozeOptions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  snoozeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    ...shadows.card,
  },
  snoozeBtnActive: {
    backgroundColor: colors.primary,
  },
  snoozeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  snoozeTextActive: {
    color: colors.white,
  },
  nightRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  nightBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  nightBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  nightText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  nightTextActive: {
    color: colors.white,
  },
  nightHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: 24,
    ...shadows.card,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  modalColumn: {
    flex: 1,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  modalScroll: {
    maxHeight: 160,
  },
  modalOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    marginBottom: 4,
    backgroundColor: colors.background,
  },
  modalOptionActive: {
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalOptionTextActive: {
    color: colors.primary,
  },
  modalPreview: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  levelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  levelBtn: {
    width: '23%' as any,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.card,
  },
  levelBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  levelEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  levelText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  levelTextActive: {
    color: colors.primary,
  },
  levelHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  retakeBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  retakeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  packGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  packCard: {
    width: '47%' as any,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    ...shadows.card,
  },
  packCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  packEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  packLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  packLabelActive: {
    color: colors.primary,
  },
  packDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  packCheck: {
    position: 'absolute',
    top: 8,
    right: 10,
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  permissionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: 16,
    ...shadows.card,
  },
  permissionTitle: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  permissionDesc: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  permissionArrow: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: 20,
    alignItems: 'center',
    ...shadows.card,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  appDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
