import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ViewToken,
} from 'react-native';

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
  const flatListRef = useRef<FlatList<number>>(null);
  const isUserScrolling = useRef(false);
  const currentIndex = useRef(values.indexOf(selectedValue));

  // Scroll to selected value on mount
  useEffect(() => {
    const idx = values.indexOf(selectedValue);
    if (idx >= 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: idx * ITEM_HEIGHT,
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

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: number; index: number }) => {
      const isSelected = item === selectedValue;
      return (
        <View style={[styles.item, { height: ITEM_HEIGHT, width }]}>
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
    },
    [selectedValue, formatValue, width],
  );

  // Padding items so the first/last real items can be centered
  const paddingItems = Math.floor(VISIBLE_ITEMS / 2);

  return (
    <View style={[styles.container, { height: PICKER_HEIGHT, width }]}>
      {/* Selection highlight band */}
      <View style={styles.selectionHighlight} pointerEvents="none" />

      <FlatList
        ref={flatListRef}
        data={values}
        keyExtractor={(item) => item.toString()}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        bounces={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        contentContainerStyle={{
          paddingTop: paddingItems * ITEM_HEIGHT,
          paddingBottom: paddingItems * ITEM_HEIGHT,
        }}
        initialScrollIndex={values.indexOf(selectedValue)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#1E1E2E',
  },
  selectionHighlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    zIndex: 1,
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#FFFFFF',
  },
  itemTextSelected: {
    fontSize: 40,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  itemTextDimmed: {
    color: '#555',
  },
});
