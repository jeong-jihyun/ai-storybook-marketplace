import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { activeSentenceIndex, splitSentences, type Cue } from '../motion/captions';
import { colors } from '../theme';

/** 본문을 보여 주고, 목소리가 읽는 문장을 노란 형광펜으로 따라간다 (자막 켜짐일 때) */
export function NarratedText({
  text,
  cues,
  on,
  subscribe,
  style,
}: {
  text: string;
  cues: Cue[];
  on: boolean;
  subscribe: ((l: (t: number) => void) => () => void) | null;
  style: StyleProp<TextStyle>;
}) {
  const sentences = useMemo(() => splitSentences(text), [text]);
  const [idx, setIdx] = useState(-1);
  useEffect(() => {
    if (!on || !subscribe) {
      setIdx(-1);
      return;
    }
    return subscribe((t) => setIdx(t > 0.05 ? activeSentenceIndex(sentences, cues, t) : -1));
  }, [on, subscribe, sentences, cues]);

  if (idx < 0) return <Text style={style}>{text}</Text>;
  return (
    <Text style={style}>
      {sentences.map((s, i) => (
        <Text key={i} style={i === idx ? styles.hl : undefined}>
          {s}
          {i < sentences.length - 1 ? ' ' : ''}
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  hl: { backgroundColor: colors.sun },
});
