import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * 기본값으로 둔다. 이 상태에서도 배포·동작에는 문제가 없다.
 *
 * 다만 증분 캐시 저장소를 지정하지 않으면 lib/region-data.ts 의
 * unstable_cache 가 요청 사이에 유지되지 않는다. 즉 지역 페이지가 열릴 때마다
 * Supabase 를 계속 친다. 지역 페이지가 229개라 크롤러가 한 번 돌면 부담이 크다.
 *
 * 트래픽이 붙으면 KV 를 붙인다. 순서는 이렇다.
 *
 *   1) npx wrangler kv namespace create NEXT_INC_CACHE_KV
 *   2) 출력된 id 를 wrangler.jsonc 에 넣는다
 *        "kv_namespaces": [
 *          { "binding": "NEXT_INC_CACHE_KV", "id": "<위에서 받은 id>" }
 *        ]
 *   3) 아래 두 줄의 주석을 푼다
 *
 * 바인딩을 만들지 않은 채 주석만 풀면 배포된 워커가 런타임에 실패한다.
 * 반드시 1~2번을 먼저 할 것.
 */
// import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

export default defineCloudflareConfig({
  // incrementalCache: kvIncrementalCache,
});
