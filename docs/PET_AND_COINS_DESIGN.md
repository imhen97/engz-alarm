# AI 강아지 캐릭터 + 캐시(코인) 시스템 설계

## 목표
- **레벨과 함께 자라는** 살아 움직이는 AI 강아지 캐릭터
- **XP와 연동된 캐시(코인)**로 먹이/꾸미기 구매 → 앱 체류 시간·재방문 동기 부여

---

## 1. 경제 시스템

### 1.1 XP vs 코인
| 구분 | XP | 코인(캐시) |
|------|----|------------|
| 용도 | 레벨 산정 (기존 유지) | 상점에서 먹이·장식 구매 |
| 획득 | 알람 해제 성공 시 (난이도×10) | **동일 시점에 같은 양 또는 비율로 지급** |
| 소비 | 없음 (누적만) | 먹이 구매, 장식 구매 시 차감 |

- **정책**: 알람 해제로 XP를 얻을 때 **같은 양만큼 코인도 지급** (예: 10 XP → 10 코인).  
  레벨은 XP로만 결정되므로, 코인을 써도 레벨에는 영향 없음.

### 1.2 코인 획득/소비
- **획득**: `RingingScreen`에서 알람 해제 성공 시 `grantCoinsOnSuccess(xpAmount)` 호출. 레벨 테스트 완료 시에도 초기 XP와 동일한 양으로 `grantCoinsOnSuccess(initialXP)` 호출.
- **소비**: 상점에서 아이템 구매 시 `spendCoins(amount)` 호출
- **저장**: `user_progress` 테이블 `coins` 키

---

## 2. 강아지 캐릭터 (Pet)

### 2.1 성장 단계 (레벨 연동)
사용자 **레벨(1~8)**에 따라 강아지 외형/단계 변경:

| 사용자 레벨 | 강아지 단계 | 설명 |
|-------------|-------------|------|
| 1–2 | `puppy` | 아기 강아지 |
| 3–4 | `teen` | 꼬마 강아지 |
| 5–6 | `adult` | 어른 강아지 |
| 7–8 | `hero` | 멋진/히어로 강아지 |

- 레벨업 시 **다음 앱 진입 시** 또는 **펫 화면 진입 시** 단계만 갱신하면 됨 (DB에 `growth_stage` 저장).

### 2.2 상태 (살아 움직이는 느낌)
- **mood**: `happy` | `normal` | `hungry` | `sleepy`  
  - 배고픔·마지막 먹이 시간에 따라 계산 (밑에서 정의).
- **hunger**: 0~100.  
  - 시간 경과에 따라 감소 (예: 24시간에 20 감소).  
  - 먹이 사용 시 `hunger_restore`만큼 증가 (상한 100).
- **last_fed_at**: 마지막으로 먹이를 준 시각 (ISO 문자열).
- **애니메이션**:  
  - idle, happy, eating, sleeping 등 **상태별 스프라이트/Lottie** 전환으로 “살아움직이는” 느낌.

### 2.3 저장 구조 (pet_state)
- 한 유저당 강아지 1마리.
- 필드 예: `growth_stage`, `mood`, `hungry`, `last_fed_at`, `equipped_hat_id`, `equipped_background_id` 등.
- DB: `pet_state` 테이블 (단일 행) 또는 `user_progress` 키들 (`pet_*`).

---

## 3. 상점 (Shop)

### 3.1 아이템 종류
1. **먹이 (Food)**  
   - id, name_ko, emoji, coin_cost, hunger_restore  
   - 구매 시 인벤토리에 수량 추가 → “먹이주기” 시 1개 소비, hunger 증가.
2. **장식 (Decoration)**  
   - id, name_ko, emoji, coin_cost, slot (`hat` | `scarf` | `background` 등)  
   - 구매 시 **영구 보유**, 장착/해제만 가능.

### 3.2 인벤토리
- **owned_food**: (item_id, quantity) — 먹이별 보유 개수.
- **owned_decorations**: item_id[] — 보유한 장식 ID (영구).
- **equipped**: pet_state에 hat_id, background_id 등으로 “지금 착용 중” 저장.

---

## 4. 화면·플로우

### 4.1 펫 홈 (PetScreen)
- 상단: **코인 표시** (캐시).
- 중앙: **강아지 캐릭터** (성장 단계 + mood에 따른 비주얼/애니메이션).
- 하단 또는 버튼:  
  - **먹이 주기**: 보유 먹이 선택 → 사용 시 hunger 증가, last_fed_at 갱신.  
  - **꾸미기**: 착용 중인 장식 표시, 변경 시 인벤토리에서 선택.  
  - **상점 가기**: ShopScreen으로 이동.

