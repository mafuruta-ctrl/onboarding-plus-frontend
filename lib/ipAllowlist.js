/**
 * 接続元IPが許可リスト（環境変数 ALLOWED_IPS）に含まれるかを判定するユーティリティ。
 * - カンマ区切りで複数指定可（例：210.172.128.238,203.0.113.0/24）
 * - IPv4 / IPv6、単一アドレス / CIDR表記のどちらにも対応
 * - Edge Runtime（Next.jsのmiddleware）で動くよう、Node.js専用モジュールは使わない
 */

function parseIPv4(str) {
  const parts = str.split(".");
  if (parts.length !== 4) return null;
  let value = 0n;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    value = (value << 8n) + BigInt(n);
  }
  return value;
}

function parseIPv6(str) {
  let s = str;
  // 末尾がIPv4表記（例 ::ffff:1.2.3.4）の場合は16進2ブロックに変換する
  const lastColon = s.lastIndexOf(":");
  const tail = s.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = parseIPv4(tail);
    if (v4 === null) return null;
    s = s.slice(0, lastColon + 1) + ((v4 >> 16n) & 0xffffn).toString(16) + ":" + (v4 & 0xffffn).toString(16);
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 1) return null;
  const groups = halves.length === 2 ? [...head, ...Array(missing).fill("0"), ...rest] : head;
  let value = 0n;
  for (const g of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    value = (value << 16n) + BigInt(parseInt(g, 16));
  }
  return value;
}

/** IP文字列を { version, value } に変換する。IPv4射影アドレスはIPv4として扱う。 */
export function parseIp(raw) {
  if (!raw) return null;
  const str = String(raw).trim().replace(/^\[|\]$/g, "").split("%")[0];
  if (str.includes(":")) {
    const v6 = parseIPv6(str);
    if (v6 === null) return null;
    if (v6 >> 32n === 0xffffn) return { version: 4, value: v6 & 0xffffffffn };
    return { version: 6, value: v6 };
  }
  const v4 = parseIPv4(str);
  return v4 === null ? null : { version: 4, value: v4 };
}

/** "a.b.c.d" または "a.b.c.d/nn" を { version, network, prefix } に変換する。不正な値は null。 */
export function parseRule(rule) {
  const [addr, prefixStr, extra] = String(rule).trim().split("/");
  if (!addr || extra !== undefined) return null;
  const ip = parseIp(addr);
  if (!ip) return null;
  const bits = ip.version === 4 ? 32 : 128;
  let prefix = bits;
  if (prefixStr !== undefined) {
    if (!/^\d{1,3}$/.test(prefixStr)) return null;
    prefix = Number(prefixStr);
    if (prefix > bits) return null;
  }
  const shift = BigInt(bits - prefix);
  return { version: ip.version, network: (ip.value >> shift) << shift, prefix, bits };
}

/** 環境変数の文字列（カンマ区切り）を解析する。不正な項目は invalid に入れて返す。 */
export function parseAllowList(envValue) {
  const rules = [];
  const invalid = [];
  String(envValue || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((item) => {
      const r = parseRule(item);
      if (r) rules.push(r);
      else invalid.push(item);
    });
  return { rules, invalid };
}

export function isIpAllowed(ipStr, rules) {
  const ip = parseIp(ipStr);
  if (!ip) return false;
  return rules.some((r) => {
    if (r.version !== ip.version) return false;
    const shift = BigInt(r.bits - r.prefix);
    return (ip.value >> shift) << shift === r.network;
  });
}
