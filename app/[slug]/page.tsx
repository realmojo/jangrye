import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CREMATORIUM,
  GROUPS,
  feeMap,
  feeOf,
  formatWon,
  getFacility,
  getRegion,
  groupBySlug,
  listCremationFees,
  ratio,
  ratioText,
  regionLabelOf,
  type Facility,
  type FacilityGroup,
  type RegionStats,
} from "@/lib/facilities";
import {
  REGION_HUB_SLUG,
  SIDOS,
  codeFromSlug,
  regionLabel,
  sidoBySlug,
  type Sido,
} from "@/lib/regions";
import { buildMetadata, SITE } from "@/lib/seo";
import { decodeSlug } from "@/lib/slug";
import GroupHubView from "./GroupHubView";
import RegionHubView from "./RegionHubView";
import SidoView from "./SidoView";
import RegionView from "./RegionView";
import FacilityView from "./FacilityView";

/**
 * 한 라우트가 다섯 화면을 맡는다.
 *
 *   /화장시설 /장례식장                → 종류별 허브
 *   /지역                            → 지역 허브
 *   /서울                            → 시도 상세
 *   /서울-서초구                      → 시군구 상세
 *   /서울추모공원-4000000056          → 시설 상세 (요금 + 장소)
 *
 * **찾는 순서가 중요하다.** 코드에 박힌 고정 슬러그(허브·시도)를 먼저 찾고,
 * 그 다음이 DB 에서 오는 시설·지역이다.
 *
 * 시설 슬러그와 지역 슬러그를 가르는 기준은 **끝이 6자리 이상 숫자인지** 다
 * (`서울추모공원-4000000056` vs `서울-서초구`). 시설명에 숫자가 들어가도
 * 코드가 항상 뒤에 붙으므로 충돌하지 않는다.
 */
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

type Resolved =
  | { kind: "group"; group: FacilityGroup }
  | { kind: "region-hub" }
  | { kind: "sido"; sido: Sido }
  | { kind: "facility"; facility: Facility }
  | { kind: "region"; region: RegionStats }
  | { kind: "none" };

