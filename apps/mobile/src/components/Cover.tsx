import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { resolveAsset } from '../services/api';
import { colors, radius, shadow } from '../theme';

/** 동화책 표지 (가로:세로 = 3:4) */
export function Cover({ url, width, style, label }: { url: string; width: number; style?: StyleProp<ViewStyle>; label?: string }) {
  return (
    <View style={[styles.wrap, shadow, { width, height: (width * 4) / 3 }, style]}>
      <Image
        source={{ uri: resolveAsset(url) }}
        style={styles.img}
        contentFit="cover"
        transition={200}
        accessibilityLabel={label ? `${label} 표지` : '동화책 표지'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.md, backgroundColor: colors.surfaceWarm, overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
});
