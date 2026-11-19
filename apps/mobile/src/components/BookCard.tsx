import type { BookSummary } from '@storybook/shared-types';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, space, type as t, won } from '../theme';
import { AgeBadge } from './Badges';
import { Cover } from './Cover';

/** 가로로 넘기는 목록·격자용 카드 */
export function BookCard({ book, width }: { book: BookSummary; width: number }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/book/${book.id}`)}
      style={({ pressed }) => [{ width }, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
      accessibilityRole="button"
      accessibilityLabel={`${book.title}, ${book.ageMin}세부터 ${book.ageMax}세, ${won(book.price)}`}
    >
      <Cover url={book.coverUrl} width={width} label={book.title} />
      <View style={styles.meta}>
        <Text style={t.cardTitle} numberOfLines={2}>
          {book.title}
        </Text>
        <View style={styles.row}>
          <AgeBadge min={book.ageMin} max={book.ageMax} />
          <Text style={styles.price}>{won(book.price)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

/** 세로 목록용 줄 카드 (카테고리·검색 결과) */
export function BookRow({ book, rank }: { book: BookSummary; rank?: number }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/book/${book.id}`)}
      style={({ pressed }) => [styles.rowCard, pressed && { backgroundColor: colors.surfaceWarm }]}
      accessibilityRole="button"
      accessibilityLabel={`${rank ? `${rank}위, ` : ''}${book.title}, ${won(book.price)}`}
    >
      {rank ? <Text style={styles.rank}>{rank}</Text> : null}
      <Cover url={book.coverUrl} width={78} label={book.title} />
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={t.cardTitle} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={t.caption} numberOfLines={1}>
          {book.categories.map((c) => c.name).join(' · ')} · {book.pageCount}쪽
        </Text>
        <View style={styles.row}>
          <AgeBadge min={book.ageMin} max={book.ageMax} />
          <Text style={styles.price}>{won(book.price)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  meta: { marginTop: space.sm, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  price: { ...t.cardTitle, color: colors.primaryText, fontSize: 15 },
  rowCard: {
    flexDirection: 'row',
    gap: space.lg,
    alignItems: 'center',
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rank: { ...t.title, color: colors.primary, width: 22, textAlign: 'center' },
});
