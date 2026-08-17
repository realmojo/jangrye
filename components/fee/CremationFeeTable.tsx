import {
  SCOPES,
  SCOPE_NOTE,
  SUBJECTS,
  SUBJECT_NOTE,
  feeMap,
  feeOf,
  formatWon,
  ratio,
  ratioText,
  type CremationFee,
  type Grade,
} from "@/lib/facilities";

/**
 * 화장료 표.
 *
 * 축이 셋(대상 × 지역구분 × 자격)이라 한 표에 다 넣으면 읽을 수 없다.
 * **자격은 '일반'을 기본으로 보여주고 감면 대상은 아래에 따로 적는다.**
 * 대상을 행, 지역구분을 열로 두는 것이 사람들이 찾는 순서에 맞다 —
 * "우리 아버지(대인)를 이 화장장에서 화장하면(관내/관외) 얼마" 다.
 */
export default function CremationFeeTable({
  fees,
  facilityName,
}: {
  fees: CremationFee[];
  facilityName: string;
}) {
  const map = feeMap(fees);

  // 값이 하나도 없는 대상·지역구분은 열·행에서 뺀다. "-" 만 남는 표는 읽기 나쁘다.
  const subjects = SUBJECTS.filter((s) =>
    SCOPES.some((sc) => feeOf(map, s, sc) !== null),
  );
  const scopes = SCOPES.filter((sc) =>
    subjects.some((s) => feeOf(map, s, sc) !== null),
  );

  const grades = [...new Set(fees.map((f) => f.grade))].filter(
    (g): g is Grade => g !== "일반",
  );

  if (subjects.length === 0) {
    return (
      <div className="empty-box">
        이 시설은 화장료를 등록하지 않았습니다.
        <br />
        전화로 문의하셔야 합니다.
      </div>
    );
  }

  const inner = feeOf(map, "대인", "관내");
  const outer = feeOf(map, "대인", "관외");
  const gap = ratio(outer, inner);

  return (
    <>
      <div className="table-scroll">
        <table className="pr-table">
          <caption className="sr-only">
            {facilityName}의 화장 이용료 — 대상별·지역구분별 금액
          </caption>
          <thead>
            <tr>
              <th scope="col">대상</th>
              {scopes.map((sc) => (
                <th key={sc} scope="col" className="is-num">
                  {sc}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s}>
                <th scope="row">
                  <span className="pr-table__name">{s}</span>
                  <span className="pr-table__meta">{SUBJECT_NOTE[s]}</span>
                </th>
                {scopes.map((sc) => {
                  const v = feeOf(map, s, sc);
                  return (
                    <td key={sc} className="is-num">
                      {v === null ? (
                        "-"
                      ) : s === "대인" && sc === "관내" ? (
                        <strong>{formatWon(v)}</strong>
                      ) : (
                        formatWon(v)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {gap && gap >= 2 && (
        <p className="fee-gap">
          이 시설은 관내와 관외가 <strong>{ratioText(gap)}</strong> 차이 납니다 —
          관내 {formatWon(inner)}, 관외 {formatWon(outer)}.
        </p>
      )}

      <dl className="kv kv--tight">
        {scopes.map((sc) => (
          <div key={sc} className="kv__row">
            <dt>{sc}</dt>
            <dd>{SCOPE_NOTE[sc]}</dd>
          </div>
        ))}
      </dl>

      {grades.length > 0 && (
        <div className="panel panel--inset">
          <h3 className="panel__title panel__title--sm">감면 대상</h3>
          <p className="panel__desc">
            아래 자격이면 요금이 달라집니다. 증빙 서류가 필요하니 시설에 미리
            확인하세요.
          </p>
          <div className="table-scroll">
            <table className="pr-table">
              <thead>
                <tr>
                  <th scope="col">자격</th>
                  {scopes.map((sc) => (
                    <th key={sc} scope="col" className="is-num">
                      {sc} (대인)
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => (
                  <tr key={g}>
                    <th scope="row">{g}</th>
                    {scopes.map((sc) => (
                      <td key={sc} className="is-num">
                        {formatWon(feeOf(map, "대인", sc, g))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
