import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * 클라이언트 사이드용 Supabase 클라이언트.
 *
 * createClient() 는 URL 이 비어 있으면 즉시 예외를 던진다. 모듈 로드 시점에
 * 만들어 두면 환경변수가 없는 빌드 환경에서 페이지 데이터 수집 단계가
 * 통째로 실패하므로, 실제로 접근할 때 생성한다.
 */
let browserClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase 환경 변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_ANON_KEY 를 확인하세요.",
    );
  }
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return browserClient;
}

/**
 * 서버 사이드용 Supabase 클라이언트 (서비스 롤 키 사용).
 * 키가 없으면 null 이며, 호출부에서 null 체크 후 사용한다.
 */
export const supabaseAdmin: SupabaseClient | null =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;
