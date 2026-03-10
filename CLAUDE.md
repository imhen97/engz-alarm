# ENGZ Alarm - 프로젝트 가이드

## 프로젝트 개요

**ENGZ Alarm**은 매일 아침 알람 해제 시 영어 문장을 말하거나 타이핑해서 해제하는 영어 학습 알람 앱입니다.

- **프레임워크**: React Native (Expo SDK 54)
- **언어**: TypeScript
- **상태 관리**: Zustand
- **데이터베이스**: SQLite (expo-sqlite)
- **패키지 매니저**: pnpm

## 주요 기능

### 1. 알람 관리
- 여러 알람 생성/수정/삭제
- 반복 요일 설정 (비트마스크: Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64)
- 알람 활성화/비활성화
- 스누즈 기능 (3/5/10분)

### 2. 알람 해제 (Ringing)
- **음성 모드**: 문장을 말해서 해제 (expo-speech-recognition)
- **타이핑 모드**: 문장을 타이핑해서 해제
- 문장 난이도는 사용자 레벨에 맞춰 자동 선택
- 성공률에 따라 난이도 조절 (적응형 학습)
- 성공 시 XP 획득, 레벨업 시스템

### 3. Night Input
- 전날 밤에 내일 아침 알람 문장 미리 보기
- 설정한 시간(기본 22:00)에 알림
- 하루에 배울 문장 수 설정 (1~3문장)
- 가로 스와이프로 여러 문장 확인
- 어려운 단어 설명 표시
- 문장 TTS 재생

### 4. 레벨 시스템
- **8단계 레벨**: Baby Talker → Word Explorer → Sentence Builder → Small Talker → Conversation Maker → Smooth Talker → Free Talker → Native Vibes
- 레벨별 문장 난이도 범위:
  - Level 1-2: 난이도 1만 (쉬운 문장)
  - Level 3-4: 난이도 1~2
  - Level 5-6: 난이도 2~3
  - Level 7-8: 난이도 3만 (어려운 문장)
- 서브 레벨: 복습 퀴즈 통과 시 +1
- XP 시스템: 알람 해제 성공 시 획득

### 5. 오늘의 문장 세트
- 하루에 배울 문장 수 설정 (1, 2, 3)
- 날짜가 바뀌면 설정한 개수만큼 적응형 문장 선택
- 같은 날 모든 알람(아침 + 추가 알람)에서 동일한 문장 세트 사용
- Night Input에서 미리 확인 가능

### 6. 퀴즈
- **오늘의 문장 퀴즈**: 오늘 배운 문장으로 뜻 맞추기
- **누적 문장 퀴즈**: 지금까지 성공한 문장 중 랜덤으로 퀴즈
- **복습 퀴즈**: 새 표현 5개 배우면 자동으로 열림, 통과 시 서브 레벨 +1

### 7. 문장 팩
- morning_basics, travel, business, daily_life, emotions 등
- 사용자가 원하는 팩 선택 가능
- 선택한 팩의 문장만 학습에 사용

### 8. AI 강아지 + 캐시(코인)
- **캐시**: 알람 해제 성공 시 XP와 동일한 양 지급, 레벨 테스트 완료 시에도 초기 XP만큼 지급. 상점에서 먹이·장식 구매에 사용.
- **강아지**: 사용자 레벨에 따라 성장 단계 변경 (puppy → teen → adult → hero). 포만감(hunger)·기분(mood) 표시, 먹이 주기·꾸미기 가능.
- **상점**: 먹이(포만감 회복), 장식(모자/스카프/배경) 구매. 펫 화면에서 먹이 주기·장식 착용.
- 상세 설계: `docs/PET_AND_COINS_DESIGN.md`

## 프로젝트 구조

```
src/
├── components/          # 재사용 컴포넌트
│   ├── AlarmCard.tsx
│   ├── ScrollPicker.tsx
│   ├── VoiceIndicator.tsx
│   ├── PetCharacter.tsx # 강아지 캐릭터 (성장 단계·기분 표시)
│   └── ...
├── data/                # 정적 데이터
│   ├── sentences.json   # 문장 데이터 (400개)
│   ├── vocabulary.ts    # 어려운 단어 설명
│   ├── badges.ts        # 레벨/배지 정의
│   ├── shopItems.ts     # 상점 먹이·장식 정의
│   └── levelTestQuestions.json
├── db/                  # 데이터베이스 레포지토리
│   ├── sqlite.ts        # DB 초기화 (pet_state, inventory 포함)
│   ├── alarmRepo.ts
│   ├── sentenceRepo.ts  # 문장 조회 (적응형 선택 로직)
│   ├── progressRepo.ts  # 학습 진행도, XP, 배지
│   ├── coinRepo.ts      # 코인 잔액
│   ├── petRepo.ts       # 펫 상태 (hunger, mood, 장식 착용)
│   ├── inventoryRepo.ts # 인벤토리 (먹이 수량, 장식 보유)
│   └── streakRepo.ts    # 연속 기록
├── navigation/          # 네비게이션
│   ├── AppNavigator.tsx
│   ├── types.ts
│   └── navigationRef.ts
├── screens/             # 화면 컴포넌트
│   ├── HomeScreen.tsx
│   ├── AlarmEditScreen.tsx
│   ├── RingingScreen.tsx
│   ├── SettingsScreen.tsx
│   ├── NightInputScreen.tsx
│   ├── StreakScreen.tsx
│   ├── LevelTestScreen.tsx
│   ├── ReviewQuizScreen.tsx
│   ├── SentenceQuizScreen.tsx
│   ├── PetScreen.tsx    # 강아지 홈 (먹이 주기, 꾸미기, 상점 이동)
│   └── ShopScreen.tsx   # 상점 (먹이·장식 구매)
├── services/            # 비즈니스 로직
│   ├── alarmScheduler.ts      # 알람 스케줄링 (expo-notifications)
│   ├── sentenceService.ts     # 문장 서비스
│   ├── dailySentencesService.ts # 오늘의 문장 세트 관리
│   ├── coinService.ts         # 코인 지급/소비
│   ├── petService.ts          # 펫 상태·먹이주기·성장단계
│   ├── speechService.ts       # 음성 인식
│   ├── ttsService.ts          # TTS (자연스러운 음성)
│   ├── nightInputScheduler.ts # Night Input 알림
│   └── matchService.ts        # 음성/타이핑 매칭
├── store/               # Zustand 상태 관리
│   └── useAppStore.ts
├── types/               # TypeScript 타입 정의
│   └── index.ts
├── theme.ts             # 디자인 시스템 (색상, 그림자 등)
└── utils/               # 유틸리티 함수
```

