export const root = process.env.API_BASE_URL ?? "http://localhost:8080/api/v1";
export class Browser {
  cookies = new Map<string, string>();
  csrf = "";
  async raw(
    path: string,
    method = "GET",
    body?: unknown,
    signal?: AbortSignal,
  ) {
    if (method !== "GET" && !this.csrf) await this.call("/auth/csrf");
    const r = await fetch(root + path, {
      method,
      signal,
      headers: {
        Origin: "http://localhost:8080",
        Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
        "Content-Type": "application/json",
        ...(method !== "GET" ? { "X-CSRF-Token": this.csrf } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const cookie of r.headers.getSetCookie()) {
      const pair = cookie.split(";")[0]!,
        i = pair.indexOf("=");
      this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
    if (path === "/auth/login") this.csrf = "";
    return r;
  }
  async call(path: string, method = "GET", body?: unknown) {
    const r = await this.raw(path, method, body);
    const json = await r.json();
    if (path === "/auth/csrf") this.csrf = json.token;
    return { status: r.status, data: json };
  }
  async login(email: string, password = "MarketGlobal#2027") {
    return this.call("/auth/login", "POST", {
      email,
      password,
      remember: false,
    });
  }
}
export async function mailToken(
  email: string,
  kind: "reset" | "invitation",
  since = 0,
) {
  for (let i = 0; i < 20; i++) {
    const messages = await (
      await fetch("http://localhost:8025/api/v1/messages")
    ).json();
    const found = messages.messages?.find(
      (m: { To: { Address: string }[]; Subject: string; Created: string }) =>
        new Date(m.Created).getTime() >= since &&
        m.To.some((x) => x.Address === email) &&
        (kind === "reset"
          ? /senha|password|contraseña/i.test(m.Subject)
          : /convite|invitation|invitación/i.test(m.Subject)),
    );
    if (found) {
      const message = await (
        await fetch("http://localhost:8025/api/v1/message/" + found.ID)
      ).json();
      const token = message.Text.match(/[#&]token=([a-f0-9]+)/)?.[1];
      if (token) return token;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Expected local SMTP message not received");
}
