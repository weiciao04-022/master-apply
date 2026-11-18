/**
 * 路由用 #name（只用英數字與連字號），在一般瀏覽器與 claude.ai 預覽框架都能運作。
 * 學程頁：#program-<id>
 */
export const safeId = (id: string) => id.replace(/[^A-Za-z0-9-]/g, '-');
export const programHref = (id: string) => `#program-${safeId(id)}`;
export const pageHref = (page: string) => `#${page || 'today'}`;
export function go(href: string) {
  location.hash = href;
}
