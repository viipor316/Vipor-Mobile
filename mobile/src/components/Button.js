// VIPOR Service — shared button. Consistent height, radius, press feedback and
// loading state across the app. Variants: solid (default), soft, ghost.

import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { ui } from '../ui';

export default function Button({
  title, onPress, color = ui.navy, variant = 'solid', disabled, loading, style,
}) {
  const solid = variant === 'solid';
  const ghost = variant === 'ghost';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        solid && { backgroundColor: color },
        variant === 'soft' && { backgroundColor: color + '1A' },
        ghost && { backgroundColor: 'transparent' },
        pressed && !disabled && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={solid ? '#fff' : color} />
        : <Text style={[styles.text, { color: solid ? '#fff' : color }]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  text: { fontSize: 16, fontWeight: '700' },
});
