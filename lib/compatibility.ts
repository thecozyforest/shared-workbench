export type Element = '목' | '화' | '토' | '금' | '수';
export type Relation =
  | 'SAME'
  | 'A_GENERATES_B'
  | 'B_GENERATES_A'
  | 'A_CONTROLS_B'
  | 'B_CONTROLS_A';

export type Bucket = 'fit' | 'complement' | 'fire' | 'manual';
export type ScoreKey = 'chemistry' | 'synergy' | 'tension' | 'momentum';

export const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
export const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const;

export const PILLARS = Array.from(
  { length: 60 },
  (_, index) => `${STEMS[index % 10]}${BRANCHES[index % 12]}`,
);

const STEM_META: Record<string, { element: Element; yinYang: '양' | '음' }> = {
  갑: { element: '목', yinYang: '양' },
  을: { element: '목', yinYang: '음' },
  병: { element: '화', yinYang: '양' },
  정: { element: '화', yinYang: '음' },
  무: { element: '토', yinYang: '양' },
  기: { element: '토', yinYang: '음' },
  경: { element: '금', yinYang: '양' },
  신: { element: '금', yinYang: '음' },
  임: { element: '수', yinYang: '양' },
  계: { element: '수', yinYang: '음' },
};

const BRANCH_META: Record<string, { element: Element; yinYang: '양' | '음' }> = {
  자: { element: '수', yinYang: '양' },
  축: { element: '토', yinYang: '음' },
  인: { element: '목', yinYang: '양' },
  묘: { element: '목', yinYang: '음' },
  진: { element: '토', yinYang: '양' },
  사: { element: '화', yinYang: '음' },
  오: { element: '화', yinYang: '양' },
  미: { element: '토', yinYang: '음' },
  신: { element: '금', yinYang: '양' },
  유: { element: '금', yinYang: '음' },
  술: { element: '토', yinYang: '양' },
  해: { element: '수', yinYang: '음' },
};

const COLOR_WORD: Record<Element, string> = {
  목: '푸른',
  화: '붉은',
  토: '노란',
  금: '하얀',
  수: '검은',
};

const COLOR_HEX: Record<Element, string> = {
  목: '#4fba8a',
  화: '#ee6a5b',
  토: '#e7b83f',
  금: '#d8d5cd',
  수: '#323449',
};

const ANIMAL: Record<string, string> = {
  자: '쥐',
  축: '소',
  인: '호랑이',
  묘: '토끼',
  진: '용',
  사: '뱀',
  오: '말',
  미: '양',
  신: '원숭이',
  유: '닭',
  술: '개',
  해: '돼지',
};

const ANIMAL_EMOJI: Record<string, string> = {
  자: '🐭',
  축: '🐮',
  인: '🐯',
  묘: '🐰',
  진: '🐲',
  사: '🐍',
  오: '🐴',
  미: '🐑',
  신: '🐵',
  유: '🐔',
  술: '🐶',
  해: '🐷',
};

export function getPillarIdentity(pillar: string) {
  if (!PILLARS.includes(pillar)) throw new Error('유효한 60일주가 아닙니다.');
  const [stem, branch] = pillar;
  const element = STEM_META[stem].element;
  return {
    nickname: `${COLOR_WORD[element]} ${ANIMAL[branch]}`,
    colorWord: COLOR_WORD[element],
    animal: ANIMAL[branch],
    emoji: ANIMAL_EMOJI[branch],
    color: COLOR_HEX[element],
    element,
  };
}

export function getPillarByIdentity(colorWord: string, animal: string) {
  const pillar = PILLARS.find((candidate) => {
    const identity = getPillarIdentity(candidate);
    return identity.colorWord === colorWord && identity.animal === animal;
  });
  if (!pillar) throw new Error('색동물 조합을 찾지 못했습니다.');
  return pillar;
}

const GENERATES: Record<Element, Element> = {
  목: '화',
  화: '토',
  토: '금',
  금: '수',
  수: '목',
};

const CONTROLS: Record<Element, Element> = {
  목: '토',
  토: '수',
  수: '화',
  화: '금',
  금: '목',
};

const CONTROL_BRIDGE: Record<string, Element> = {
  '목>토': '화',
  '토>수': '금',
  '수>화': '목',
  '화>금': '토',
  '금>목': '수',
};

