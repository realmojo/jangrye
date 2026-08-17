import { REGION_HUB_SLUG } from "./regions";
import { GROUPS } from "./facilities";

export interface MenuItem {
  name: string;
  href: string;
}

export const NAV: MenuItem[] = [
  { name: "홈", href: "/" },
  ...GROUPS.map((g) => ({ name: g.name, href: `/${g.slug}` })),
  { name: "지역별", href: `/${REGION_HUB_SLUG}` },
];

export const SITE_LINKS: MenuItem[] = [
  { name: "사이트 소개", href: "/about" },
  { name: "문의하기", href: "/contact" },
  { name: "개인정보처리방침", href: "/privacy" },
  { name: "이용약관", href: "/terms" },
];

/**
 * 공식 창구.
 *
 * 이 사이트는 **예약을 받지 않는다.** 화장 예약은 e하늘 한 곳으로만 되고
 * 그것이 법정 절차다. 유족이 급할 때 헷갈리지 않게 예약 링크를 눈에 띄게 둔다.
 */
export const OFFICIAL_LINKS = {
  /** e하늘 장사정보 (원본) */
  dataset: "https://www.15774129.go.kr",
  /** 전국 화장 통합예약 — 실제로 예약해야 하는 곳 */
  reserve: "https://www.15774129.go.kr/funeral",
  /** 상담 전화 */
  tel: "1577-4129",
  /** 사망신고·장례 절차 안내 */
  gov: "https://www.gov.kr",
  /** 한국장례문화진흥원 */
  kfcpi: "https://www.kfcpi.or.kr",
} as const;
