import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { UnlockMode } from '../types';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { settings, updateSetting } = useAppStore();

  const handleUnlockModeChange = (mode: UnlockMode) => {
    updateSetting('default_unlock_mode', mode);
  };

  const handleSnoozeToggle = (val: boolean) => {
    updateSetting('snooze_enabled', val.toString());
  };

  const handleSnoozeMinutes = (minutes: number) => {
    updateSetting('snooze_minutes', minutes.toString());
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
      <Text style={styles.title}>Settings</Text>

      {/* Default Unlock Mode */}
      <Text style={styles.sectionTitle}>Default Unlock Mode</Text>
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
            Voice
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
            Typing
          </Text>
        </TouchableOpacity>
      </View>

      {/* Snooze */}
      <Text style={styles.sectionTitle}>Snooze</Text>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Allow Snooze</Text>
        <Switch
          value={settings.snooze_enabled}
          onValueChange={handleSnoozeToggle}
          trackColor={{ false: '#555', true: '#4CAF50' }}
          thumbColor="#fff"
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
                {min} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Permissions */}
      <Text style={styles.sectionTitle}>Permissions</Text>
      <TouchableOpacity style={styles.permissionBtn} onPress={openAppSettings}>
        <View>
          <Text style={styles.permissionTitle}>App Permissions</Text>
          <Text style={styles.permissionDesc}>
            Manage notification and microphone access
          </Text>
        </View>
        <Text style={styles.permissionArrow}>→</Text>
      </TouchableOpacity>

      {/* App Info */}
      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.infoCard}>
        <Text style={styles.appName}>ENGZ Alarm</Text>
        <Text style={styles.appVersion}>Version 1.0.0 (MVP)</Text>
        <Text style={styles.appDesc}>
          Practice English every morning by speaking or typing to dismiss your alarm.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#AAA',
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    padding: 16,
  },
  rowLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  snoozeOptions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  snoozeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1E1E2E',
    alignItems: 'center',
  },
  snoozeBtnActive: {
    backgroundColor: '#4CAF50',
  },
  snoozeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  snoozeTextActive: {
    color: '#FFFFFF',
  },
  permissionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    padding: 16,
  },
  permissionTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  permissionDesc: {
    fontSize: 13,
    color: '#888',
  },
  permissionArrow: {
    fontSize: 20,
    color: '#888',
  },
  infoCard: {
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  appDesc: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
    lineHeight: 20,
  },
  backBtn: {
    marginTop: 32,
    paddingVertical: 12,
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 16,
    color: '#7C9EFF',
  },
});
