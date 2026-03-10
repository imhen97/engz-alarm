/**
 * 문장 팩 정의: 설정 화면에서 선택 가능한 팩 목록
 */
export interface SentencePack {
  id: string;
  label: string;
  emoji: string;
  desc: string;
}

export const SENTENCE_PACKS: SentencePack[] = [
  { id: 'morning_basics', label: '아침 기본', emoji: '🌅', desc: '아침 인사·긍정 문장' },
  { id: 'daily_life', label: '일상 회화', emoji: '🏠', desc: '생활 속 자연스러운 표현' },
  { id: 'business', label: '비즈니스 영어', emoji: '💼', desc: '회의·이메일·업무 표현' },
  { id: 'travel', label: '여행 영어', emoji: '✈️', desc: '공항·숙소·관광 회화' },
  { id: 'emotions', label: '감정 표현', emoji: '💛', desc: '기분·감정 표현' },
  { id: 'slang', label: '슬랭 표현', emoji: '🔥', desc: '캐주얼·슬랭·구어체' },
  { id: 'csat', label: '수능 영어', emoji: '📚', desc: '수능 유형·빈칸·순서' },
  { id: 'ielts', label: 'IELTS', emoji: '🎓', desc: '아카데믹·시험 대비' },
];

export function getPackById(id: string): SentencePack | undefined {
  return SENTENCE_PACKS.find((p) => p.id === id);
}

export function getPackIds(): string[] {
  return SENTENCE_PACKS.map((p) => p.id);
}
