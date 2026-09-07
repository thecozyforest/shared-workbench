'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  Clipboard,
  Flame,
  Gauge,
  HeartHandshake,
  Lightbulb,
  Search,
  Sparkles,
  Target,
  UsersRound,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  analyzeCompatibility,
  getPillarByIdentity,
  getPillarIdentity,
  PILLARS,
  type Bucket,
  type CompatibilityResult,
} from '@/lib/compatibility';

declare global {
  interface Document {
    modelContext?: {
      registerTool: (
        tool: {
          name: string;
          title: string;
          description: string;
          inputSchema: object;
          annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
          execute: (input: unknown) => unknown | Promise<unknown>;
        },
        options?: { signal?: AbortSignal },
      ) => void | Promise<void>;
    };
  }
}

interface Member {
  name: string;
  pillar: string;
  note: string;
}

interface MemberResult extends Member {
  compatibility: CompatibilityResult;
}

interface PillarMemberGroup {
  pillar: string;
  identity: ReturnType<typeof getPillarIdentity>;
  compatibility: CompatibilityResult;
  members: MemberResult[];
}

const FILTERS: { value: 'all' | Bucket; label: string; shortLabel: string }[] = [
  { value: 'all', label: '모두', shortLabel: '모두' },
  { value: 'fit', label: '바로 손발', shortLabel: '찰떡' },
  { value: 'complement', label: '의외의 보완', shortLabel: '보완' },
  { value: 'fire', label: '불꽃 추진', shortLabel: '불꽃' },
  { value: 'manual', label: '설명서 필요', shortLabel: '설명서' },
];

const SCORE_META = [
  { key: 'chemistry' as const, label: '호흡', color: '#7e63df' },
  { key: 'synergy' as const, label: '시너지', color: '#3aa676' },
  { key: 'tension' as const, label: '긴장도', color: '#ef6a58' },
  { key: 'momentum' as const, label: '추진력', color: '#e3ac29' },
];

const COLOR_OPTIONS = [
  { word: '푸른', label: '나무', color: '#4fba8a' },
  { word: '붉은', label: '불', color: '#ee6a5b' },
  { word: '노란', label: '흙', color: '#e7b83f' },
  { word: '하얀', label: '쇠', color: '#d8d5cd' },
  { word: '검은', label: '물', color: '#323449' },
] as const;

const ANIMAL_OPTIONS = [
  { name: '쥐', emoji: '🐭' },
  { name: '소', emoji: '🐮' },
  { name: '호랑이', emoji: '🐯' },
  { name: '토끼', emoji: '🐰' },
  { name: '용', emoji: '🐲' },
  { name: '뱀', emoji: '🐍' },
  { name: '말', emoji: '🐴' },
  { name: '양', emoji: '🐑' },
  { name: '원숭이', emoji: '🐵' },
  { name: '닭', emoji: '🐔' },
  { name: '개', emoji: '🐶' },
  { name: '돼지', emoji: '🐷' },
] as const;

const BUCKET_COPY: Record<Bucket, { label: string; className: string; headerColor: string; headerText: string }> = {
  fit: { label: '바로 손발', className: 'bucket-fit', headerColor: '#126b61', headerText: '#d8fff5' },
  complement: { label: '의외의 보완', className: 'bucket-complement', headerColor: '#334155', headerText: '#f8fafc' },
  fire: { label: '불꽃 추진', className: 'bucket-fire', headerColor: '#9f1239', headerText: '#ffe4e6' },
  manual: { label: '설명서 필요', className: 'bucket-manual', headerColor: '#71551c', headerText: '#fff2bd' },
};

function CharacterSeal({ pillar, size = 'normal' }: { pillar: string; size?: 'normal' | 'large' }) {
  const identity = getPillarIdentity(pillar);
  return (
    <span
      className={`character-seal ${size === 'large' ? 'character-seal-large' : ''}`}
      style={{ '--seal-color': identity.color } as CSSProperties}
      aria-label={identity.nickname}
    >
      <span aria-hidden="true">{identity.emoji}</span>
    </span>
  );
}