### 4.2 상점 (ShopScreen)
- 탭 또는 섹션: **먹이** / **장식**.
- 아이템 카드: emoji, name_ko, 가격(코인), (먹이면 hunger_restore).
- 구매 시: 코인 차감, 인벤토리 추가 (먹이면 quantity++, 장식이면 owned 목록에 추가).
- 코인 부족 시 구매 비활성화 또는 토스트.

### 4.3 진입점
- **HomeScreen**: 레벨 바 옆 또는 하단에 “강아지” 버튼/아이콘 → PetScreen 이동.
- (선택) 하단 탭에 “펫” 탭 추가.

---

## 5. 폴더·파일 구조

```
src/
├── types/
│   └── index.ts          # PetState, ShopItem, FoodItem, DecorationItem, CoinBalance 등 추가
├── data/
│   └── shopItems.ts     # 먹이/장식 정적 정의 (id, name_ko, emoji, coin_cost, hunger_restore, slot)
├── db/
│   ├── sqlite.ts        # pet_state, inventory 테이블 추가 (또는 user_progress 확장)
│   ├── coinRepo.ts      # getCoins, addCoins, spendCoins
│   ├── petRepo.ts       # getPetState, updatePetState, updateHunger, feed, equip
│   └── inventoryRepo.ts # getOwnedFood, getOwnedDecorations, addFood, addDecoration
├── services/
│   ├── coinService.ts   # grantCoinsOnSuccess (Ringing에서 호출), canAfford, spend
│   └── petService.ts    # getDisplayPet (레벨→stage, hunger→mood), feedPet, decayHunger
├── components/
│   └── PetCharacter.tsx # 성장 단계 + mood별 뷰 (이미지/애니메이션 플레이스홀더)
├── screens/
│   ├── PetScreen.tsx    # 펫 홈 (캐시, 강아지, 먹이주기/꾸미기/상점)
│   └── ShopScreen.tsx    # 상점 (먹이/장식 구매)
└── navigation/
    ├── AppNavigator.tsx  # Pet, Shop 라우트 추가
    └── types.ts          # Pet: undefined, Shop: undefined
```

---

## 6. DB 스키마 (추가분)

### 6.1 user_progress (기존)
- `coins` 키: 숫자 문자열. 현재 보유 코인.

### 6.2 pet_state (신규 테이블, 단일 행)
- `id` INTEGER PRIMARY KEY (1만 사용)
- `growth_stage` TEXT — 'puppy' | 'teen' | 'adult' | 'hero'
- `hunger` INTEGER — 0~100
- `mood` TEXT — 'happy' | 'normal' | 'hungry' | 'sleepy'
- `last_fed_at` TEXT — ISO datetime
- `equipped_hat_id` TEXT NULL
- `equipped_scarf_id` TEXT NULL
- `equipped_background_id` TEXT NULL

### 6.3 inventory (신규 테이블)
- `item_id` TEXT — shopItems의 id
- `item_type` TEXT — 'food' | 'decoration'
- `quantity` INTEGER — 음식은 개수, 장식은 1 (또는 0/1로 소유 여부만)
- PRIMARY KEY (item_id, item_type) 또는 item_id만 PK

---

## 7. 레벨–성장 매핑

- `getGrowthStageFromUserLevel(level: number): 'puppy' | 'teen' | 'adult' | 'hero'`  
  - 1–2 → puppy, 3–4 → teen, 5–6 → adult, 7–8 → hero.
- 펫 로드 시 `user_level`(settings)으로 stage 계산 후 pet_state와 동기화.

---

## 8. 구현 순서 제안

1. 타입 정의 + `shopItems.ts` 데이터
2. DB 마이그레이션 (pet_state, inventory, user_progress.coins)
3. coinRepo, petRepo, inventoryRepo
4. coinService, petService
5. RingingScreen에서 XP 지급 시 코인 지급 연동
6. PetCharacter 컴포넌트 (단계/무드별 플레이스홀더)
7. PetScreen, ShopScreen 및 네비게이션
8. HomeScreen에서 펫 화면 진입 버튼
9. (선택) Lottie/스프라이트로 애니메이션 강화

이 구조로 진행하면 “레벨과 함께 자라는 AI 강아지 + XP 기반 캐시로 먹이/꾸미기” 기능을 확장 가능하게 유지할 수 있습니다.
