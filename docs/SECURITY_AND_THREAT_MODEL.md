# Security and Threat Model

This document explains what kinds of attacks Finnova is designed to defend against, and where in the code each defense lives. It is meant to be read like a guided tour: by the end you should understand **why** every protected query has `userId` in its `where` clause, **why** passwords are never stored as plain text, and **why** you should never trust anything that came from the browser.

If you are new to security, do not be intimidated. You already understand most of the ideas. You just need names for them.

---

## 1. Intro: threat modeling as a habit

Threat modeling is just a fancy name for a simple question:

> Who might attack this, how, and what do they get if they succeed?

Every serious app should be able to answer that question. You do not need a whiteboard or a committee. You need a habit of pausing, before you ship a feature, and asking: "If a bad person sent the worst possible input to this endpoint, what would happen?"

For a finance app the stakes are real. Attackers want:

- Other users' transaction history (private financial data).
- Email addresses (useful for phishing).
- Account takeover (logging in as someone else).

The good news: almost all common web attacks are well-understood, and you can block them with a handful of disciplined patterns. The **best defense is layered**: no single check is perfect, so we check in multiple places. If one layer fails, another catches it.

This doc doubles as a reading guide. Each section tells you which file holds the relevant defense, so you can open the code and see it for yourself.

---

## 2. Who might attack this app

You are not building software that defends against nation-state actors. You are building software that defends against the realistic, everyday threats any public web app faces:

- **Casual snooper / curious user.** A logged-in user who tries to see another user's data by poking at URLs or request bodies.
- **Credential stuffer.** Someone with a list of leaked `email:password` pairs from other breaches, trying them against your login.
- **Brute-forcer.** A bot trying thousands of passwords per second against one account.
- **Script kiddie.** Someone running an OWASP Top-10 exploit scanner and hoping something sticks.
- **Insider.** Anyone with access to the database or source code — a contractor, a leaked backup, a stolen laptop.

Finnova is designed to make all five of these attackers' jobs harder. It is **not** designed to stop a well-funded, targeted attack. That is a different category and requires formal auditing, penetration testing, and frequently compliance work.

---

## 3. The OWASP Top 10, applied to this app

