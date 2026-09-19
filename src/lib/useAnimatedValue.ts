import { useState } from 'react';
import { Animated } from 'react-native';

export function useAnimatedValue(initialValue: number): Animated.Value {
  const [value] = useState(() => new Animated.Value(initialValue));
  return value;
}