async function resolve(slug: string): Promise<Resolved> {
  const group = groupBySlug(slug);
  if (group) return { kind: "group", group };

  if (slug === REGION_HUB_SLUG) return { kind: "region-hub" };

  const sido = sidoBySlug(slug);
  if (sido) {
    // 세종·광주처럼 시군구 없이 시설이 등록된 곳은 시도 슬러그와 지역 슬러그가
    // 같다. 그럴 때도 시도 화면(시군구 목록)을 보여준다 — 그 안에 자기 자신이
    // 한 줄로 들어가므로 상세로 갈 길이 막히지 않는다.
    return { kind: "sido", sido };
  }

  const code = codeFromSlug(slug);
  if (code) {
    const facility = await getFacility(code);
    if (facility) return { kind: "facility", facility };
  }

  const region = await getRegion(slug);
  if (region) return { kind: "region", region };

  return { kind: "none" };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeSlug((await params).slug);
  const found = await resolve(slug);

  switch (found.kind) {
    case "group": {
      const g = found.group;
      const isCrem = g.code === CREMATORIUM;
      return buildMetadata({
        path: `/${g.slug}`,
        title: isCrem
          ? `전국 화장장 요금 — 관내·관외 얼마나 다른가 | ${SITE.name}`
          : `전국 장례식장 빈소 임대료와 위치 | ${SITE.name}`,
        description: isCrem
          ? "전국 화장시설 62곳의 관내·관외 요금을 한 표로 비교했습니다. 같은 화장로인데도 어느 지역 주민이냐에 따라 중간값 기준 10배 차이 납니다."
          : "전국 장례식장의 빈소 임대료·용품·서비스 요금과 위치·교통·주차 정보를 정리했습니다.",
        keywords: isCrem
          ? ["화장장 요금", "화장 비용", "관외 화장료", "화장장 관내 관외", "화장시설"]
          : ["장례식장 비용", "빈소 임대료", "장례식장 요금", "장례비용"],
      });
    }

    case "region-hub":
      return buildMetadata({
        path: `/${REGION_HUB_SLUG}`,
        title: `지역별 장례비용 — 우리 동네 화장장과 장례식장 | ${SITE.name}`,
        description:
          "전국 시군구별 화장시설·장례식장 요금과 위치입니다. 화장장이 없는 지역은 이웃 시군구를 쓰면서 관외 요금을 내게 됩니다.",
        keywords: ["지역별 장례비용", "우리동네 화장장", "시군구 장례식장"],
      });

    case "sido": {
      const s = found.sido;
      return buildMetadata({
        path: `/${s.slug}`,
        title: `${s.name} 화장장·장례식장 요금 | ${SITE.name}`,
        description: `${s.name}의 화장시설과 장례식장 요금을 시군구별로 비교했습니다. 관내·관외 화장료와 빈소 임대료를 확인하세요.`,
        keywords: [
          `${s.slug} 화장장`,
          `${s.slug} 장례식장`,
          `${s.slug} 화장 비용`,
          `${s.name} 장례비용`,
        ],
      });
    }

    case "region": {
      const r = found.region;
      const name = regionLabel(r.sido_slug, r.sigungu_name);
      return buildMetadata({
        path: `/${r.region_slug}`,
        title:
          r.crem_inner_mid !== null
            ? `${name} 화장장 요금 관내 ${formatWon(r.crem_inner_mid)} | ${SITE.name}`
            : `${name} 장례식장과 화장장 | ${SITE.name}`,
        description: `${name}의 화장시설 ${r.crematorium_cnt}곳, 장례식장 ${r.hall_cnt}곳의 요금과 위치입니다.${
          r.crem_inner_mid !== null
            ? ` 관내 화장료 ${formatWon(r.crem_inner_mid)}, 관외 ${formatWon(r.crem_outer_mid)}.`
            : ""
        }`,
        keywords: [
          `${name} 화장장`,
          `${name} 장례식장`,
          `${r.sigungu_name ?? r.sido_slug} 화장 비용`,
        ],
      });
    }

    case "facility": {
      const f = found.facility;
      const isCrem = f.group_cd === CREMATORIUM;
      const region = regionLabelOf(f);
      let head = `${f.name} — ${region}`;
      let desc = `${region}에 있는 ${f.group_name}. 요금과 주소·전화·가는 길·주차·편의시설을 정리했습니다.`;

      if (isCrem) {
        const fees = await listCremationFees(f.facility_cd);
        const m = feeMap(fees);
        const inner = feeOf(m, "대인", "관내");
        const outer = feeOf(m, "대인", "관외");
        const gap = ratio(outer, inner);
        if (inner !== null) {
          head = `${f.name} 화장 요금 — 관내 ${formatWon(inner)}`;
          desc = `${f.name}의 화장 요금은 관내 ${formatWon(inner)}, 관외 ${formatWon(outer)}${
            gap ? `로 ${ratioText(gap)} 차이` : ""
          }입니다. 주소·전화·가는 길과 시설 정보도 함께 정리했습니다.`;
        }
      }

      return buildMetadata({
        path: `/${f.slug}`,
        title: `${head} | ${SITE.name}`,
        description: desc,
        keywords: [
          f.name,
          `${f.name} 요금`,
          `${f.name} 위치`,
          `${region} ${f.group_name}`,
          isCrem ? "화장 비용" : "빈소 임대료",
        ],
        type: "article",
      });
    }

    default:
      return {};
  }
}

export default async function SlugPage({ params }: Props) {
  const slug = decodeSlug((await params).slug);
  const found = await resolve(slug);

  switch (found.kind) {
    case "group":
      return <GroupHubView group={found.group} />;
    case "region-hub":
      return <RegionHubView />;
    case "sido":
      return <SidoView sido={found.sido} />;
    case "region":
      return <RegionView region={found.region} />;
    case "facility":
      return <FacilityView facility={found.facility} />;
    default:
      notFound();
  }
}

/** 코드에 박혀 있어 DB 없이도 아는 경로만 미리 만든다 */
export function generateStaticParams(): { slug: string }[] {
  return [
    ...GROUPS.map((g) => ({ slug: g.slug })),
    { slug: REGION_HUB_SLUG },
    ...SIDOS.map((s) => ({ slug: s.slug })),
  ];
}
