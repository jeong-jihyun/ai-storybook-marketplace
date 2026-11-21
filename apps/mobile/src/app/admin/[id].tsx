// ADM-002 관리자 · 동화 고치기 (글·그림·표지·가격·공개 여부·카테고리·목소리·움직임)
import { NARRATION_VOICES, type AdminBookDetail, type AdminPage, type BookStatus, type MotionCamera, type MotionParticles, type MotionTransition } from '@storybook/shared-types';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Chips } from '../../components/Chips';
import { Cover } from '../../components/Cover';
import { Check, Field } from '../../components/Field';
import { Notice } from '../../components/Notice';
import { Screen } from '../../components/Screen';
import { ErrorView, Loading } from '../../components/States';
import { useAdminBook, useCategories } from '../../hooks/queries';
import { api, ApiRequestError, resolveAsset } from '../../services/api';
import { PICK_MESSAGE, pickImageBase64 } from '../../services/pickImage';
import { useSession } from '../../store/session';
import { colors, fonts, MIN_TOUCH, radius, space, type as t } from '../../theme';

const STATUS_OPTIONS: { value: Extract<BookStatus, 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>; label: string }[] = [
  { value: 'PUBLISHED', label: '공개' },
  { value: 'DRAFT', label: '초안(숨김)' },
  { value: 'ARCHIVED', label: '보관' },
];
const CAMERA_OPTIONS: { value: MotionCamera; label: string }[] = [
  { value: 'auto', label: '자동' },
  { value: 'zoomIn', label: '천천히 확대' },
  { value: 'zoomOut', label: '천천히 축소' },
  { value: 'panLeft', label: '왼쪽으로' },
  { value: 'panRight', label: '오른쪽으로' },
  { value: 'still', label: '고정' },
];
const TRANSITION_OPTIONS: { value: MotionTransition; label: string }[] = [
  { value: 'slide', label: '옆으로 밀기' },
  { value: 'fade', label: '페이드' },
  { value: 'flip', label: '책장 넘기기' },
  { value: 'zoom', label: '줌' },
  { value: 'up', label: '위로 밀기' },
  { value: 'curtain', label: '커튼 열기' },
];
const PARTICLE_OPTIONS: { value: MotionParticles; label: string }[] = [
  { value: 'auto', label: '자동' },
  { value: 'sparkle', label: '반짝이' },
  { value: 'snow', label: '눈송이' },
  { value: 'none', label: '없음' },
];
const RATE_OPTIONS = [-20, -10, 0, 10, 20].map((n) => ({ value: String(n), label: n === 0 ? '보통' : n < 0 ? `느리게 ${-n}%` : `빠르게 ${n}%` }));
const VOICE_OPTIONS = NARRATION_VOICES.map((v) => ({ value: v.id as string, label: v.name }));

interface Form {
  title: string;
  description: string;
  keywords: string;
  price: string;
  ageMin: string;
  ageMax: string;
  previewPages: string;
  status: Extract<BookStatus, 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>;
  categorySlugs: string[];
  voice: string;
  rate: string;
  motionOn: boolean;
  camera: MotionCamera;
  particles: MotionParticles;
  transition: MotionTransition;
}

const toForm = (b: AdminBookDetail): Form => ({
  title: b.title,
  description: b.description,
  keywords: b.keywords.join(', '),
  price: String(b.price),
  ageMin: String(b.ageMin),
  ageMax: String(b.ageMax),
  previewPages: String(b.previewPages),
  status: (b.status === 'PUBLISHED' || b.status === 'ARCHIVED' ? b.status : 'DRAFT') as Form['status'],
  categorySlugs: b.categories.map((c) => c.slug),
  voice: b.narrationVoice,
  rate: String(b.narrationRate),
  motionOn: b.motion.enabled,
  camera: b.motion.camera,
  particles: b.motion.particles,
  transition: b.motion.transition ?? 'slide',
});

const intOr = (s: string, fallback: number) => (/^-?\d+$/.test(s.trim()) ? parseInt(s.trim(), 10) : fallback);