const STEM_COMBINATIONS = [
  ['갑', '기'],
  ['을', '경'],
  ['병', '신'],
  ['정', '임'],
  ['무', '계'],
];

const STEM_CLASHES = [
  ['갑', '경'],
  ['을', '신'],
  ['병', '임'],
  ['정', '계'],
];

const LIUHE = [
  ['자', '축'], ['인', '해'], ['묘', '술'], ['진', '유'], ['사', '신'], ['오', '미'],
];

const CHONG = [
  ['자', '오'], ['축', '미'], ['인', '신'], ['묘', '유'], ['진', '술'], ['사', '해'],
];

const HAI = [
  ['자', '미'], ['축', '오'], ['인', '사'], ['묘', '진'], ['신', '해'], ['유', '술'],
];

const PO = [
  ['자', '유'], ['축', '진'], ['인', '해'], ['묘', '오'], ['사', '신'], ['미', '술'],
];

const PARTIAL_XING = [
  ['인', '사'], ['사', '신'], ['신', '인'], ['축', '술'], ['술', '미'], ['미', '축'],
];

const pairMatches = (pairs: string[][], a: string, b: string) =>
  pairs.some(([left, right]) => (left === a && right === b) || (left === b && right === a));

const elementRelation = (a: Element, b: Element): Relation => {
  if (a === b) return 'SAME';
  if (GENERATES[a] === b) return 'A_GENERATES_B';
  if (GENERATES[b] === a) return 'B_GENERATES_A';
  if (CONTROLS[a] === b) return 'A_CONTROLS_B';
  return 'B_CONTROLS_A';
};

type BranchRelation = 'LIUHE' | 'CHONG' | 'XING' | 'PARTIAL_XING' | 'HAI' | 'PO';

const BRANCH_LABELS: Record<BranchRelation, string> = {
  LIUHE: '육합',
  CHONG: '육충',
  XING: '형',
  PARTIAL_XING: '형의 긴장',
  HAI: '해',
  PO: '파',
};

const TYPE_COPY = {
  BLAZING_RIVALS: {
    label: '불꽃 경쟁형',
    summary: '부딪히는 만큼 움직임도 커요. 변화가 필요한 프로젝트에서 힘이 나는 조합입니다.',
  },
  PERFECT_EXECUTION: {
    label: '찰떡 실행형',
    summary: '말과 행동의 속도가 자연스럽게 맞아, 짧은 설명만으로도 일이 굴러가는 조합입니다.',
  },
  MUTUAL_GROWTH: {
    label: '상호 성장형',
    summary: '한 사람의 방식이 다른 사람의 능력을 계속 살려주는 성장형 조합입니다.',
  },
  CHECK_AND_BALANCE: {
    label: '견제와 균형형',
    summary: '편하지만은 않지만 서로의 빈틈을 잡아주며 결과의 완성도를 높이는 조합입니다.',
  },
  OFF_BEAT: {
    label: '엇박자 주의형',
    summary: '기대와 실행 타이밍이 자주 어긋날 수 있어, 작은 사용설명서가 필요한 조합입니다.',
  },
  SIMILAR_COLLEAGUES: {
    label: '닮은꼴 동료형',
    summary: '생각과 행동의 결이 비슷해 빠르게 공감하지만, 역할도 쉽게 겹치는 조합입니다.',
  },
  ROLE_COMPLEMENT: {
    label: '역할분담형',
    summary: '닮아서가 아니라 서로 다른 기능이 연결될 때 강해지는 보완형 조합입니다.',
  },
  ADAPTIVE_TEAM: {
    label: '조율형',
    summary: '역할과 일하는 규칙을 어떻게 정하느냐에 따라 케미가 크게 달라지는 조합입니다.',
  },
} as const;

