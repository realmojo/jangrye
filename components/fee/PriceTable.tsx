import { formatWon, formatWonShort, type Price } from "@/lib/facilities";

/**
 * 장례식장 등의 자유 항목 가격.
 *
 * **품목명은 시설이 직접 입력한다.** 같은 물건이 "오동집성 1.0" 과
 * "오동나무관(특)" 으로 흩어져 있어서 시설끼리 품목 단위로 견줄 수 없다.
 * 그래서 여기서는 **큰 분류(tier1) 로 묶어 나열만** 하고, 비교는 원본이
 * 계산해 둔 관내·전국 평균(`avg_in`·`avg_all`)이 있을 때만 보여준다.
 *
 * 한 시설이 300행 가까이 되는 경우가 있어 분류마다 상한을 둔다.
 */
const PER_TIER = 14;

export default function PriceTable({
  prices,
  kind,
  title,
  desc,
}: {
  prices: Price[];
  kind: string;
  title: string;
  desc: string;
}) {
  const rows = prices.filter((p) => p.kind === kind);
  if (rows.length === 0) return null;

  // 큰 분류별로 묶고, 분류 안에서는 비싼 것부터
  const byTier = new Map<string, Price[]>();
  for (const r of rows) {
    const key = r.tier1 ?? "기타";
    const list = byTier.get(key) ?? [];
    list.push(r);
    byTier.set(key, list);
  }
  const tiers = [...byTier.entries()]
    .map(([tier, list]) => ({
      tier,
      list: [...list].sort((a, b) => b.amount - a.amount),
    }))
    .sort((a, b) => b.list.length - a.list.length);

  const hasAvg = rows.some((r) => r.avg_in !== null || r.avg_all !== null);

  return (
    <section className="panel">
      <h2 className="panel__title">{title}</h2>
      <p className="panel__desc">{desc}</p>

      {tiers.map(({ tier, list }) => (
        <div key={tier} style={{ marginBottom: 18 }}>
          <h3 className="route__title">
            {tier} <span style={{ color: "var(--c-text-sub)" }}>{list.length}개</span>
          </h3>
          <div className="table-scroll">
            <table className="pr-table">
              <thead>
                <tr>
                  <th scope="col">품목</th>
                  <th scope="col" className="is-num">
                    금액
                  </th>
                  {hasAvg && (
                    <>
                      <th scope="col" className="is-num">
                        관내 평균
                      </th>
                      <th scope="col" className="is-num">
                        전국 평균
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {list.slice(0, PER_TIER).map((p, i) => (
                  <tr key={`${p.item}-${i}`}>
                    <td>
                      <span className="pr-table__name">{p.item ?? "-"}</span>
                      {p.content && <span className="pr-table__meta">{p.content}</span>}
                    </td>
                    <td className="is-num">
                      <strong>{formatWon(p.amount)}</strong>
                      {p.days ? (
                        <span className="pr-table__meta">{p.days}일 기준</span>
                      ) : null}
                    </td>
                    {hasAvg && (
                      <>
                        <td className="is-num">{formatWonShort(p.avg_in)}</td>
                        <td className="is-num">{formatWonShort(p.avg_all)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.length > PER_TIER && (
            <p className="panel__desc" style={{ margin: "8px 0 0" }}>
              비싼 것부터 {PER_TIER}개만 실었습니다. 나머지 {list.length - PER_TIER}개는
              시설에 문의하세요.
            </p>
          )}
        </div>
      ))}

      {hasAvg && (
        <p className="panel__desc" style={{ margin: 0 }}>
          관내·전국 평균은 원본이 계산해 둔 값입니다. 품목 이름을 시설이 직접
          입력하기 때문에 <strong>같은 이름이라도 규격이 다를 수 있습니다.</strong>
        </p>
      )}
    </section>
  );
}