The [OWASP Top 10](https://owasp.org/www-project-top-ten/) is the industry list of the most common, most dangerous web vulnerabilities. Let us walk through the ones that apply to Finnova.

### A01: Broken Access Control

**The risk.** User A reads or modifies User B's records. This is the single most common web vulnerability. It usually happens when a developer forgets to check ownership in a database query.

**The defense.** Every Prisma query on protected data has `userId: r.userId` in the `where` clause. That single line does two jobs at once: it filters results **and** it enforces authorization.

Look at `app/api/transactions/route.ts` around lines 94-99:

```ts
const account = await prisma.account.findFirst({
  where: { id: data.accountId, userId: r.userId },
});
if (!account) {
  return NextResponse.json({ error: "Account not found" }, { status: 400 });
}
```

The important detail: we do **not** call `prisma.account.findUnique({ where: { id } })`. That would return the account even if it belonged to someone else. Instead we call `findFirst` with a compound `where` clause that includes `userId`. If the ID exists but belongs to another user, we get `null`, and the request is rejected.

The same pattern appears for the destination account (lines 102-104) and for the category (lines 111-113). Every single referenced ID is re-checked against the session's `userId` before the write happens.

**The upstream check.** Before any of this runs, `lib/api.ts` guarantees there **is** a `userId`:

```ts
export async function requireUserId(): Promise<
  { userId: string } | { response: NextResponse }
> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { userId };
}
```

Every protected API route starts with `const r = await requireUserId();`. If there is no session, the request dies with a 401 before any Prisma call.

**The middleware layer.** One layer above that, `middleware.ts` blocks unauthenticated **page** requests entirely:

```ts
const protectedPrefixes = ["/dashboard", "/transactions", "/budgets", "/accounts", "/settings"];
// ...
if (isProtected && !loggedIn) {
  const url = new URL("/login", req.url);
  url.searchParams.set("callbackUrl", path);
  return NextResponse.redirect(url);
}
```

**Defense in depth.** That is three layers: middleware blocks the page, `requireUserId` blocks the API, and the `where` clause blocks the data. If you forget one, the others still catch the mistake. Never rely on only one.

### A02: Cryptographic Failures

**The risk.** Passwords stored in plain text, secrets committed to git, sessions tampered with by attackers.

**The defense.**

Passwords are **bcrypt-hashed**, never stored in the clear. Look at `auth.ts` around line 42:

```ts
const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
if (!ok) return null;
```

The column in the database is literally called `passwordHash` (see `prisma/schema.prisma` line 31). Even if someone dumps your database, they get hashes, not passwords. Bcrypt is intentionally slow and automatically salts each hash, which defeats the rainbow-table attacks that broke the early 2000s-era sites you read about.

Sessions are **signed JWTs**. `auth.ts` line 61 configures it:

```ts
session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
```

The JWT is signed with `AUTH_SECRET`, so a user cannot forge one. It is stored in an **HTTP-only cookie** (NextAuth's default), which means page JavaScript cannot read it — so an XSS bug cannot steal the session.

**Secrets lifecycle.** `AUTH_SECRET` and `DATABASE_URL` only exist server-side, in `.env`. `.env` is in `.gitignore` (line 34):

```
# env files (can opt-in for committing if needed)
.env*
!.env.example
```

So `.env` never gets committed, but `.env.example` (which has no real values) does. That pattern gives other developers a template without leaking your keys.

**What could still be improved.** This app does not yet implement password rotation policies, breached-password checks (HIBP), or account lockout after repeated failures. Those are good next steps before going to production.

### A03: Injection

**The risk.** An attacker embeds SQL into an input field and your code runs it. Classic "`'; DROP TABLE users; --`" material.

**The defense.** **Prisma parameterizes every query.** When you write:

```ts
where: { notes: { contains: q, mode: "insensitive" } }
```

Prisma sends the SQL and the value `q` to PostgreSQL as separate parts. PostgreSQL treats `q` as data, never as code, no matter what the user typed. Look at the real example in `app/api/transactions/route.ts` lines 40-45:

```ts
if (q) {
  where.OR = [
    { notes: { contains: q, mode: "insensitive" } },
    { tags: { contains: q, mode: "insensitive" } },
  ];
}
```

Even if `q` is literally `"'; DROP TABLE users; --"`, Prisma will search for transactions whose notes **contain that string**. It will not execute it. Parameterization is a structural defense, not a filter.

**Never do this:**

```ts
// WRONG — do not do this with user input.
await prisma.$queryRawUnsafe(`SELECT * FROM "Transaction" WHERE notes = '${q}'`);
```

`$queryRawUnsafe` does exactly what it says: it is unsafe. It concatenates strings into SQL.

**If you truly need raw SQL**, use the tagged template form:

```ts
// Safe — Prisma parameterizes ${q}.
await prisma.$queryRaw`SELECT * FROM "Transaction" WHERE notes = ${q}`;
```

That looks like string interpolation but is not. Prisma intercepts the template and sends `q` as a separate parameter.

### A04: Insecure Design

**The risk.** A feature whose design is dangerous even when the code is correct. Example: trusting the client to tell you what role it has.

**Defenses in this app.**

- **The server is the source of truth for transfers.** In `app/api/transactions/route.ts` lines 129-133, transfers are forced to have `categoryId: null` regardless of what the client sent:

  ```ts
  categoryId:
    data.type === "TRANSFER"
      ? null
      : data.categoryId ?? null,
  ```

  A malicious client cannot sneak a category onto a transfer. The server strips it.

- **Same-account transfers are rejected before they reach the database.** `lib/validations.ts` lines 48-54:

  ```ts
  if (data.toAccountId && data.toAccountId === data.accountId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Cannot transfer to the same account",
      path: ["toAccountId"],
    });
  }
  ```

- **Budget uniqueness is enforced at the database layer.** `prisma/schema.prisma` line 108:

  ```prisma
  @@unique([userId, categoryId, year, month])
  ```

  Even if two requests race each other, PostgreSQL will reject the duplicate. You cannot end up with two budgets for the same category in the same month, no matter how weird the timing.

### A05: Security Misconfiguration

**The risk.** Debug panels exposed in production, default credentials left on, verbose error messages leaking stack traces.

**The defense.**

- **No admin UI in production.** Prisma Studio is a local dev tool only. There is no `/admin` route in this app.
- **Cookies are HTTP-only.** NextAuth's default. Page JavaScript cannot read the session cookie.
- **TrustHost.** `auth.ts` line 73 sets `trustHost: true`. This is convenient in development and on trusted hosting platforms (Vercel, Railway). Behind an untrusted reverse proxy it could let an attacker spoof the host header, so be aware of the tradeoff if your deployment gets more complex.
- **Friendly errors, no stack traces.** The custom `DatabaseUnavailableError` in `auth.ts` lines 14-16:

  ```ts
  class DatabaseUnavailableError extends CredentialsSignin {
    code = "database_unavailable";
  }
  ```

  When the database is down, the user sees a clean error code instead of a raw Prisma exception dumped into the page.

### A06: Vulnerable and Outdated Components

**The risk.** Your dependencies have known vulnerabilities and you do not notice.

**The defense.**

- `package.json` pins versions and `package-lock.json` locks them exactly.
- Run `npm audit` periodically. It checks your installed packages against a public vulnerability database.
- Read changelogs before major version bumps, especially for `next`, `next-auth`, and `prisma`.

### A07: Identification and Authentication Failures

**The risk.** Weak passwords, no rate limiting, sessions that never expire.

**The defense.**

- **Minimum password length.** `lib/validations.ts` line 5:

  ```ts
  password: z.string().min(8, "Password must be at least 8 characters"),
  ```

- **Session lifetime.** `auth.ts` line 61 sets a 30-day max age. Sessions eventually expire.
- **HTTP-only cookies.** Page JavaScript cannot exfiltrate the session even if an XSS bug slips in.

**Not yet implemented** (good future work before production):

- Rate limiting on `/api/auth/*` (so a brute-forcer cannot guess thousands of passwords per second).
- Account lockout after N failed attempts.
- Two-factor authentication.
- Password strength meter / HIBP (Have I Been Pwned) check on registration.

### A08: Software and Data Integrity Failures

**The risk.** Supply chain attacks (a library you depend on gets compromised) or unreviewed migrations that silently corrupt data.

**The defense.**

- `package-lock.json` locks exact transitive dependency versions. `npm ci` installs exactly what is locked.
- All Prisma migrations are committed to `prisma/migrations/` and reviewed in pull requests. No one runs a migration in production that was not read by another human.

### A09: Security Logging and Monitoring Failures

**The risk.** An attack happens and you never know, because nothing was logged.

**Current state.** Finnova has minimal logging. `auth.ts` logs a single warning when the database is unreachable. That is about it.

**Improvement.** Before production, add structured logging for:

- Login success and failure (with IP and timestamp).
- Password changes.
- Account creation.
- Any 5xx response.

A good starting point is a library like `pino` or `winston`, or a hosted service like Axiom or Logtail.

### A10: Server-Side Request Forgery (SSRF)

**Not applicable.** Finnova does not make outbound HTTP requests based on user-supplied URLs. There is no place where a user can say "go fetch this URL on my behalf", which is what SSRF exploits.

---

## 4. Attacks specific to this design

OWASP is a general list. Let us also look at the attacks that matter most for a Next.js + React + Prisma multi-tenant app.

### Cross-Site Scripting (XSS)

**The risk.** An attacker types `<script>steal(document.cookie)</script>` into a transaction note. When the note is rendered on another page (or the same user's page), the browser runs it.

**The defense.** **React automatically escapes strings in JSX.** When you write `{notes}` in a component, React inserts it as text, not HTML. The `<script>` tag becomes literal characters, not an executable element.

The only way to render raw HTML in React is `dangerouslySetInnerHTML`, and the name is a warning. If you ever find yourself reaching for it, stop and ask whether there is another way.

**Never do this with user input:**

```tsx
<div dangerouslySetInnerHTML={{ __html: transaction.notes }} />
```

**Extra hardening** (not implemented yet, but worth knowing): add a `Content-Security-Policy` header in production. It tells the browser "only execute scripts from these origins", which neutralizes most XSS even if one slips through.

### Cross-Site Request Forgery (CSRF)

**The risk.** An attacker tricks your browser into sending a state-changing request to Finnova while you are logged in. Example: you visit `evil.com`, which has a hidden `<form action="https://finnova.app/api/transactions" method="POST">` that auto-submits. Your browser dutifully attaches your Finnova session cookie, and the request creates a transaction.

**The defense.** NextAuth sets `SameSite=Lax` on the session cookie by default. `Lax` means the cookie is **not** sent on cross-site POST requests. A form on `evil.com` can submit to Finnova, but the session cookie will not travel with it, so the server sees no session and rejects the request.

**Best practice:** use POST (or PUT/DELETE) for any mutation, never GET. GET requests are fired by links, image tags, and prefetchers, which makes them much easier to weaponize.

### Mass assignment

**The risk.** The client sends an extra field you did not expect, and your code blindly writes it to the database.

```ts
// BAD — what if body has { userId: "someone_else" }?
await prisma.transaction.create({ data: { ...body } });
```

**The defense.** The Zod schemas in `lib/validations.ts` list the exact fields allowed. When you call `.parse()` or `.safeParse()`, Zod produces an object containing **only** the fields declared in the schema. Extra fields are dropped.

Then the route code explicitly passes only validated fields to Prisma. Look at `app/api/transactions/route.ts` lines 125-139:

```ts
const created = await prisma.transaction.create({
  data: {
    userId: r.userId,
    accountId: data.accountId,
    toAccountId: data.type === "TRANSFER" ? data.toAccountId : null,
    categoryId:
      data.type === "TRANSFER"
        ? null
        : data.categoryId ?? null,
    amount: new Prisma.Decimal(data.amount),
    type: data.type,
    date: data.date,
    notes: data.notes ?? null,
    tags: data.tags ?? null,
  },
  // ...
});
```

Notice: `userId` comes from `r.userId` (the server-verified session), **not** from `data`. There is no `...data` or `...body`. Every field is written out by hand. This is a little verbose, and that is the point — explicit code is safe code.

A caveat worth knowing: Zod by default **strips** unknown fields rather than rejecting them. If you want to reject them instead (so a misbehaving client gets an error rather than silent loss), use `.strict()` on the schema. For this app, stripping is fine because the route only forwards the known keys anyway.

### IDOR (Insecure Direct Object Reference)

**This is the big one for multi-tenant apps.** Every other section on this page matters, but IDOR is the one you will face every single time you add a new feature.

**The risk.** User A submits a transaction creation request with `accountId` set to the ID of User B's account. If the server does not check ownership, User A has just debited User B's account.

**The defense.** Before any write, the route checks that the referenced account belongs to the session user. `app/api/transactions/route.ts` lines 94-99:

```ts
const account = await prisma.account.findFirst({
  where: { id: data.accountId, userId: r.userId },
});
if (!account) {
  return NextResponse.json({ error: "Account not found" }, { status: 400 });
}
```

The **load-bearing part** is `userId: r.userId`. If you removed that, the query would return the account even if it belonged to User B, and the request would succeed. The `userId` clause is doing double duty: it filters results **and** it enforces authorization in one line.

**The key insight:** in a multi-tenant app, the `where` clause is where authorization lives. Not in a separate permission check, not in a middleware, not in a decorator. It is the `where` clause itself. Every time you write a Prisma query on user-owned data, the **first** thing you should type after `where:` is `userId: r.userId`. Make it muscle memory.

### Timing attacks on login

**The risk.** An attacker submits login attempts and measures how long the server takes to respond. If "no such user" is faster than "wrong password", they can enumerate valid email addresses.

**The defense.** `bcrypt.compare` is designed to run in constant time, so "correct password" and "wrong password" take the same time. However, the current code in `auth.ts` short-circuits when the user does not exist:

```ts
const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
if (!user) return null;
const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
```

This is a mild timing leak: "no such user" returns almost immediately, while "wrong password" takes the bcrypt compare time (typically 50-200 ms). For most apps this is acceptable. To harden it, you would compare against a known dummy hash in the "user not found" branch, so both branches take roughly the same time.

---

## 5. The secrets lifecycle

Your app has exactly two "crown jewel" secrets:

- `AUTH_SECRET` — signs session JWTs. Leaking it means anyone can forge a login.
- `DATABASE_URL` — the database connection string, often containing the password.

Rules:

1. **They live in `.env` locally.** Never in code, never in a config file that gets committed.
2. **`.env` is in `.gitignore`** (`.gitignore` line 34). It never reaches git.
3. **`.env.example`** is the template. It has dummy values, and it **is** committed, so teammates know what variables to set.
4. **In production**, secrets come from the hosting platform's env var dashboard — Vercel, Railway, Fly, whatever you use. They are never checked in.
5. **Never log secrets**, even in error messages. A stack trace that prints `DATABASE_URL` is a leak.
6. **Never send secrets to the client**, even inside an error response. The client is untrusted by definition.

**If you ever commit `.env` by accident**, rotate everything immediately: generate a new `AUTH_SECRET`, change the database password, and assume the old values are compromised. Rewriting git history does not help — assume anyone who pulled the repo between commit and rotation has the old secrets. See `docs/GIT_FOR_FIRST_PROJECT.md` for the recovery steps.

---

## 6. Database security

A few practices that matter at the database layer:

- **Use a limited-permissions DB user.** In production, the user in `DATABASE_URL` should be able to `SELECT`, `INSERT`, `UPDATE`, `DELETE` on the app's tables and nothing else. No `CREATE DATABASE`, no `DROP`, no superuser.
- **Row-level security lives in the app.** Finnova enforces per-user isolation with `userId` in every `where` clause. PostgreSQL also has built-in row-level security (RLS) as a second line of defense; that is worth exploring once you are comfortable with the app-level pattern.
- **Cascade deletes keep data consistent.** Look at `prisma/schema.prisma`: every user-owned model has `onDelete: Cascade` on the `user` relation. When a user is deleted, all their accounts, categories, transactions, budgets, savings goals, and recurring transactions go with them. No orphan rows. No "I deleted my account but my data is still in your database" lawsuits.
- **Decimal column for money.** `amount Decimal @db.Decimal(14, 2)` (schema lines 87, 104, 123-124, 140). Never store money in `float` — floating-point rounding errors are a whole class of bugs this avoids.

---

## 7. Production readiness checklist

Before you expose Finnova to the public internet:

- [ ] `AUTH_SECRET` is at least 32 random bytes, generated fresh, and **different from the dev value**.
- [ ] `DATABASE_URL` points to a restricted DB user with no `CREATE DATABASE` or superuser permissions.
- [ ] HTTPS is enabled (Vercel, Railway, and Fly handle this automatically).
- [ ] Rate limiting on `/api/auth/*` (not yet implemented — add before launch).
- [ ] `npm audit` shows no high-severity issues.
- [ ] `NODE_ENV=production` so Next.js does not leak stack traces to the browser.
- [ ] Logging is on for at least: login success, login failure, 5xx responses, password changes.
- [ ] Database backups are scheduled and tested (a backup you have never restored is not a backup).
- [ ] `.env` values come from the hosting platform's secret store, not a committed file.
- [ ] You have a plan for rotating `AUTH_SECRET` if it ever leaks (every user gets logged out — that is the cost).

---

## 8. Things beginners should never do

A short red-flag list. If you catch yourself doing any of these, stop.

- **Never disable TypeScript strict mode.** The errors are telling you something real.
- **Never use `any` to "make it work".** Find the real type. `any` is a silent bug factory.
- **Never commit `.env`.** Not even "just for a minute".
- **Never trust frontend input.** Every `POST` body must be re-validated on the server with Zod, no matter how strict your frontend form is.
- **Never skip the `userId` check in a `where` clause.** If the data belongs to users, `userId` goes in the `where`. Always.
- **Never use `prisma.$queryRawUnsafe` with user input.** If you need raw SQL, use the tagged template form.
- **Never log passwords**, not even hashed ones. Do not log the request body of a login request.
- **Never send secrets to the client**, even in an error message.
- **Never use `git commit --no-verify`** to bypass pre-commit hooks without reading them first. Those hooks exist for a reason.
- **Never `git push --force` to `main`**. You can rewrite history on your own branch; never on shared history.

---

## 9. Further reading

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Prisma security best practices: https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access
- NextAuth.js (Auth.js) security: https://authjs.dev/

And inside this repo:

- `docs/EDGE_CASES_AND_RULES.md` — the rules the app enforces and the edge cases it handles.
- `docs/HOW_IT_WORKS.md` — the architecture overview, which is useful context for seeing why the defenses are layered the way they are.
- `docs/DEBUGGING_PLAYBOOK.md` — when things go wrong, how to find out why without making the security worse.

Security is a habit, not a project. Read the code. Ask "what could go wrong here?". Add the `userId` to the `where`. Re-validate on the server. Keep secrets in `.env`. Do that every day and you will ship software that is hard to attack.