const SCORE_EFFECTS: Record<string, Record<ScoreKey, number>> = {
  STEM_COMBINATION: { chemistry: 14, synergy: 10, tension: -4, momentum: 5 },
  STEM_CLASH: { chemistry: -10, synergy: -2, tension: 15, momentum: 10 },
  STEM_SAME: { chemistry: 6, synergy: 3, tension: -2, momentum: 2 },
  STEM_GENERATES: { chemistry: 5, synergy: 9, tension: -2, momentum: 5 },
  STEM_CONTROLS: { chemistry: -4, synergy: 1, tension: 9, momentum: 7 },
  LIUHE: { chemistry: 14, synergy: 10, tension: -5, momentum: 4 },
  CHONG: { chemistry: -12, synergy: -2, tension: 17, momentum: 13 },
  XING: { chemistry: -8, synergy: -2, tension: 13, momentum: 7 },
  PARTIAL_XING: { chemistry: -6, synergy: -1, tension: 10, momentum: 7 },
  HAI: { chemistry: -6, synergy: -3, tension: 8, momentum: 2 },
  PO: { chemistry: -4, synergy: -2, tension: 5, momentum: 1 },
  BRANCH_SAME: { chemistry: 3, synergy: 2, tension: -1, momentum: 1 },
  BRANCH_GENERATES: { chemistry: 3, synergy: 5, tension: -1, momentum: 3 },
  BRANCH_CONTROLS: { chemistry: -3, synergy: 1, tension: 6, momentum: 4 },
  CROSS_SAME: { chemistry: 2, synergy: 1, tension: 0, momentum: 1 },
  CROSS_GENERATES: { chemistry: 1, synergy: 4, tension: -1, momentum: 2 },
  CROSS_CONTROLS: { chemistry: -1, synergy: 0, tension: 4, momentum: 2 },
};

const applyEffect = (scores: Record<ScoreKey, number>, effectName: string) => {
  const effect = SCORE_EFFECTS[effectName];
  (Object.keys(scores) as ScoreKey[]).forEach((key) => {
    scores[key] += effect[key];
  });
};

const classify = (scores: Record<ScoreKey, number>, sameSignals: number) => {
  if (scores.tension >= 70 && scores.momentum >= 70) return 'BLAZING_RIVALS';
  if (scores.chemistry >= 70 && scores.synergy >= 68 && scores.tension < 58) return 'PERFECT_EXECUTION';
  if (scores.synergy >= 72) return 'MUTUAL_GROWTH';
  if (scores.tension >= 62 && scores.synergy >= 55) return 'CHECK_AND_BALANCE';
  if (scores.chemistry <= 48 && scores.tension >= 65) return 'OFF_BEAT';
  if (scores.chemistry >= 64 && sameSignals >= 2) return 'SIMILAR_COLLEAGUES';
  if (scores.synergy >= 60 && scores.momentum >= 60) return 'ROLE_COMPLEMENT';
  return 'ADAPTIVE_TEAM';
};

const relationEffectName = (prefix: 'STEM' | 'BRANCH' | 'CROSS', relation: Relation) => {
  if (relation === 'SAME') return `${prefix}_SAME`;
  if (relation.includes('GENERATES')) return `${prefix}_GENERATES`;
  return `${prefix}_CONTROLS`;
};

export interface CompatibilityResult {
  overall: number;
  scores: Record<ScoreKey, number>;
  type: keyof typeof TYPE_COPY;
  typeLabel: string;
  summary: string;
  bucket: Bucket;
  relationTags: string[];
  strength: string;
  friction: string;
  role: string;
  tip: string;
  detected: {
    stem: string;
    primaryBranch: string | null;
    secondaryBranches: string[];
    bufferHint: string | null;
  };
}

