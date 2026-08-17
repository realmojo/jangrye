import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Cloudflare 빌드 산출물 (npm run cf:build)
    ".open-next/**",
    // CSV 적재용 독립 스크립트 (Node 전용)
    "scripts/**",
    // 네이버 색인 제출용 독립 스크립트 (CommonJS, 저장소 추적 대상 아님)
    "naver-indexing/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      // 애드센스·네이버 애널리틱스·gtag 는 <head> 에 원시 <script> 로 둔다.
      // keywordegg 와 같은 방식이라 규칙을 끈다.
      "@next/next/no-sync-scripts": "off",
      "@next/next/next-script-for-ga": "off",
      // 내부 이동도 <a target="_self"> 로 통일해 매번 새로 로드시킨다
      // (광고를 매 페이지 새로 요청하기 위한 의도적 선택 — keywordegg 와 동일)
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]);

export default eslintConfig;
