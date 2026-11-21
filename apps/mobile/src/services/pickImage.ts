import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

const MAX_BYTES = 3 * 1024 * 1024; // 서버 한도(디코딩 후 3MB)

export type PickResult = { ok: true; base64: string; uri: string } | { ok: false; reason: 'canceled' | 'denied' | 'too-big' | 'error' };

/**
 * 갤러리에서 그림을 골라 가로 maxWidth 로 줄이고 JPEG 로 바꿔 base64 로 돌려준다.
 * (폰 사진은 10MB 가 넘는 경우가 많아서, 올리기 전에 줄이는 게 꼭 필요하다.)
 */
export async function pickImageBase64(opts: { aspect: [number, number]; maxWidth: number }): Promise<PickResult> {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted && perm.canAskAgain === false) return { ok: false, reason: 'denied' };
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: opts.aspect, quality: 1 });
    if (res.canceled || !res.assets?.[0]) return { ok: false, reason: 'canceled' };
    const asset = res.assets[0];
    for (const compress of [0.85, 0.7, 0.55]) {
      const ctx = ImageManipulator.ImageManipulator.manipulate(asset.uri);
      if (asset.width > opts.maxWidth) ctx.resize({ width: opts.maxWidth });
      const img = await ctx.renderAsync();
      const out = await img.saveAsync({ format: ImageManipulator.SaveFormat.JPEG, compress, base64: true });
      if (out.base64 && out.base64.length * 0.75 <= MAX_BYTES) return { ok: true, base64: out.base64, uri: out.uri };
    }
    return { ok: false, reason: 'too-big' };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

export const PICK_MESSAGE: Record<Exclude<PickResult, { ok: true }>['reason'], string> = {
  canceled: '',
  denied: '사진을 볼 수 있는 권한이 꺼져 있어요. 기기 설정에서 사진 권한을 켜 주세요.',
  'too-big': '그림이 너무 커요. 더 작은 그림을 골라 주세요.',
  error: '그림을 읽지 못했어요. 다른 그림으로 다시 해 보세요.',
};
