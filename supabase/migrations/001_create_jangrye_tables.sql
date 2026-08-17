-- jangrye.keywordegg.com 기본 테이블
--
--   jangrye_facilities      : 장사시설 마스터 (화장시설·장례식장·봉안·묘지·자연장지)
--   jangrye_cremation_fees  : 화장료. (대상 × 지역구분 × 자격) 으로 정규화한 것
--   jangrye_prices          : 그 밖의 가격 (빈소 임대료·서비스·장사용품)
--   jangrye_regions         : 시군구 집계. 허브 목록과 비교에 쓴다
--
-- 원본: 보건복지부 e하늘 장사정보시스템 (https://www.15774129.go.kr)
-- 적재: scripts/import-facilities.mjs

/* ------------------------------ 시설 마스터 ------------------------------ */

create table if not exists public.jangrye_facilities (
  facility_cd      text primary key,        -- e하늘 facilitycd
  group_cd         text        not null,    -- TBC0700001 장례식장 / TBC0700004 화장시설 …
  group_name       text,
  name             text        not null,
  -- URL 슬러그. `{정리한 이름}-{시설코드}` 형태로 코드를 항상 붙인다
  slug             text        not null,

  sido_slug        text        not null,    -- 서울, 경북 …
  sido_name        text,
  sigungu_name     text,                    -- 시군구가 없는 곳(세종·광주 본청)은 빈 값
  region_slug      text        not null,    -- 서울-서초구 / 세종

  address          text,
  zipcode          text,
  lat              double precision,
  lng              double precision,

  tel              text,
  fax              text,
  homepage         text,

  is_public        boolean,                 -- 공설 여부
  manage_class     text,                    -- 직영 / 임대
  hall_type        text,                    -- 병원 / 전문 (장례식장)

  mortuary_cnt     integer,                 -- 빈소 수
  charnel_cnt      integer,                 -- 안치 능력
  park_cnt         integer,

  has_meal         boolean,
  has_store        boolean,
  has_waitroom     boolean,                 -- 유족 대기실
  has_barrier_free boolean,                 -- 장애인 편의시설
  has_park         boolean,

  intro            text,                    -- 시설 소개 원문
  traffic_public   text,                    -- 대중교통 안내 원문
  traffic_car      text,                    -- 자차 안내 원문

  month_dead       integer,                 -- 월 처리 건수
  year_dead        integer,                 -- 연 처리 건수

  -- **화면에 반드시 노출한다.** 2015년 기준으로 남아 있는 시설이 적지 않다
  price_date       date,
  opened_on        date,

  photos           jsonb       not null default '[]'::jsonb,
  created_at       timestamptz not null default now()
);

comment on table public.jangrye_facilities is
  '장사시설 (보건복지부 e하늘 장사정보시스템)';
comment on column public.jangrye_facilities.price_date is
  '시설이 가격을 마지막으로 등록한 날. 오래된 곳이 많아 화면에 반드시 노출한다';
comment on column public.jangrye_facilities.photos is
  'e하늘 서버의 사진 경로 [{"url":"/BCUser/...","title":"전경","order":1}]. 우리 쪽으로 복사하지 않는다';
comment on column public.jangrye_facilities.slug is
  'URL 슬러그. 조회는 이름이 아니라 슬러그 끝의 시설코드로 한다';

create unique index if not exists jangrye_facilities_slug_key
  on public.jangrye_facilities (slug);

create index if not exists jangrye_facilities_region_idx
  on public.jangrye_facilities (region_slug, group_cd);

create index if not exists jangrye_facilities_group_idx
  on public.jangrye_facilities (group_cd, sido_slug);

/* ------------------------------- 화장료 ------------------------------- */

-- 화장시설 요금은 정형 컬럼(inneradultamt 등)에도 있지만 62곳 중 9곳(15%)만
-- 채워져 있어 쓰지 않는다. 실제 값은 자유 텍스트(rentcontent)에 있고,
-- 적재 스크립트가 (대상 × 지역구분 × 자격) 세 축으로 갈라 여기에 넣는다.
create table if not exists public.jangrye_cremation_fees (
  id           bigserial primary key,
  facility_cd  text not null references public.jangrye_facilities (facility_cd)
                 on delete cascade,
  subject      text not null,   -- 대인 / 소인 / 태아 / 개장유골 / 무연고
  scope        text not null,   -- 관내 / 준관내 / 관외
  grade        text not null,   -- 일반 / 수급자 / 국가유공자 / 장애인 / 기타
  amount       integer,
  item_raw     text,            -- 원본 항목명 (표기가 흔들려 남겨 둔다)
  content_raw  text,            -- 원본 rentcontent
  constraint jangrye_cremation_fees_subject_check
    check (subject in ('대인', '소인', '태아', '개장유골', '무연고')),
  constraint jangrye_cremation_fees_scope_check
    check (scope in ('관내', '준관내', '관외'))
);

comment on table public.jangrye_cremation_fees is
  '화장 이용료. 관내/관외 차이가 이 사이트의 핵심 지표다 (중간값 기준 10배)';

-- 같은 (시설 × 대상 × 지역 × 자격) 이 원본에 여러 행으로 오는 경우가 있어
-- 고유 제약을 걸지 않는다. 화면에서는 같은 조합의 최저값을 대표로 쓴다.
create index if not exists jangrye_cremation_fees_key
  on public.jangrye_cremation_fees (facility_cd, subject, scope, grade);

create index if not exists jangrye_cremation_fees_lookup
  on public.jangrye_cremation_fees (subject, scope, grade, amount);

/* --------------------------- 그 밖의 가격 --------------------------- */

create table if not exists public.jangrye_prices (
  id           bigserial primary key,
  facility_cd  text not null references public.jangrye_facilities (facility_cd)
                 on delete cascade,
  kind         text not null,   -- 시설사용료 / 서비스 / 장사용품
  tier1        text,            -- 코드값에서 온 큰 분류 (신뢰할 수 있다)
  tier2        text,            -- 코드값에서 온 작은 분류
  item         text,            -- 시설이 직접 입력한 품목명 (표기가 제각각)
  content      text,
  amount       integer not null,
  -- 원본이 이미 계산해 둔 비교값. 장례식장에만 절반쯤 채워져 있다
  avg_in       integer,
  avg_all      integer,
  days         integer
);

comment on table public.jangrye_prices is
  '빈소 임대료·서비스·장사용품 가격. item 은 시설이 직접 입력해 표기가 제각각이라
   비교는 tier1/tier2(코드값) 수준까지만 한다';

create index if not exists jangrye_prices_facility_idx
  on public.jangrye_prices (facility_cd, kind, tier1);

create index if not exists jangrye_prices_tier_idx
  on public.jangrye_prices (tier1, tier2, amount);

/* ----------------------------- 지역 집계 ----------------------------- */

create table if not exists public.jangrye_regions (
  region_slug     text primary key,
  sido_slug       text    not null,
  sido_name       text,
  sigungu_name    text,
  facility_cnt    integer not null default 0,
  crematorium_cnt integer not null default 0,
  hall_cnt        integer not null default 0,
  -- 관내/관외 대인 화장료 중간값 (일반 자격 기준)
  crem_inner_mid  integer,
  crem_outer_mid  integer,
  -- 빈소 임대료 중간값 (tier1 = 시설임대료)
  hall_rent_mid   integer,
  -- 가격을 가장 최근에 갱신한 날. 지역 신선도 표시에 쓴다
  latest_price_date date
);

comment on table public.jangrye_regions is '시군구 집계 (jangrye_facilities·fees 에서 계산)';

create index if not exists jangrye_regions_sido_idx
  on public.jangrye_regions (sido_slug, sigungu_name);

/* ------------------------------ 집계 갱신 ------------------------------ */

-- 적재 스크립트가 마지막에 호출한다.
-- 이 프로젝트는 pg_safeupdate 가 켜져 있어 WHERE 없는 DELETE 가 막힌다 →
-- `where true` 를 붙인다.
create or replace function public.refresh_jangrye_aggregates()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.jangrye_regions where true;

  insert into public.jangrye_regions (
    region_slug, sido_slug, sido_name, sigungu_name,
    facility_cnt, crematorium_cnt, hall_cnt,
    crem_inner_mid, crem_outer_mid, hall_rent_mid, latest_price_date
  )
  select
    f.region_slug,
    min(f.sido_slug),
    min(f.sido_name),
    min(f.sigungu_name),
    count(*),
    count(*) filter (where f.group_cd = 'TBC0700004'),
    count(*) filter (where f.group_cd = 'TBC0700001'),
    -- 화장료는 시설마다 여러 행이 올 수 있어 시설별 최저값을 먼저 잡고 중간값을 낸다
    (select percentile_disc(0.5) within group (order by m.amt)::integer
       from (select min(cf.amount) as amt
               from public.jangrye_cremation_fees cf
               join public.jangrye_facilities f2 on f2.facility_cd = cf.facility_cd
              where f2.region_slug = f.region_slug
                and cf.subject = '대인' and cf.scope = '관내' and cf.grade = '일반'
                and cf.amount is not null
              group by cf.facility_cd) m),
    (select percentile_disc(0.5) within group (order by m.amt)::integer
       from (select min(cf.amount) as amt
               from public.jangrye_cremation_fees cf
               join public.jangrye_facilities f2 on f2.facility_cd = cf.facility_cd
              where f2.region_slug = f.region_slug
                and cf.subject = '대인' and cf.scope = '관외' and cf.grade = '일반'
                and cf.amount is not null
              group by cf.facility_cd) m),
    (select percentile_disc(0.5) within group (order by p.amount)::integer
       from public.jangrye_prices p
       join public.jangrye_facilities f3 on f3.facility_cd = p.facility_cd
      where f3.region_slug = f.region_slug
        and p.tier1 = '시설임대료' and p.amount > 0),
    max(f.price_date)
  from public.jangrye_facilities f
  group by f.region_slug;
end;
$$;

comment on function public.refresh_jangrye_aggregates() is
  '적재 후 jangrye_regions 를 다시 만든다';

/* -------------------------------- 접근 제어 -------------------------------- */

-- 서비스 롤 키를 쓰는 서버 컴포넌트만 접근한다 (RLS 를 켜고 정책은 두지 않는다)
alter table public.jangrye_facilities     enable row level security;
alter table public.jangrye_cremation_fees enable row level security;
alter table public.jangrye_prices         enable row level security;
alter table public.jangrye_regions        enable row level security;
