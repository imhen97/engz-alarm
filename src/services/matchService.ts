import { isVoiceMatch, isTypingMatch, matchScore } from '../utils/normalize';

export interface MatchResult {
  success: boolean;
  score: number;
}

export function checkVoiceMatch(target: string, spoken: string): MatchResult {
  const score = matchScore(target, spoken);
  return {
    success: isVoiceMatch(target, spoken),
    score,
  };
}

export function checkTypingMatch(target: string, typed: string): MatchResult {
  const score = matchScore(target, typed);
  return {
    success: isTypingMatch(target, typed),
    score,
  };
}