export function analyzeCompatibility(
  pillarA: string,
  pillarB: string,
  labelA = '나',
  labelB = '상대',
): CompatibilityResult {
  if (!PILLARS.includes(pillarA) || !PILLARS.includes(pillarB)) {
    throw new Error('유효한 60일주를 선택해주세요.');
  }

  const [stemA, branchA] = pillarA;
  const [stemB, branchB] = pillarB;
  const stemElementRelation = elementRelation(STEM_META[stemA].element, STEM_META[stemB].element);
  const branchElementRelation = elementRelation(BRANCH_META[branchA].element, BRANCH_META[branchB].element);
  const crossAtoB = elementRelation(STEM_META[stemA].element, BRANCH_META[branchB].element);
  const crossBtoA = elementRelation(STEM_META[stemB].element, BRANCH_META[branchA].element);
  const scores: Record<ScoreKey, number> = { chemistry: 50, synergy: 50, tension: 50, momentum: 50 };
  let stemLabel = '';

  if (pairMatches(STEM_COMBINATIONS, stemA, stemB)) {
    applyEffect(scores, 'STEM_COMBINATION');
    stemLabel = `${stemA}${stemB}합`;
  } else if (pairMatches(STEM_CLASHES, stemA, stemB)) {
    applyEffect(scores, 'STEM_CLASH');
    stemLabel = `${stemA}${stemB}충`;
  } else {
    applyEffect(scores, relationEffectName('STEM', stemElementRelation));
    stemLabel = stemElementRelation === 'SAME' ? '일간 같은 오행' : stemElementRelation.includes('GENERATES') ? '일간 상생' : '일간 상극';
  }

  const branchRelations: BranchRelation[] = [];
  if (pairMatches(LIUHE, branchA, branchB)) branchRelations.push('LIUHE');
  if (pairMatches(CHONG, branchA, branchB)) branchRelations.push('CHONG');
  if ((branchA === '자' && branchB === '묘') || (branchA === '묘' && branchB === '자') || (branchA === branchB && ['진', '오', '유', '해'].includes(branchA))) {
    branchRelations.push('XING');
  }
  if (pairMatches(PARTIAL_XING, branchA, branchB)) branchRelations.push('PARTIAL_XING');
  if (pairMatches(HAI, branchA, branchB)) branchRelations.push('HAI');
  if (pairMatches(PO, branchA, branchB)) branchRelations.push('PO');

  const priority: BranchRelation[] = ['CHONG', 'LIUHE', 'XING', 'PARTIAL_XING', 'HAI', 'PO'];
  const primaryBranch = priority.find((relation) => branchRelations.includes(relation)) ?? null;
  const secondaryBranches = branchRelations.filter((relation) => relation !== primaryBranch);

  if (primaryBranch) applyEffect(scores, primaryBranch);

  let secondaryTension = 0;
  secondaryBranches.forEach((relation) => {
    const tension = relation === 'PARTIAL_XING' || relation === 'XING' ? 3 : 2;
    secondaryTension += tension;
    scores.chemistry -= 1;
  });
  scores.tension += Math.min(secondaryTension, 5);

  applyEffect(scores, relationEffectName('BRANCH', branchElementRelation));
  applyEffect(scores, relationEffectName('CROSS', crossAtoB));
  applyEffect(scores, relationEffectName('CROSS', crossBtoA));

  let bufferHint: string | null = null;
  if (stemLabel === '일간 상극') {
    const stemElementA = STEM_META[stemA].element;
    const stemElementB = STEM_META[stemB].element;
    const controller = CONTROLS[stemElementA] === stemElementB ? stemElementA : stemElementB;
    const controlled = controller === stemElementA ? stemElementB : stemElementA;
    const bridge = CONTROL_BRIDGE[`${controller}>${controlled}`];
    if (bridge && [BRANCH_META[branchA].element, BRANCH_META[branchB].element].includes(bridge)) {
      scores.synergy += 3;
      scores.tension -= 3;
      bufferHint = `${bridge} 기운의 완충 흐름`;
    }
  }

  (Object.keys(scores) as ScoreKey[]).forEach((key) => {
    scores[key] = Math.max(0, Math.min(100, scores[key]));
  });

  const overall = Math.round(
    scores.chemistry * 0.3 +
      scores.synergy * 0.3 +
      scores.momentum * 0.2 +
      (100 - scores.tension) * 0.2,
  );

  const sameSignals = [stemElementRelation, branchElementRelation, crossAtoB, crossBtoA].filter((item) => item === 'SAME').length;
  const type = classify(scores, sameSignals);
  const typeCopy = TYPE_COPY[type];
  const generationSignals = [stemElementRelation, branchElementRelation, crossAtoB, crossBtoA].filter((item) => item.includes('GENERATES')).length;
  const controlSignals = [stemElementRelation, branchElementRelation, crossAtoB, crossBtoA].filter((item) => item.includes('CONTROLS')).length;

  let bucket: Bucket = 'complement';
  if (type === 'PERFECT_EXECUTION' || type === 'SIMILAR_COLLEAGUES' || overall >= 72) bucket = 'fit';
  else if (type === 'BLAZING_RIVALS') bucket = 'fire';
  else if (type === 'OFF_BEAT' || overall < 48) bucket = 'manual';

  const strength =
    primaryBranch === 'LIUHE' || stemLabel.endsWith('합')
      ? '서로의 판단과 행동을 빠르게 읽고, 역할이 맞으면 손발이 자연스럽게 이어져요.'
      : generationSignals >= 2
        ? '한쪽이 건넨 아이디어와 에너지를 다른 쪽이 결과로 키우는 흐름이 살아 있어요.'
        : sameSignals >= 2
          ? '문제를 바라보는 언어가 비슷해 긴 설명 없이도 핵심을 공유하기 쉬워요.'
          : scores.momentum >= 65
            ? '정체된 일을 움직이고 짧은 시간에 결론을 만들어내는 힘이 큰 편이에요.'
            : '서로 다른 기준을 비교하면서 놓치기 쉬운 부분을 보완할 수 있어요.';

  const friction =
    primaryBranch === 'CHONG'
      ? '실행 속도와 방법이 정면으로 부딪힐 수 있어요. 모든 과정을 함께 결정하면 피로가 커집니다.'
      : primaryBranch === 'XING' || primaryBranch === 'PARTIAL_XING'
        ? '서로에게 높은 기준을 요구하거나 같은 문제를 반복해서 지적하기 쉬워요.'
        : primaryBranch === 'HAI'
          ? '말하지 않은 기대가 엇갈릴 수 있어요. “알아서 알겠지”가 가장 위험한 조합입니다.'
          : primaryBranch === 'PO'
            ? '시작보다 유지와 마무리에서 작은 약속이나 업무 범위가 흐트러지기 쉬워요.'
            : controlSignals >= 2
              ? '교정과 검수가 간섭처럼 느껴질 수 있어요. 누가 최종 판단하는지 모호하면 긴장이 커집니다.'
              : sameSignals >= 2
                ? '익숙함 때문에 역할이 겹치고, 서로 먼저 하려다 빈 영역이 생길 수 있어요.'
                : '중요하게 보는 기준이 다를 수 있어 중간 확인 없이 달리면 결과의 모양이 달라질 수 있어요.';

  let role = `${labelA}는 방향과 우선순위를, ${labelB}는 실행 기준과 마무리를 맡으면 균형이 좋아요.`;
  if (stemElementRelation === 'A_GENERATES_B') role = `${labelA}는 아이디어와 자원을 건네고, ${labelB}는 이를 확장해 결과로 만드는 역할이 잘 맞아요.`;
  if (stemElementRelation === 'B_GENERATES_A') role = `${labelB}는 아이디어와 자원을 건네고, ${labelA}는 이를 확장해 결과로 만드는 역할이 잘 맞아요.`;
  if (stemElementRelation === 'A_CONTROLS_B') role = `${labelA}는 기준·검수를, ${labelB}는 추진·실행을 맡되 ${labelB}의 재량 범위를 보장해주세요.`;
  if (stemElementRelation === 'B_CONTROLS_A') role = `${labelB}는 기준·검수를, ${labelA}는 추진·실행을 맡되 ${labelA}의 재량 범위를 보장해주세요.`;
  if (stemLabel.endsWith('합')) role = `${labelA}와 ${labelB}가 함께 방향을 정하고, 실행 단계에서는 책임 영역을 분리하는 방식이 좋아요.`;

  const tip =
    scores.tension >= 68
      ? '목표는 함께 정하되 방법은 각자 맡고, 이견이 생겼을 때 최종 결정권자를 미리 정하세요.'
      : primaryBranch === 'LIUHE' || stemLabel.endsWith('합')
        ? '호흡이 편하다고 책임까지 모호하게 두지 마세요. 담당과 마감만 선명하면 장점이 더 살아납니다.'
        : generationSignals >= 2
          ? '한 사람이 계속 지원자 역할에 머물지 않도록 주기적으로 주도권을 바꿔보세요.'
          : '착수할 때 완료 기준을 한 문장으로 맞추고, 중간 검수 시점을 한 번 고정해두세요.';

  return {
    overall,
    scores,
    type,
    typeLabel: typeCopy.label,
    summary: typeCopy.summary,
    bucket,
    relationTags: [
      stemLabel,
      ...branchRelations.map((relation) => BRANCH_LABELS[relation]),
      branchElementRelation === 'SAME' ? '일지 같은 오행' : branchElementRelation.includes('GENERATES') ? '일지 상생' : '일지 상극',
      ...(bufferHint ? ['완충 흐름'] : []),
    ],
    strength,
    friction,
    role,
    tip,
    detected: {
      stem: stemLabel,
      primaryBranch: primaryBranch ? BRANCH_LABELS[primaryBranch] : null,
      secondaryBranches: secondaryBranches.map((relation) => BRANCH_LABELS[relation]),
      bufferHint,
    },
  };
}