## 주요 규칙 및 가이드라인

### 패키지 매니저
- **항상 `pnpm` 사용** (npm 대신)
- `npm run dev` 같은 명령어로 서버를 직접 실행하지 말고, 사용자에게 실행 요청만 전달

### 코드 스타일
- TypeScript 사용
- 함수형 컴포넌트 + Hooks
- Zustand로 전역 상태 관리
- SQLite로 로컬 데이터 저장

### 알림 시스템
- `expo-notifications` 사용
- 알람 해제: `trigger.type = SchedulableTriggerInputTypes.DATE`
- Night Input: `trigger.type = SchedulableTriggerInputTypes.DAILY`
- 알림 데이터에 `alarmId`, `unlockMode`, `type` 포함

### TTS (Text-to-Speech)
- `expo-speech` 사용
- 앱 시작 시 `initPreferredVoices()` 호출하여 Enhanced 음성 선택
- 말속도: 0.88 (자연스러운 속도)
- 피치: 1.0 (기본값)

### 문장 선택 로직
- 레벨별 난이도 범위를 벗어나지 않음
- 최근 성공률에 따라 난이도 미세 조정 (범위 내에서만)
- 최근 20개 문장은 제외하여 반복 방지
- 선택한 팩(pack_id) 내에서만 선택

### 데이터베이스
- SQLite 테이블:
  - `alarms`: 알람 정보
  - `sentences`: 문장 데이터
  - `sentence_history`: 시도 기록 (성공/실패, 점수)
  - `settings`: 앱 설정 (key-value)
  - `user_progress`: XP, 배지, 학습 게이지 등
  - `badges`: 획득한 배지
  - `streaks`: 연속 기록

## 개발 명령어

```bash
# Metro 번들러 시작
pnpm start

# Android에서 실행 (Metro 자동 시작)
pnpm android

# iOS에서 실행
pnpm ios

# 웹에서 실행
pnpm web
```

## 주의사항

### Android 에뮬레이터 연결
- Metro가 실행 중이어야 앱이 정상 작동
- "Unable to load script" 오류 시:
  1. `pnpm start`로 Metro 실행
  2. `adb reverse tcp:8081 tcp:8081` 실행
  3. 에뮬레이터에서 앱 재실행

### 알림 권한
- Android 13+: 알림 권한 요청 필요
- 알림 채널 생성 후 권한 요청 (`setNotificationChannelAsync`)

### 음성 인식
- Development Build 필요 (Expo Go에서는 제한적)
- `expo-speech-recognition` 사용

## 주요 파일 설명

### `src/services/dailySentencesService.ts`
- 오늘의 문장 세트 관리
- 날짜가 바뀌면 새로 선택, 같은 날은 재사용
- `getOrCreateDailySentences()`: 오늘의 문장 세트 반환
- `pickOneFromDaily()`: 세트에서 랜덤 1개 선택 (알람 해제용)

### `src/db/sentenceRepo.ts`
- 문장 조회 및 적응형 선택
- `getAdaptiveSentence()`: 레벨에 맞는 문장 1개 선택
- `getAdaptiveSentences()`: 레벨에 맞는 문장 N개 선택 (중복 없음)
- 레벨별 난이도 범위 제한 (`LEVEL_DIFFICULTY_BAND`)

### `src/services/ttsService.ts`
- TTS 서비스 (자연스러운 음성)
- `initPreferredVoices()`: Enhanced 음성 선택
- `speak()`: 영어 문장 읽기
- `speakKorean()`: 한국어 문장 읽기
- `startRepeating()`: 영어 → 한국어 반복 재생

### `src/data/vocabulary.ts`
- 어려운 단어 → 한글 설명 매핑
- `getVocabularyForSentence()`: 문장에 등장하는 어려운 단어 추출

## 테스트 및 디버깅

- React Native Debugger 사용 가능
- SQLite 데이터는 앱 내부에 저장 (`expo-sqlite`)
- 알림 테스트는 실제 기기/에뮬레이터에서 필요
- 음성 인식은 Development Build에서만 정상 작동

## 향후 개선 가능 영역

- 문장 데이터 확장 (더 많은 팩, 더 많은 문장)
- 어휘 데이터 확장 (vocabulary.ts)
- 복습 퀴즈 로직 개선
- 통계 화면 추가
- 다국어 지원