function PillarGroupCard({ group, onOpen }: { group: PillarMemberGroup; onOpen: (name: string) => void }) {
  const bucket = BUCKET_COPY[group.compatibility.bucket];
  return (
    <article className="pillar-group-card overflow-hidden rounded-[18px]">
      <header className="flex min-h-12 items-center gap-2 px-4 py-2.5" style={{ background: bucket.headerColor, color: bucket.headerText }}>
        <strong className="text-base font-black">{group.pillar}일주</strong>
        <span className="text-xs font-black opacity-80">{group.identity.emoji} {group.identity.nickname}</span>
        <span className="ml-auto text-xs font-black">{bucket.label} · {group.members.length}명</span>
        <button
          type="button"
          onClick={() => onOpen(group.members[0].name)}
          className="rounded-full border border-current/40 px-2 py-1 text-[11px] font-black"
        >
          설명 보기
        </button>
      </header>
      <div className="flex min-h-32 flex-wrap content-start gap-2 p-4">
        {group.members.map((member) => (
          <button
            key={member.name}
            type="button"
            onClick={() => onOpen(member.name)}
            className="member-chip inline-flex h-10 items-center gap-2 rounded-full px-2.5 pr-3 text-sm font-black transition hover:-translate-y-0.5"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full text-base" style={{ background: group.identity.branchColor }} aria-hidden="true">{group.identity.emoji}</span>
            @{member.name}
          </button>
        ))}
      </div>
    </article>
  );
}

