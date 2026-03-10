import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { colors, borderRadius } from '../theme';

const ITEM_HEIGHT = 54;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface ScrollPickerProps {
  values: number[];
  selectedValue: number;
  onValueChange: (value: number) => void;
  formatValue?: (value: number) => string;
  width?: number;
}

export default function ScrollPicker({
  values,
  selectedValue,
  onValueChange,
  formatValue = (v) => v.toString().padStart(2, '0'),
  width = 100,
}: ScrollPickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const currentIndex = useRef(values.indexOf(selectedValue));

  const paddingItems = Math.floor(VISIBLE_ITEMS / 2);

  useEffect(() => {
    const idx = values.indexOf(selectedValue);
    if (idx >= 0 && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: idx * ITEM_HEIGHT,
          animated: false,
        });
      }, 50);
    }
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const idx = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIdx = Math.max(0, Math.min(idx, values.length - 1));
      if (values[clampedIdx] !== undefined) {
        currentIndex.current = clampedIdx;
        onValueChange(values[clampedIdx]);
      }
    },
    [values, onValueChange],
  );

  return (
    <View style={[styles.container, { height: PICKER_HEIGHT, width }]}>
      <View style={styles.selectionHighlight} pointerEvents="none" />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        bounces={false}
        nestedScrollEnabled={true}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        contentContainerStyle={{
          paddingTop: paddingItems * ITEM_HEIGHT,
          paddingBottom: paddingItems * ITEM_HEIGHT,
        }}
      >
        {values.map((item) => {
          const isSelected = item === selectedValue;
          return (
            <View key={item} style={[styles.item, { height: ITEM_HEIGHT, width }]}>
              <Text
                style={[
                  styles.itemText,
                  isSelected && styles.itemTextSelected,
                  !isSelected && styles.itemTextDimmed,
                ]}
              >
                {formatValue(item)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
  },
  selectionHighlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.25)',
    zIndex: 1,
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 32,
    fontWeight: '300',
    color: colors.textPrimary,
  },
  itemTextSelected: {
    fontSize: 40,
    fontWeight: '600',
    color: colors.primary,
  },
  itemTextDimmed: {
    color: colors.textMuted,
  },
});
