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

const BUCKET_COPY: Record<Bucket, { label: string; className: string }> = {
  fit: { label: '바로 손발', className: 'bucket-fit' },
  complement: { label: '의외의 보완', className: 'bucket-complement' },
  fire: { label: '불꽃 추진', className: 'bucket-fire' },
  manual: { label: '설명서 필요', className: 'bucket-manual' },
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

function MemberCard({ member, rank, onOpen }: { member: MemberResult; rank: number; onOpen: () => void }) {
  const identity = getPillarIdentity(member.pillar);
  const bucket = BUCKET_COPY[member.compatibility.bucket];
  return (
    <button className="member-card" onClick={onOpen} aria-label={`${member.name}님과의 협업 케미 자세히 보기`}>
      <span className="member-rank">{String(rank).padStart(2, '0')}</span>
      <CharacterSeal pillar={member.pillar} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <strong className="text-lg font-black sm:text-xl">{member.name}</strong>
          <span className={`bucket-badge ${bucket.className}`}>{bucket.label}</span>
        </span>
        <span className="mt-1 block text-sm font-bold text-[#575568]">{identity.nickname} · {member.note}</span>
        <span className="mt-2 line-clamp-1 block text-sm text-[#777481]">{member.compatibility.summary}</span>
      </span>
      <span className="text-right">
        <strong className="block text-3xl font-black tracking-[-0.07em] sm:text-4xl">{member.compatibility.overall}°</strong>
        <span className="text-xs font-bold text-[#8b8892]">케미 온도</span>
      </span>
      <ArrowUpRight className="absolute right-4 top-4 h-4 w-4 text-[#17172a]/25 transition group-hover:text-[#17172a]" />
    </button>
  );
}

export default function Home() {
  const [myPillar, setMyPillar] = useState('정유');
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
  const results = useMemo<MemberResult[]>(
    () =>
      members
        .filter((member) => member.name !== myName)
        .map((member) => ({
          ...member,
          compatibility: analyzeCompatibility(myPillar, member.pillar, myIdentity.nickname, member.name),
        }))
        .sort((a, b) => b.compatibility.overall - a.compatibility.overall),
    [members, myName, myPillar, myIdentity.nickname],
  );
  const selected = results.find((member) => member.name === selectedName) ?? null;
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
    setJoinMessage(alreadyJoined ? `${name}님의 일주를 바꿨어요.` : `${name}님의 자리가 채워졌어요.`);
  };

  const viewAsMember = (member: Member) => {
    setMyName(member.name);
    setMyPillar(member.pillar);
    setFilter('all');
    setSelectedName(null);
  };

  const clearRoom = () => {
    setMembers([]);
    setMyName('');
    setDraftName('');
    setJoinMessage('체험 명단을 비웠어요.');
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
    <main className="min-h-screen overflow-hidden bg-[#17172a] text-[#f7f4ee]">
      <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#ffcc4a] text-sm font-black text-[#17172a]">日</div>
          <div>
            <p className="text-lg font-black tracking-[-0.04em]">일주 팀플 케미</p>
            <p className="text-xs text-white/45">도름스 커뮤니티 실험실 · 화면 시안</p>
          </div>
        </div>
        <span className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/55">운영 논의용 데모</span>
      </header>

      <section className="relative mx-auto grid w-full max-w-[1440px] gap-7 px-5 pb-16 pt-5 sm:px-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(580px,1.35fr)] lg:px-12 lg:pb-24 lg:pt-10">
        <div className="relative z-10 flex flex-col justify-between gap-10 lg:min-h-[690px]">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-2 text-sm text-[#ffcc4a]">
              <Sparkles className="h-4 w-4" /> 내 일주로 찾는 나의 협업 동료
            </div>
            <h1 className="max-w-[630px] text-[clamp(3rem,7vw,6.9rem)] font-black leading-[0.92] tracking-[-0.075em]">
              <span className="text-[#ffcc4a]">{myIdentity.nickname}</span>인 나,
              <br />누구랑 하면
              <br />일이 풀릴까?
            </h1>
          </div>

          <form onSubmit={joinRoom} className="max-w-[620px] rounded-[28px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm sm:p-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-black text-white/80">채팅방에 내 자리 채우기</p>
                <p className="mt-1 text-xs text-white/40">닉네임과 만세력에서 확인한 일주를 입력해요</p>
              </div>
              <strong className="text-sm text-[#ffcc4a]">{myPillar}일주</strong>
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
              className="mb-4 h-14 w-full rounded-2xl border border-white/15 bg-white/10 px-5 text-base font-bold text-white outline-none placeholder:text-white/25 focus:border-[#ffcc4a] focus:ring-2 focus:ring-[#ffcc4a]/20"
            />

            <label className="mb-2 block text-xs font-black text-white/55" htmlFor="day-pillar">내 일주</label>
            <div className="relative">
              <select
                id="day-pillar"
                aria-label="내 일주 선택"
                value={myPillar}
                onChange={(event) => {
                  choosePillar(event.target.value);
                  setJoinMessage('');
                }}
                className="h-14 w-full appearance-none rounded-2xl border border-white/15 bg-white/10 px-5 pr-12 text-lg font-black text-white outline-none transition focus:border-[#ffcc4a] focus:ring-2 focus:ring-[#ffcc4a]/20"
              >
                {PILLARS.map((pillar) => (
                  <option key={pillar} value={pillar} className="bg-[#17172a] text-white">
                    {pillar}일주
                  </option>
                ))}
              </select>
              <ArrowDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#ffcc4a]" />
            </div>

            <div className="mt-4 grid items-center gap-3 rounded-2xl bg-[#ffcc4a] p-4 text-[#17172a] sm:grid-cols-[1fr_auto_1fr]">
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
              <Button type="submit" className="h-11 rounded-full bg-[#ffcc4a] px-5 text-sm font-black text-[#17172a] hover:bg-[#ffd86f]">
                내 자리 채우기 <ArrowDown className="ml-1 h-4 w-4" />
              </Button>
            </div>
            {joinMessage && <p className="mt-3 text-sm font-bold text-[#ffcc4a]" role="status">{joinMessage}</p>}
          </form>
        </div>

        <div className="relative rounded-[34px] bg-[#f5f1e8] p-4 text-[#17172a] shadow-[0_40px_100px_rgba(0,0,0,.3)] sm:p-6 lg:-rotate-[1deg] lg:p-8">
          <div className="flex items-end justify-between border-b border-[#17172a]/15 pb-6">
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-bold text-[#605f70]"><UsersRound className="h-4 w-4" /> 입력할 때마다 한 자리씩</p>
              <h2 className="text-3xl font-black tracking-[-0.05em] sm:text-4xl">채팅방 참가자 자리</h2>
            </div>
            <span className="text-sm font-black text-[#797786]">{members.length}명 참여</span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {members.map((member) => {
              const identity = getPillarIdentity(member.pillar);
              const active = member.name === myName;
              return (
                <button
                  key={member.name}
                  type="button"
                  onClick={() => viewAsMember(member)}
                  className={`relative min-h-36 rounded-[24px] border p-4 text-left transition ${active ? 'border-[#17172a] bg-[#ffcc4a]' : 'border-[#17172a]/10 bg-white hover:border-[#17172a]/35'}`}
                >
                  <CharacterSeal pillar={member.pillar} />
                  {active && <span className="absolute right-3 top-3 rounded-full bg-[#17172a] px-2 py-1 text-[10px] font-black text-white">내 기준</span>}
                  <strong className="mt-3 block truncate text-lg font-black">{member.name}</strong>
                  <span className="mt-1 block text-xs font-bold text-[#686575]">{member.pillar}일주 · {identity.nickname}</span>
                </button>
              );
            })}
            {Array.from({ length: Math.max(0, 6 - members.length) }).map((_, index) => (
              <div key={`empty-${index}`} className="grid min-h-36 place-items-center rounded-[24px] border border-dashed border-[#17172a]/20 bg-[#ece7dc]/45 p-4 text-center">
                <div>
                  <span className="mx-auto grid h-9 w-9 place-items-center rounded-full border border-dashed border-[#17172a]/25 text-lg text-[#8b8790]">+</span>
                  <p className="mt-2 text-xs font-bold text-[#8b8790]">다음 참가자 자리</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-[#eae5da] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-[#6c6975]">참가자를 누르면 그 사람을 기준으로 아래 협업 지도가 바뀝니다.</p>
            {members.length > 0 && (
              <button type="button" onClick={clearRoom} className="w-fit text-xs font-black text-[#8a5350] underline underline-offset-4">체험 명단 비우기</button>
            )}
          </div>
        </div>
      </section>

      <section ref={radarRef} className="bg-[#f5f1e8] text-[#17172a]" id="radar">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className="grid gap-6 border-b border-[#17172a]/15 pb-9 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="flex items-center gap-5">
              <CharacterSeal pillar={myPillar} size="large" />
              <div>
                <p className="mb-2 text-sm font-black text-[#6f6c78]">MY TEAM RADAR</p>
                <h2 className="text-4xl font-black tracking-[-0.055em] sm:text-6xl">{myIdentity.nickname}의 사람 지도</h2>
              </div>
            </div>
            <p className="max-w-[420px] text-base leading-7 text-[#666370]">편한 사람만 좋은 동료는 아니에요. 손발, 보완, 불꽃, 설명서라는 네 가지 방식으로 함께 일할 사람을 찾아보세요.</p>
          </div>

          <div className="mt-6 rounded-2xl border border-[#e2b231]/40 bg-[#fff1bd] px-4 py-3 text-sm font-bold leading-6 text-[#6f5210]">
            참가자가 직접 자리를 채우는 운영 논의용 데모입니다. 지금은 열린 화면 안에서만 명단이 유지되며, 새로고침하거나 다른 기기에서 열면 빈 상태로 시작해요.
          </div>

          <div className="mode-switch" role="tablist" aria-label="관계 보기 방식">
            <button role="tab" aria-selected={viewMode === 'members'} className={viewMode === 'members' ? 'is-active' : ''} onClick={() => setViewMode('members')}><UsersRound className="h-4 w-4" /> 팀원 보기</button>
            <button role="tab" aria-selected={viewMode === 'matrix'} className={viewMode === 'matrix' ? 'is-active' : ''} onClick={() => setViewMode('matrix')}><Gauge className="h-4 w-4" /> 전체 관계표</button>
          </div>

          {viewMode === 'members' ? (
            <Tabs value={filter} onValueChange={(value) => setFilter(value as 'all' | Bucket)} className="mt-6">
              <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-none bg-transparent p-0" variant="line">
                {FILTERS.map((item) => (
                  <TabsTrigger key={item.value} value={item.value} className="h-11 flex-none rounded-full border border-[#17172a]/15 px-4 text-sm font-black data-active:border-[#17172a] data-active:bg-[#17172a] data-active:text-white after:hidden">
                    {item.label}{item.value !== 'all' ? ` ${counts[item.value]}` : ` ${results.length}`}
                  </TabsTrigger>
                ))}
              </TabsList>

              {FILTERS.map((item) => {
                const visible = item.value === 'all' ? results : results.filter((member) => member.compatibility.bucket === item.value);
                return (
                  <TabsContent key={item.value} value={item.value} className="mt-7">
                    {visible.length > 0 ? (
                      <div className="grid gap-4 xl:grid-cols-2">
                        {visible.map((member) => (
                          <MemberCard key={member.name} member={member} rank={results.indexOf(member) + 1} onOpen={() => setSelectedName(member.name)} />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[28px] border border-dashed border-[#17172a]/20 py-16 text-center">
                        <p className="text-lg font-black">이 범주에 들어온 멤버가 아직 없어요.</p>
                        <p className="mt-2 text-[#75727d]">새로운 색동물 멤버를 기다려볼까요?</p>
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          ) : (
            <div className="matrix-panel">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="text-xl font-black">{myIdentity.nickname} 기준 60색동물 관계표</h3>
                  <p className="mt-1 text-sm text-[#777481]">칸의 숫자는 케미 온도예요. 누르면 같은 관계의 팀원 목록으로 이동합니다.</p>
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

          <div className="mt-12 grid gap-4 rounded-[30px] bg-[#17172a] p-6 text-white sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-8">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-[#ffcc4a] text-[#17172a]"><Lightbulb className="h-6 w-6" /></div>
            <p className="text-base leading-7 text-white/70"><strong className="text-white">이 결과는 일주 두 글자만 활용한 재미용 콘텐츠예요.</strong><br />실제 관계의 성공이나 사람의 좋고 나쁨을 판단하지 않습니다. 중요한 팀 결정은 대화와 실제 경험을 기준으로 해주세요.</p>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#ffcc4a]/40 bg-[#ffcc4a]/10 px-4 py-2 text-sm">
              <span className="font-bold text-white/45">만든 이</span>
              <strong className="font-black text-[#ffcc4a]">보드라운고슴도치</strong>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) { setSelectedName(null); setCopied(false); } }}>
        {selected && (() => {
          const identity = getPillarIdentity(selected.pillar);
          const compatibility = selected.compatibility;
          return (
            <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[30px] border-0 bg-[#f5f1e8] p-0 text-[#17172a] sm:max-w-[760px]">
              <div className="relative overflow-hidden rounded-t-[30px] bg-[#17172a] px-6 pb-8 pt-7 text-white sm:px-9">
                <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full border-[48px] border-white/[0.04]" />
                <DialogHeader className="relative">
                  <DialogDescription className="text-sm font-black text-[#ffcc4a]">COLOR ANIMAL TEAM CHEMISTRY</DialogDescription>
                  <div className="flex items-center gap-3 pt-3 sm:gap-5">
                    <CharacterSeal pillar={myPillar} size="large" />
                    <span className="text-2xl font-light text-white/30">×</span>
                    <CharacterSeal pillar={selected.pillar} size="large" />
                    <div className="ml-auto text-right">
                      <strong className="block text-5xl font-black tracking-[-0.08em] text-[#ffcc4a]">{compatibility.overall}°</strong>
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

                <div className="flex flex-col gap-3 border-t border-[#17172a]/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[#777481]">{selected.name}님과의 결과를 복사해서 공유해보세요.</p>
                  <Button onClick={copyResult} className="h-11 rounded-full bg-[#17172a] px-5 font-black text-white hover:bg-[#2d2d45]">
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
