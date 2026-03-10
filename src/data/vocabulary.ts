/**
 * 문장에 나오는 어려운 단어 → 한글 설명 매핑
 * Night Input 등에서 문장 아래 "어려운 단어"로 표시
 */
export const VOCABULARY: Record<string, string> = {
  stretch: '쭉 펴다, 스트레칭하다',
  grateful: '감사하는',
  relax: '긴장을 풀다, 쉬다',
  fresh: '새로운, 신선한',
  focused: '집중된',
  deserve: '~할 자격이 있다',
  journey: '여정',
  achieve: '달성하다, 이루다',
  peaceful: '평화로운',
  confident: '자신감 있는',
  schedule: '일정',
  positive: '긍정적인',
  purpose: '목적',
  inspire: '영감을 주다',
  inspiring: '영감을 주는',
  attract: '끌어당기다',
  worthy: '가치 있는, ~할 자격이 있는',
  kindness: '친절',
  tidy: '정리하다, 깔끔한',
  handle: '다루다, 처리하다',
  welcome: '환영하다',
  rush: '서두르다',
  proud: '자랑스러운',
  focus: '집중하다',
  effort: '노력',
  control: '조절하다, 통제',
  charge: '충전하다',
  succeed: '성공하다',
  respect: '존경',
  spread: '퍼뜨리다, 베풀다',
  building: '만들어 가는',
  release: '놓아주다, 내보내다',
  stress: '스트레스, 긴장',
  pressure: '압박, 부담',
  organize: '정리하다, 조직하다',
  surrounded: '둘러싸인',
  create: '만들다',
  challenge: '도전',
  progress: '진전, 발전',
  perfection: '완벽',
  negative: '부정적인',
  define: '정의하다',
  appreciate: '감사히 여기다, 높이 평가하다',
  patient: '인내심 있는',
  balanced: '균형 잡힌',
  compare: '비교하다',
  posture: '자세',
  capable: '~할 수 있는, 유능한',
  possibilities: '가능성',
  courage: '용기',
  thankful: '감사하는',
  stick: '지키다, 고수하다',
  accept: '받아들이다',
  skip: '건너뛰다, 거르다',
  hydrated: '수분이 유지된',
  lift: '힘나게 하다, 들어 올리다',
  matters: '중요하다',
  permission: '허락',
  recover: '회복하다',
  brave: '용감한',
  avoid: '피하다',
  energy: '에너지',
  habits: '습관',
  adds: '더해지다 (add up: 모여 ~가 되다)',
  confidence: '자신감',
  throughout: '~동안 내내',
  single: '단 하나의',
  calm: '차분한',
  chance: '기회',
  review: '점검하다, 복습하다',
  growth: '성장',
  reach: '달성하다, 닿다',
  breathe: '숨쉬다',
  deeply: '깊이',
  attitude: '태도',
  choices: '선택',
  getting: '~해지고 있는 (get + 형용사)',
  reply: '답장하다',
  lead: '이끌다',
  treat: '대하다',
  jog: '조깅하다',
  practice: '연습하다',
};

/** 문장 텍스트에서 공백/구두점 제거 후 소문자 단어 목록 (중복 제거 순서 유지) */
function getWordsFromSentence(text: string): string[] {
  const normalized = text.replace(/[.,!?'"]/g, ' ').toLowerCase();
  const words = normalized.split(/\s+/).filter(Boolean);
  const seen = new Set<string>();
  return words.filter((w) => {
    if (seen.has(w)) return false;
    seen.add(w);
    return true;
  });
}

export interface VocabItem {
  word: string;
  meaning_ko: string;
}

/** 문장에 등장하는 어려운 단어와 설명 목록 반환 (등장 순서) */
export function getVocabularyForSentence(sentenceText: string): VocabItem[] {
  const words = getWordsFromSentence(sentenceText);
  const result: VocabItem[] = [];
  for (const word of words) {
    const meaning = VOCABULARY[word];
    if (meaning) result.push({ word, meaning_ko: meaning });
  }
  return result;
}
