"use client";

import { usePathname } from "next/navigation";
import { NAV } from "@/lib/menu";

export default function SiteHeader() {
  const pathname = usePathname();

  // 한글 경로는 브라우저가 퍼센트 인코딩한 형태로 넘겨줄 때가 있어 되돌려 비교한다
  const current = safeDecode(pathname);

  const isActive = (href: string) =>
    href === "/" ? current === "/" : current.startsWith(href);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a target="_self" href="/" className="site-logo">
          <span aria-hidden>🕯️</span>
          <span>장례비용</span>
        </a>

        <nav className="site-nav" aria-label="주요 메뉴">
          {NAV.map((item) => (
            <a
              target="_self"
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? "is-active" : undefined}
            >
              {item.name}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
