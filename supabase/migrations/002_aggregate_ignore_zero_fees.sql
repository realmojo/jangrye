-- 지역 집계가 0원을 대표값으로 고르지 않게 한다.
--
-- 원본에 감면 대상 요금이 0원으로 섞여 들어온다(보훈대상자·기초생활수급자·
-- 행려병자). 적재 스크립트가 자격을 갈라내지만 표기가 워낙 여러 가지라
-- 놓치는 행이 남는다. 그 상태에서 min(amount) 를 쓰면 "관내 무료 → 관외 무료"
-- 같은 값이 나온다 — 관외까지 무료인 화장장은 없다.
--
-- 그래서 **0보다 큰 값 중 최저**를 시설 대표값으로 쓴다. 0원만 있는 시설은
-- 0으로 남긴다 (국립소록도병원화장장처럼 실제로 무료인 곳이 있다).
--
-- 같은 규칙이 화면 쪽 lib/facilities.ts 의 feeMap() 에도 걸려 있다.
-- **한쪽만 고치면 지역 집계가 여전히 0원으로 남는다.**
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
    (select percentile_disc(0.5) within group (order by m.amt)::integer
       from (select coalesce(min(cf.amount) filter (where cf.amount > 0),
                            min(cf.amount)) as amt
               from public.jangrye_cremation_fees cf
               join public.jangrye_facilities f2 on f2.facility_cd = cf.facility_cd
              where f2.region_slug = f.region_slug
                and cf.subject = '대인' and cf.scope = '관내' and cf.grade = '일반'
                and cf.amount is not null
              group by cf.facility_cd) m),
    (select percentile_disc(0.5) within group (order by m.amt)::integer
       from (select coalesce(min(cf.amount) filter (where cf.amount > 0),
                            min(cf.amount)) as amt
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