export default function AdminEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSession((s) => s.user);
  const q = useAdminBook(id);
  const cats = useCategories();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [newPage, setNewPage] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ emoji: string; title: string; message: string } | null>(null);

  // 서버에서 받은 값으로 입력칸 채우기 (처음 한 번 + 저장 뒤)
  const apply = (b: AdminBookDetail) => {
    qc.setQueryData(['admin-book', id], b);
    // 앱의 다른 화면(홈·상세·읽기)에도 바로 보이게
    void qc.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'admin-book' });
    setForm(toForm(b));
    setDrafts({});
  };
  useEffect(() => {
    if (q.data && !form) {
      setForm(toForm(q.data));
    }
  }, [q.data, form]);

  if (!user) return <Redirect href={{ pathname: '/login', params: { next: `/admin/${id}` } }} />;
  if (!user.isAdmin) return <Redirect href="/my" />;
  if (q.isLoading || (q.data && !form)) return <Screen edges={[]}><Loading label="동화를 불러오는 중…" /></Screen>;
  if (q.isError || !q.data || !form) return <Screen edges={[]}><ErrorView message={q.error?.message} onRetry={q.refetch} /></Screen>;
  const book = q.data;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const fail = (e: unknown) =>
    setNotice({ emoji: '😢', title: '저장하지 못했어요', message: e instanceof ApiRequestError ? e.message : '잠시 후 다시 시도해 주세요.' });

  /** 한 번에 하나씩만 (연타 방지) */
  const run = async (key: string, job: () => Promise<AdminBookDetail>, ok: { title: string; message: string }) => {
    if (busy) return;
    setBusy(key);
    try {
      apply(await job());
      setNotice({ emoji: '✅', ...ok });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const saveBook = () =>
    run(
      'book',
      () =>
        api.adminUpdateBook(id, {
          title: form.title.trim(),
          description: form.description.trim(),
          keywords: form.keywords.split(',').map((k) => k.trim()).filter(Boolean),
          price: intOr(form.price, book.price),
          ageMin: intOr(form.ageMin, book.ageMin),
          ageMax: intOr(form.ageMax, book.ageMax),
          previewPages: intOr(form.previewPages, book.previewPages),
          status: form.status,
          categorySlugs: form.categorySlugs,
          narrationVoice: form.voice as AdminBookDetail['narrationVoice'],
          narrationRate: intOr(form.rate, 0),
          motion: { enabled: form.motionOn, camera: form.camera, particles: form.particles, transition: form.transition },
        }),
      { title: '저장했어요', message: '고친 내용이 앱에 바로 반영돼요.\n목소리나 글을 바꿨다면 새 음성이 만들어질 때까지(보통 30분 안쪽) 소리 없이 그림만 움직여요.' },
    );

  const pickAndUpload = async (kind: 'cover' | number) => {
    if (busy) return;
    const r = await pickImageBase64(kind === 'cover' ? { aspect: [3, 4], maxWidth: 900 } : { aspect: [4, 3], maxWidth: 1280 });
    if (!r.ok) {
      if (r.reason !== 'canceled') setNotice({ emoji: '🖼️', title: '그림을 바꾸지 못했어요', message: PICK_MESSAGE[r.reason] });
      return;
    }
    await run(
      kind === 'cover' ? 'cover' : `img-${kind}`,
      () => (kind === 'cover' ? api.adminSetCover(id, r.base64) : api.adminSetPageImage(id, kind, r.base64)),
      { title: '그림을 바꿨어요', message: kind === 'cover' ? '새 표지가 바로 보여요.' : `${kind}쪽 그림이 바뀌었어요.` },
    );
  };

  const dirtyPage = (p: AdminPage) => drafts[p.pageNumber] !== undefined && drafts[p.pageNumber] !== p.content;
  const toggleCat = (slug: string) => set('categorySlugs', form.categorySlugs.includes(slug) ? form.categorySlugs.filter((s) => s !== slug) : [...form.categorySlugs, slug]);

  return (
    <Screen edges={['bottom']} form>
      <Stack.Screen options={{ title: book.title }} />
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <View style={styles.coverRow}>
          <Cover url={book.coverUrl} width={96} label={book.title} />
          <View style={{ flex: 1, gap: space.sm }}>
            <Text style={t.caption}>{book.pageCount}쪽 · 지금 상태: {STATUS_LABEL[book.status] ?? book.status}</Text>
            <View style={{ flexDirection: 'row' }}>
              <Button label={busy === 'cover' ? '올리는 중…' : '표지 바꾸기'} variant="secondary" disabled={!!busy} onPress={() => void pickAndUpload('cover')} />
            </View>
          </View>
        </View>

        <Text style={t.section}>기본 정보</Text>
        <Field label="제목" value={form.title} onChangeText={(v) => set('title', v)} maxLength={200} autoCapitalize="sentences" />
        <Field label="소개" value={form.description} onChangeText={(v) => set('description', v)} multiline maxLength={2000} autoCapitalize="sentences" />
        <Field label="찾기 낱말" hint="쉼표(,)로 나눠 적어요. 최대 10개" value={form.keywords} onChangeText={(v) => set('keywords', v)} />
        <Field label="가격 (원)" value={form.price} onChangeText={(v) => set('price', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}><Field label="나이 (최소)" value={form.ageMin} onChangeText={(v) => set('ageMin', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><Field label="나이 (최대)" value={form.ageMax} onChangeText={(v) => set('ageMax', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" /></View>
        </View>
        <Field label="무료 미리보기 쪽 수" hint={`전체 ${book.pageCount}쪽 안에서 정해요`} value={form.previewPages} onChangeText={(v) => set('previewPages', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />

        <Text style={t.section}>공개 여부</Text>
        <View style={styles.bleed}><Chips options={STATUS_OPTIONS} value={form.status} onChange={(v) => set('status', v)} /></View>
        <Text style={t.caption}>공개: 누구나 보고 살 수 있어요 · 초안: 숨겨져요 · 보관: 새로 못 사고, 산 사람은 계속 읽어요. 공개하려면 모든 쪽에 글이 있어야 해요.</Text>

        <Text style={t.section}>카테고리</Text>
        <View style={styles.wrap}>
          {(cats.data ?? []).map((c) => {
            const on = form.categorySlugs.includes(c.slug);
            return (
              <Pressable key={c.slug} onPress={() => toggleCat(c.slug)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={[styles.pill, on ? styles.pillOn : styles.pillOff]}>
                <Text style={[styles.pillText, { color: on ? colors.white : colors.inkSoft }]}>{c.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={t.section}>읽어주기</Text>
        <Text style={t.cardTitle}>목소리</Text>
        <View style={styles.bleed}><Chips options={VOICE_OPTIONS} value={form.voice} onChange={(v) => set('voice', v)} /></View>
        <Text style={t.cardTitle}>읽는 속도</Text>
        <View style={styles.bleed}><Chips options={RATE_OPTIONS} value={form.rate} onChange={(v) => set('rate', v)} /></View>
        <Text style={t.cardTitle}>쪽 넘김 효과</Text>
        <View style={styles.bleed}><Chips options={TRANSITION_OPTIONS} value={form.transition} onChange={(v) => set('transition', v)} /></View>
        <Check checked={form.motionOn} onChange={(v) => set('motionOn', v)} label="그림을 움직여요" sub="끄면 이 책은 그림이 가만히 있어요" />
        {form.motionOn ? (
          <>
            <Text style={t.cardTitle}>카메라 움직임</Text>
            <View style={styles.bleed}><Chips options={CAMERA_OPTIONS} value={form.camera} onChange={(v) => set('camera', v)} /></View>
            <Text style={t.cardTitle}>반짝이·눈송이</Text>
            <View style={styles.bleed}><Chips options={PARTICLE_OPTIONS} value={form.particles} onChange={(v) => set('particles', v)} /></View>
          </>
        ) : null}
        <Text style={t.caption}>목소리·속도는 저장한 뒤 새 음성이 만들어지면(보통 30분 안쪽) 들려요. 그 전에는 예전 음성이 나와요.</Text>

        <View style={{ flexDirection: 'row' }}>
          <Button label={busy === 'book' ? '저장하는 중…' : '설정 저장'} disabled={!!busy} onPress={() => void saveBook()} />
        </View>

        <Text style={[t.section, { marginTop: space.lg }]}>쪽 (글과 그림)</Text>
        <Text style={t.caption}>글을 고치고 그 쪽의 "글 저장"을 눌러요. 글을 고치면 그 쪽은 새 음성이 만들어질 때까지 소리가 나지 않아요.</Text>
        {book.pages.map((p) => (
          <View key={p.pageNumber} style={styles.pageCard}>
            <Text style={t.cardTitle}>{p.pageNumber}쪽</Text>
            <Image source={{ uri: resolveAsset(p.imageUrl) }} style={styles.pageImg} contentFit="cover" accessibilityLabel={`${p.pageNumber}쪽 그림`} />
            <View style={{ flexDirection: 'row' }}>
              <Button label={busy === `img-${p.pageNumber}` ? '올리는 중…' : '그림 바꾸기'} variant="secondary" disabled={!!busy} onPress={() => void pickAndUpload(p.pageNumber)} />
            </View>
            <Field label={`${p.pageNumber}쪽 글`} value={drafts[p.pageNumber] ?? p.content} onChangeText={(v) => setDrafts((d) => ({ ...d, [p.pageNumber]: v }))} multiline maxLength={2000} autoCapitalize="sentences" />
            <View style={{ flexDirection: 'row' }}>
              <Button
                label={busy === `txt-${p.pageNumber}` ? '저장하는 중…' : '글 저장'}
                disabled={!!busy || !dirtyPage(p) || !(drafts[p.pageNumber] ?? '').trim()}
                onPress={() => void run(`txt-${p.pageNumber}`, () => api.adminSetPage(id, p.pageNumber, drafts[p.pageNumber].trim()), { title: '글을 저장했어요', message: `${p.pageNumber}쪽 글이 바뀌었어요.\n새 음성은 보통 30분 안쪽에 만들어져요.` })}
              />
            </View>
          </View>
        ))}

        <View style={styles.pageCard}>
          <Text style={t.cardTitle}>새 쪽 맨 뒤에 붙이기</Text>
          <Field label="새 쪽 글" value={newPage} onChangeText={setNewPage} multiline maxLength={2000} autoCapitalize="sentences" hint="붙인 뒤에 그림을 바꿔 주세요 (처음엔 표지 그림이 들어가요)" />
          <View style={{ flexDirection: 'row' }}>
            <Button
              label={busy === 'add' ? '붙이는 중…' : '쪽 붙이기'}
              disabled={!!busy || !newPage.trim()}
              onPress={() => void run('add', async () => { const b = await api.adminAddPage(id, newPage.trim()); setNewPage(''); return b; }, { title: '쪽을 붙였어요', message: '맨 뒤에 새 쪽이 생겼어요. 그림도 바꿔 주세요.' })}
            />
          </View>
          {confirmDel ? (
            <View style={{ gap: space.sm }}>
              <Text style={[t.body, { color: colors.danger }]}>{book.pageCount}쪽(맨 뒤 쪽)을 지워요. 되돌릴 수 없어요.</Text>
              <View style={{ flexDirection: 'row', gap: space.md }}>
                <Button label="취소" variant="secondary" onPress={() => setConfirmDel(false)} />
                <Button label="지우기" disabled={!!busy} onPress={() => { setConfirmDel(false); void run('del', () => api.adminRemoveLastPage(id), { title: '맨 뒤 쪽을 지웠어요', message: '무료 미리보기 쪽 수도 알맞게 줄었는지 위에서 확인해 주세요.' }); }} />
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmDel(true)} disabled={book.pageCount <= 1 || !!busy} style={[styles.dangerBtn, (book.pageCount <= 1 || !!busy) && { opacity: 0.4 }]} accessibilityRole="button" accessibilityLabel="맨 뒤 쪽 지우기">
              <Text style={[t.cardTitle, { color: colors.danger }]}>맨 뒤 쪽 지우기</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
      <Notice visible={!!notice} emoji={notice?.emoji ?? ''} title={notice?.title ?? ''} message={notice?.message ?? ''} onClose={() => setNotice(null)} />
    </Screen>
  );
}

const STATUS_LABEL: Record<string, string> = { PUBLISHED: '공개 중', DRAFT: '초안(숨김)', ARCHIVED: '보관' };

const styles = StyleSheet.create({
  coverRow: { flexDirection: 'row', gap: space.lg, alignItems: 'center' },
  // Chips 는 가로 여백(xl)을 스스로 가지므로, 화면 여백만큼 바깥으로 빼서 끝까지 스크롤되게
  bleed: { marginHorizontal: -space.xl },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pill: { minHeight: 38, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: 'center', borderWidth: 1.5 },
  pillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillOff: { backgroundColor: colors.surface, borderColor: colors.line },
  pillText: { fontFamily: fonts.title, fontSize: 14 },
  pageCard: { gap: space.md, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  pageImg: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.surfaceWarm },
  dangerBtn: { minHeight: MIN_TOUCH, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
});