export default function Home() {
  const [myPillar, setMyPillar] = useState('정유');
  const [pillarQuery, setPillarQuery] = useState('');
  const [myName, setMyName] = useState('');
  const [draftName, setDraftName] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [joinMessage, setJoinMessage] = useState('');
  const [filter, setFilter] = useState<'all' | Bucket>('all');
  const [viewMode, setViewMode] = useState<'members' | 'matrix'>('members');
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const radarRef = useRef<HTMLElement>(null);

  const myIdentity = getPillarIdentity(myPillar);
  const normalizedPillarQuery = pillarQuery.replace(/\s/g, '').replace(/일주$/, '');
  const matchingPillars = PILLARS.filter((pillar) => {
    const identity = getPillarIdentity(pillar);
    const searchable = `${pillar}일주${identity.nickname}`.replace(/\s/g, '');
    return !normalizedPillarQuery || searchable.includes(normalizedPillarQuery);
  });
  const results = useMemo<MemberResult[]>(
    () => {
      if (!myName) return [];
      return members
        .filter((member) => member.name !== myName)
        .map((member) => ({
          ...member,
          compatibility: analyzeCompatibility(myPillar, member.pillar, myIdentity.nickname, member.name),
        }))
        .sort((a, b) => b.compatibility.overall - a.compatibility.overall);
    },
    [members, myName, myPillar, myIdentity.nickname],
  );
  const groupedResults = useMemo<PillarMemberGroup[]>(() => {
    const grouped = new Map<string, MemberResult[]>();
    results.forEach((member) => {
      const current = grouped.get(member.pillar) ?? [];
      current.push(member);
      grouped.set(member.pillar, current);
    });

    return Array.from(grouped.entries())
      .map(([pillar, groupMembers]) => ({
        pillar,
        identity: getPillarIdentity(pillar),
        compatibility: groupMembers[0].compatibility,
        members: groupMembers,
      }))
      .sort((a, b) => b.compatibility.overall - a.compatibility.overall);
  }, [results]);
  const selected = results.find((member) => member.name === selectedName) ?? null;
  const registeredPillarCount = new Set(members.map((member) => member.pillar)).size;
  const relationshipMatrix = useMemo(
    () =>
      COLOR_OPTIONS.map((color) =>
        ANIMAL_OPTIONS.map((animal) => {
          const pillar = getPillarByIdentity(color.word, animal.name);
          return {
            pillar,
            identity: getPillarIdentity(pillar),
            compatibility: analyzeCompatibility(myPillar, pillar),
            memberCount: members.filter((member) => member.pillar === pillar).length,
          };
        }),
      ),
    [members, myPillar],
  );

  const counts = useMemo(
    () =>
      results.reduce<Record<Bucket, number>>(
        (acc, member) => {
          acc[member.compatibility.bucket] += 1;
          return acc;
        },
        { fit: 0, complement: 0, fire: 0, manual: 0 },
      ),
    [results],
  );

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const registration = context.registerTool(
      {
        name: 'set_my_day_pillar',
        title: '내 일주 설정',
        description: '내 일주를 선택하면 해당 색동물로 바꾸고 협업 레이더 결과를 화면에 표시합니다.',
        inputSchema: {
          type: 'object',
          properties: { dayPillar: { type: 'string', enum: PILLARS } },
          required: ['dayPillar'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          const dayPillar = (input as { dayPillar?: unknown })?.dayPillar;
          if (typeof dayPillar !== 'string' || !PILLARS.includes(dayPillar)) {
            throw new Error('유효한 60일주를 입력해주세요.');
          }
          setMyPillar(dayPillar);
          setFilter('all');
          setViewMode('members');
          requestAnimationFrame(() => radarRef.current?.scrollIntoView({ behavior: 'smooth' }));
          return { dayPillar, colorAnimal: getPillarIdentity(dayPillar).nickname, memberCount: members.length };
        },
      },
      { signal: lifecycle.signal },
    );
    void Promise.resolve(registration).catch(() => undefined);
    return () => lifecycle.abort();
  }, [members.length]);

  const choosePillar = (pillar: string) => {
    setMyPillar(pillar);
    setFilter('all');
  };

  const joinRoom = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = draftName.trim();
    if (!name) {
      setJoinMessage('닉네임을 먼저 입력해주세요.');
      return;
    }
    const alreadyJoined = members.some((member) => member.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    setMembers((current) => [
      ...current.filter((member) => member.name.toLocaleLowerCase() !== name.toLocaleLowerCase()),
      { name, pillar: myPillar, note: '채팅방 참가자' },
    ]);
    setMyName(name);
    setDraftName('');
    setFilter('all');
    setSelectedName(null);
    setJoinMessage(alreadyJoined ? `${name}님의 일주를 바꿨어요.` : `${name}님의 일주가 등록됐어요.`);
  };

  const editMyRegistration = () => {
    setDraftName(myName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeMyRegistration = () => {
    setMembers((current) => current.filter((member) => member.name !== myName));
    setMyName('');
    setDraftName('');
    setJoinMessage('내 등록 정보를 내렸어요.');
  };

  const copyResult = async () => {
    if (!selected) return;
    const identity = getPillarIdentity(selected.pillar);
    const text = `${myIdentity.nickname} × ${identity.nickname}\n${selected.compatibility.typeLabel} · 케미 ${selected.compatibility.overall}°\n${selected.compatibility.summary}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="saju-shell min-h-screen overflow-hidden text-[#f1f4fd]">
      <div className="celestial-field" aria-hidden="true">
        <div className="celestial-orbit celestial-orbit-top" />
        <div className="celestial-orbit celestial-orbit-bottom" />
      </div>
      <header className="saju-header relative z-30 mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="brand-seal grid h-11 w-11 place-items-center rounded-xl text-sm font-black">命理</div>
          <div>
            <p className="font-serif-kr text-lg font-black tracking-[-0.04em]">일주 팀플 케미 <span className="ml-1 text-xs text-[#f7b955]">四柱干支</span></p>
            <p className="font-serif-kr text-xs text-white/45">도름스 오행 협업 연구소 · 相生相剋</p>
          </div>
        </div>
        <span className="demo-badge rounded-full px-3 py-1.5 text-xs">운영 논의용 명리 데모</span>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-[1440px] gap-7 px-5 pb-16 pt-7 sm:px-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(580px,1.35fr)] lg:px-12 lg:pb-24 lg:pt-12">
        <div className="relative z-10 flex flex-col justify-between gap-10 lg:min-h-[690px]">
          <div>
            <div className="gold-kicker mb-7 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm">
              <span className="mini-stamp">天命</span><Sparkles className="h-4 w-4" /> 60갑자 기반 협업 궁합
            </div>
            <h1 className="font-serif-kr max-w-[630px] text-[clamp(2.8rem,6.3vw,6.2rem)] font-black leading-[1.05] tracking-[-0.075em]">
              <span className="gold-title">{myIdentity.nickname}</span>인 나,
              <br />누구랑 하면
              <br />일이 풀릴까?
            </h1>
            <p className="font-serif-kr mt-6 max-w-[560px] text-sm leading-7 text-white/55 sm:text-base">사주의 중심인 일주(日柱)와 음양오행의 기운을 현대의 팀워크 언어로 가볍게 풀어봅니다.</p>
          </div>

          <form onSubmit={joinRoom} className="korean-corner gold-panel max-w-[620px] rounded-[18px] p-5 backdrop-blur-sm sm:p-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-black text-white/80">내 일주 등록하기</p>
                <p className="mt-1 text-xs text-white/40">한 번 등록하면 기존 회원 전체와의 궁합을 볼 수 있어요</p>
              </div>
              <strong className="pillar-badge text-sm">{myPillar}일주</strong>
            </div>

            <label className="mb-2 block text-xs font-black text-white/55" htmlFor="nickname">닉네임</label>
            <input
              id="nickname"
              value={draftName}
              maxLength={20}
              onChange={(event) => {
                setDraftName(event.target.value);
                setJoinMessage('');
              }}
              placeholder="예: 보드라운고슴도치"
              className="mystic-input mb-4 h-14 w-full rounded-xl px-5 text-base font-bold text-white outline-none placeholder:text-white/25"
            />

            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-xs font-black text-white/55" htmlFor="day-pillar-search">내 일주 찾기</label>
              <button type="button" onClick={() => setPillarQuery('')} className="text-xs font-black text-[#ffc478] underline underline-offset-4">60일주 전체 보기</button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                id="day-pillar-search"
                value={pillarQuery}
                onChange={(event) => setPillarQuery(event.target.value)}
                placeholder="정유, 정유일주, 붉은 닭 검색"
                className="mystic-input h-12 w-full rounded-xl pl-11 pr-4 text-sm font-bold text-white outline-none placeholder:text-white/25"
              />
            </div>

            <div className="mt-3 max-h-[360px] overflow-y-auto rounded-2xl border border-white/10 bg-black/10 p-2">
              {matchingPillars.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {matchingPillars.map((pillar) => {
                    const identity = getPillarIdentity(pillar);
                    const active = pillar === myPillar;
                    const darkTile = identity.colorWord === '검은';
                    return (
                      <button
                        key={pillar}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          choosePillar(pillar);
                          setJoinMessage('');
                        }}
                        className="relative min-h-28 rounded-2xl border-2 p-3 text-left transition hover:-translate-y-0.5 hover:brightness-105"
                        style={{
                          backgroundColor: identity.color,
                          borderColor: active ? '#ffffff' : 'transparent',
                          boxShadow: active ? '0 0 0 3px #17172a, 0 0 0 5px #ffcc4a' : undefined,
                          color: darkTile ? '#ffffff' : '#17172a',
                        }}
                      >
                        {active && <Check className="absolute right-2 top-2 h-4 w-4" />}
                        <span
                          className="grid h-11 w-11 place-items-center rounded-full border border-black/10 text-2xl shadow-sm"
                          style={{ backgroundColor: identity.branchColor }}
                          aria-hidden="true"
                        >
                          {identity.emoji}
                        </span>
                        <strong className="mt-2 block text-base font-black">{pillar}일주</strong>
                        <small className={`block text-[11px] font-black ${darkTile ? 'text-white/65' : 'text-[#17172a]/60'}`}>{identity.nickname}</small>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-sm font-bold text-white/45">찾는 일주가 없어요. 두 글자를 확인해주세요.</div>
              )}
            </div>

            <div className="selected-pillar mt-4 grid items-center gap-3 rounded-xl p-4 sm:grid-cols-[1fr_auto_1fr]">
              <div>
                <p className="text-[11px] font-black text-[#17172a]/55">선택한 일주</p>
                <strong className="mt-1 block text-xl font-black">{myPillar}일주</strong>
              </div>
              <ArrowDown className="h-5 w-5 text-[#17172a]/40 sm:-rotate-90" aria-hidden="true" />
              <div className="sm:text-right">
                <p className="text-[11px] font-black text-[#17172a]/55">색동물로 바꾸면</p>
                <strong className="mt-1 block text-xl font-black">{myIdentity.emoji} {myIdentity.nickname}</strong>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-white/40">생년월일은 받지 않아요. 이 데모에서는 열린 화면 안에서만 명단이 유지됩니다.</p>
              <Button type="submit" className="gold-button h-11 rounded-xl px-5 text-sm font-black">
                명판 등록하기 <ArrowDown className="ml-1 h-4 w-4" />
              </Button>
            </div>
            {joinMessage && <p className="mt-3 text-sm font-bold text-[#ffc478]" role="status">{joinMessage}</p>}
          </form>
        </div>

        <div className="korean-corner result-console relative rounded-[20px] p-4 shadow-[0_40px_100px_rgba(0,0,0,.3)] sm:p-6 lg:p-8">
          <div className="sub-panel flex flex-col gap-3 rounded-xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            {myName ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold text-white/45">내 일주</span>
                <strong className="text-base font-black">@{myName}</strong>
                <span className="font-black">{myPillar}일주 · {myIdentity.emoji} {myIdentity.nickname}</span>
                <span className="rounded-full border border-[#56e5a9]/30 bg-[#56e5a9]/10 px-2 py-1 text-[11px] font-black text-[#56e5a9]">등록 완료</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm font-bold text-white/45"><UsersRound className="h-4 w-4" /> 닉네임과 일주를 등록하면 내 팀원표가 열려요.</div>
            )}
            {myName && (
              <div className="flex gap-2">
                <button type="button" onClick={editMyRegistration} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-black">바꾸기</button>
                <button type="button" onClick={removeMyRegistration} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-black">내리기</button>
              </div>
            )}
          </div>

          <div className="sub-panel mt-5 rounded-[16px] p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-white/45">{myName ? `${myName}님의 팀원표` : '내 팀원표 미리보기'}</p>
                <h2 className="font-serif-kr mt-1 text-2xl font-black tracking-[-0.04em]">기존 회원과의 궁합 흐름 <small className="ml-1 text-xs text-[#ffc478]">相性圖</small></h2>
              </div>
              <span className="text-sm font-black text-white/45">지금까지 {members.length}명</span>
            </div>

            {myName && groupedResults.length > 0 ? (
              <div className="mt-5 overflow-x-auto pb-2">
                <div className="flex min-w-max overflow-hidden rounded-2xl border border-[#17172a]/10">
                  {groupedResults.map((group) => {
                    const bucket = BUCKET_COPY[group.compatibility.bucket];
                    return (
                      <button
                        key={group.pillar}
                        type="button"
                        onClick={() => setSelectedName(group.members[0].name)}
                        className="grid min-h-24 w-24 place-items-center px-2 py-3 text-center transition hover:brightness-105"
                        style={{ background: bucket.headerColor, color: bucket.headerText }}
                        title={`${group.pillar}일주 ${group.identity.nickname} · ${bucket.label}`}
                      >
                        <span>
                          <span className="block text-lg" aria-hidden="true">{group.identity.emoji}</span>
                          <strong className="block text-sm font-black">{group.pillar}</strong>
                          <small className="block text-[10px] font-black opacity-75">{group.members.length}명</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="empty-mystic mt-5 grid min-h-40 place-items-center rounded-xl px-5 text-center">
                <div>
                  <p className="font-black">{myName ? '아직 비교할 다른 회원이 없어요.' : '내 정보를 먼저 등록해주세요.'}</p>
                  <p className="mt-2 text-sm leading-6 text-white/45">회원이 등록될수록 궁합순 막대와 일주별 회원 그룹이 채워집니다.</p>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-white/50">
              {(Object.keys(BUCKET_COPY) as Bucket[]).map((bucket) => (
                <span key={bucket} className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm" style={{ background: BUCKET_COPY[bucket].headerColor }} />{BUCKET_COPY[bucket].label}</span>
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(counts) as Bucket[]).map((bucket) => (
              <div key={bucket} className="metric-card rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-white/45">{BUCKET_COPY[bucket].label}</p>
                <p className="mt-1 text-xl font-black">{counts[bucket]}명</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={radarRef} className="radar-section relative z-10" id="radar">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className="grid gap-6 border-b border-[#f59e0b]/20 pb-9 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="flex items-center gap-5">
              <CharacterSeal pillar={myPillar} size="large" />
              <div>
                <p className="mb-2 text-sm font-black text-[#ffc478]">MY TEAM RADAR · 人緣圖</p>
                <h2 className="font-serif-kr text-4xl font-black tracking-[-0.055em] sm:text-6xl">{myName ? `${myName} · ` : ''}{myIdentity.nickname}의 사람 지도</h2>
              </div>
            </div>
            <p className="font-serif-kr max-w-[420px] text-base leading-7 text-white/55">편한 사람만 좋은 동료는 아니에요. 손발, 보완, 불꽃, 설명서라는 네 가지 방식으로 함께 일할 사람을 찾아보세요.</p>
          </div>

          <div className="operation-note mt-6 rounded-xl px-4 py-3 text-sm font-bold leading-6">
            실제 운영에서는 먼저 등록한 회원이 계속 누적되고, 새 회원은 자기 정보만 등록하면 기존 회원 전체와의 궁합을 보게 됩니다. 지금 시안에서는 같은 화면에서 여러 닉네임을 등록해 그 흐름을 체험할 수 있어요.
          </div>

          <div className="mode-switch" role="tablist" aria-label="관계 보기 방식">
            <button role="tab" aria-selected={viewMode === 'members'} className={viewMode === 'members' ? 'is-active' : ''} onClick={() => setViewMode('members')}><UsersRound className="h-4 w-4" /> 회원 보기</button>
            <button role="tab" aria-selected={viewMode === 'matrix'} className={viewMode === 'matrix' ? 'is-active' : ''} onClick={() => setViewMode('matrix')}><Gauge className="h-4 w-4" /> 전체 관계표</button>
          </div>

          {viewMode === 'members' ? (
            <Tabs value={filter} onValueChange={(value) => setFilter(value as 'all' | Bucket)} className="mt-6">
              <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-none bg-transparent p-0" variant="line">
                {FILTERS.map((item) => (
                  <TabsTrigger key={item.value} value={item.value} className="h-11 flex-none rounded-full border border-white/15 px-4 text-sm font-black text-white/55 data-active:border-[#f59e0b]/50 data-active:bg-[#f59e0b]/15 data-active:text-[#ffc478] after:hidden">
                    {item.label}{item.value !== 'all' ? ` ${counts[item.value]}` : ` ${results.length}`}
                  </TabsTrigger>
                ))}
              </TabsList>

              {FILTERS.map((item) => {
                const visibleGroups = item.value === 'all'
                  ? groupedResults
                  : groupedResults.filter((group) => group.compatibility.bucket === item.value);
                return (
                  <TabsContent key={item.value} value={item.value} className="mt-7">
                    {visibleGroups.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {visibleGroups.map((group) => (
                          <PillarGroupCard key={group.pillar} group={group} onOpen={setSelectedName} />
                        ))}
                      </div>
                    ) : (
                      <div className="empty-mystic rounded-[18px] py-16 text-center">
                        <p className="text-lg font-black">{myName ? '이 범주에 등록된 회원이 아직 없어요.' : '내 닉네임과 일주를 먼저 등록해주세요.'}</p>
                        <p className="mt-2 text-white/45">회원이 들어오면 일주별 카드 안에 닉네임이 모여요.</p>
                      </div>
                    )}
                  </TabsContent>
                );
              })}
              <p className="mt-7 text-sm font-bold text-white/35">아직 등록한 분이 없는 일주: {PILLARS.length - registeredPillarCount}개</p>
            </Tabs>
          ) : (
            <div className="matrix-panel">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="text-xl font-black">{myIdentity.nickname} 기준 60색동물 관계표</h3>
                  <p className="mt-1 text-sm text-white/45">칸의 숫자는 케미 온도예요. 누르면 같은 관계의 팀원 목록으로 이동합니다.</p>
                </div>
                <div className="matrix-legend">
                  {(Object.keys(BUCKET_COPY) as Bucket[]).map((bucket) => <span key={bucket}><i className={`matrix-${bucket}`} />{BUCKET_COPY[bucket].label}</span>)}
                </div>
              </div>
              <div className="matrix-scroll">
                <div className="relationship-matrix">
                  <div className="matrix-corner">색 × 동물</div>
                  {ANIMAL_OPTIONS.map((animal) => <div key={animal.name} className="matrix-animal"><span>{animal.emoji}</span><small>{animal.name}</small></div>)}
                  {relationshipMatrix.map((row, rowIndex) => (
                    <div className="contents" key={COLOR_OPTIONS[rowIndex].word}>
                      <div className="matrix-color"><i style={{ background: COLOR_OPTIONS[rowIndex].color }} /><strong>{COLOR_OPTIONS[rowIndex].word}</strong></div>
                      {row.map((cell) => (
                        <button
                          key={cell.pillar}
                          className={`matrix-cell matrix-${cell.compatibility.bucket}`}
                          title={`${cell.identity.nickname}: ${cell.compatibility.typeLabel} ${cell.compatibility.overall}°`}
                          onClick={() => { setFilter(cell.compatibility.bucket); setViewMode('members'); }}
                        >
                          <strong>{cell.compatibility.overall}</strong>
                          {cell.memberCount > 0 && <span>{cell.memberCount}명</span>}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="creator-panel korean-corner mt-12 grid gap-4 rounded-[18px] p-6 text-white sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-8">
            <div className="grid h-12 w-12 place-items-center rounded-xl border border-[#f59e0b]/35 bg-[#f59e0b]/10 text-[#ffc478]"><Lightbulb className="h-6 w-6" /></div>
            <p className="text-base leading-7 text-white/70"><strong className="text-white">이 결과는 일주 두 글자만 활용한 재미용 콘텐츠예요.</strong><br />실제 관계의 성공이나 사람의 좋고 나쁨을 판단하지 않습니다. 중요한 팀 결정은 대화와 실제 경험을 기준으로 해주세요.</p>
            <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-4 py-2 text-sm">
              <span className="font-bold text-white/45">만든 이</span>
              <span className="mini-stamp">印</span><strong className="font-serif-kr font-black text-[#ffc478]">보드라운고슴도치</strong>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) { setSelectedName(null); setCopied(false); } }}>
        {selected && (() => {
          const identity = getPillarIdentity(selected.pillar);
          const compatibility = selected.compatibility;
          return (
            <DialogContent className="mystic-dialog max-h-[92vh] overflow-y-auto rounded-[20px] border-0 p-0 sm:max-w-[760px]">
              <div className="relative overflow-hidden rounded-t-[20px] bg-[#070b14] px-6 pb-8 pt-7 text-white sm:px-9">
                <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full border-[48px] border-white/[0.04]" />
                <DialogHeader className="relative">
                  <DialogDescription className="text-sm font-black text-[#ffc478]">COLOR ANIMAL TEAM CHEMISTRY · 相生相剋</DialogDescription>
                  <div className="flex items-center gap-3 pt-3 sm:gap-5">
                    <CharacterSeal pillar={myPillar} size="large" />
                    <span className="text-2xl font-light text-white/30">×</span>
                    <CharacterSeal pillar={selected.pillar} size="large" />
                    <div className="ml-auto text-right">
                      <strong className="block text-5xl font-black tracking-[-0.08em] text-[#ffc478]">{compatibility.overall}°</strong>
                      <span className="text-xs font-bold text-white/50">케미 온도</span>
                    </div>
                  </div>
                  <DialogTitle className="mt-5 text-3xl font-black leading-tight tracking-[-0.05em] sm:text-4xl">{myIdentity.nickname}와 {identity.nickname}<br />{compatibility.typeLabel}</DialogTitle>
                  <p className="mt-2 max-w-[610px] text-base leading-7 text-white/65">{compatibility.summary}</p>
                </DialogHeader>
              </div>

              <div className="space-y-7 px-6 py-7 sm:px-9 sm:py-9">
                <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                  {SCORE_META.map((meta) => (
                    <div key={meta.key}>
                      <div className="mb-2 flex items-center justify-between text-sm font-black"><span>{meta.label}</span><span>{compatibility.scores[meta.key]}</span></div>
                      <Progress value={compatibility.scores[meta.key]} className="score-progress" style={{ '--bar-color': meta.color } as CSSProperties} />
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {compatibility.relationTags.map((tag) => <span key={tag} className="relation-chip">{tag}</span>)}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="detail-card detail-card-green"><HeartHandshake className="h-5 w-5" /><div><h3>우리가 잘하는 것</h3><p>{compatibility.strength}</p></div></div>
                  <div className="detail-card detail-card-red"><Flame className="h-5 w-5" /><div><h3>부딪히는 지점</h3><p>{compatibility.friction}</p></div></div>
                  <div className="detail-card detail-card-blue"><Target className="h-5 w-5" /><div><h3>추천 역할</h3><p>{compatibility.role}</p></div></div>
                  <div className="detail-card detail-card-yellow"><Zap className="h-5 w-5" /><div><h3>협업 사용설명서</h3><p>{compatibility.tip}</p></div></div>
                </div>

                <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-white/45">{selected.name}님과의 결과를 복사해서 공유해보세요.</p>
                  <Button onClick={copyResult} className="gold-button h-11 rounded-xl px-5 font-black">
                    {copied ? <Check className="mr-1 h-4 w-4" /> : <Clipboard className="mr-1 h-4 w-4" />}{copied ? '복사했어요' : '결과 복사하기'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          );
        })()}
      </Dialog>
    </main>
  );
}
