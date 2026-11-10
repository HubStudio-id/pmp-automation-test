// npm run bdd:accounts — creates the qa+auto-… accounts the BDD suite owns, so manual QA never shares them.
// Run by the QA lead (it sends invitations and sets passwords). Idempotent: existing roles, admins and users are reused.
//   npm run bdd:accounts -- --dry-run          read-only: shows what would be created
//   npm run bdd:accounts -- --generate-passwords   no prompt: random passwords go straight to .env (automation accounts)
//   npm run bdd:accounts                       create roles, send invitations, accept them (password typed hidden), update .env
//   npm run bdd:accounts -- --swap-super-admin after the lead moved the Super Admin seat to qa+auto-admin@ in the UI
// Sessions come from .auth/ (npm run bdd:auth first); tokens stay inside the browser page.
import { chmodSync, copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { randomBytes } from 'node:crypto';
import { chromium, type Page } from 'playwright';
import '../src/utils/env';
import { urls } from '../src/testdata';
import { linkIn, waitForEmail } from '../src/utils/gmail';

const DRY_RUN = process.argv.includes('--dry-run');
// Automation-only accounts may get a random password written straight to .env (never printed), like VREG-04 does.
const GENERATE_PASSWORDS = process.argv.includes('--generate-passwords');
const SWAP_SUPER_ADMIN = process.argv.includes('--swap-super-admin');
const INVITATION_VALIDITY_DAYS = 7;

// Core refuses a role whose rights equal an existing one (422 ROLE_DUPLICATE_OF), so the new admins take the existing
// roles; those roles are reserved for automation in ~/.claude/qa-testdata/pmp.md. Kept for a role that must differ.
const ROLE_CLONES: { from: string; name: string }[] = [];
const ADMINS = [
  { envKey: 'ADMIN_SUPER_NEXT', email: 'qa+auto-admin@hubstudio.id', name: 'QA-AUTO Super Admin', role: 'Role GG' },
  { envKey: 'ADMIN_CONFIG_VIEW', email: 'qa+auto-config@hubstudio.id', name: 'QA-AUTO Konfigurasi Lihat', role: 'Role GG' },
  { envKey: 'ADMIN_LIMITS_KELOLA', email: 'qa+auto-limits@hubstudio.id', name: 'QA-AUTO Batas Kelola', role: 'QA-649 Batas & Domain Kelola' },
  { envKey: 'ADMIN_ARCHIVE_LOG', email: 'qa+auto-arsip@hubstudio.id', name: 'QA-AUTO Arsip Log', role: 'QA-669 Arsip & Log Kelola' },
  { envKey: 'ADMIN_PRODUCT_NO_CONTRACT', email: 'qa+auto-produk@hubstudio.id', name: 'QA-AUTO Produk tanpa Kontrak', role: 'QA Produk tanpa Kontrak' },
  // LOG-01 archives and restores it each run (@archived-admin); it never signs in to the suite.
  { envKey: 'ADMIN_ARCHIVABLE', email: 'qa+auto-archive@hubstudio.id', name: 'QA-AUTO Arsip Pulih', role: 'Role GG' },
  // ROLE-11 (PMP-726): the staging role «Admin Legal» (Kelola on Template Dokumen); signs in as session admin-legal.
  { envKey: 'ADMIN_LEGAL', email: 'qa+auto-legal@hubstudio.id', name: 'QA-AUTO Admin Legal', role: 'Admin Legal' },
];
const VENDOR_USERS = [
  { envKey: 'VENDOR_DIST_A', session: 'vendor-dist-a', email: 'qa+auto-dista@hubstudio.id', name: 'QA-AUTO Distributor A' },
  { envKey: 'VENDOR_V00003', session: 'vendor-v00003', email: 'qa+auto-v00003@hubstudio.id', name: 'QA-AUTO V00003' },
];
// Same facility as today (HRMPSTQ): it holds the contracted catalogue, the QA cart SKU and the delivery points the
// member cases use. qa+auto-member@ joins as Approver; the lead then moves the facility Super Admin seat to it in the
// Member portal («Pengguna»), and --swap-super-admin points member-super at it.
const MEMBER_USERS = [
  { envKey: 'MEMBER_SUPER_NEXT', email: 'qa+auto-member@hubstudio.id', name: 'QA-AUTO Member Super Admin', role: 'member-approver' },
  { envKey: 'MEMBER_MAKER', email: 'qa+auto-maker@hubstudio.id', name: 'QA-AUTO Pengaju', role: 'member-maker' },
];

// Registration drafts (new entities that walk the registration wizard). Invited once by Admin «Undangan Mendaftar»;
// the suite reuses the same draft every run, like the vendor-wizard draft of VREG-01.
//   VREG-06 (PMP-753): a Sole distributor · Obat · PMDN draft that issues SRT-KJM.
//   MREG-06 (PMP-793): a member registration draft that issues SRT-SP.
const VENDOR_REGISTRATIONS = [
  { envKey: 'VENDOR_SOLE_WIZARD', session: 'vendor-sole-wizard', email: 'qa+auto-sole@hubstudio.id', entityName: 'QA-AUTO Sole Distributor PMDN', entityType: 'sole_distributor', partnerCategory: 'Medis', productType: 'Obat', investmentStatus: 'pmdn', firstUserRole: 'admin-vendor' },
];
const MEMBER_REGISTRATIONS = [
  { envKey: 'MEMBER_REGISTRANT', session: 'member-registrant', email: 'qa+auto-regmember@hubstudio.id', facilityName: 'QA-AUTO RS Pendaftaran' },
];

type Reply = { status: number; body: any };
// kind: «invite» = accept-invitation; «vendor-lead» = Undangan Mendaftar vendor (confirm-email, then set-password);
// «member-register» = Undangan Mendaftar faskes (register with the invitation, then set-password from a second e-mail).
type Invite = { envKey: string; email: string; portal: 'admin' | 'vendor' | 'member'; sentAt: Date; kind?: 'invite' | 'vendor-lead' | 'member-register'; name?: string };
const WEEK_AGO = () => new Date(Date.now() - 7 * 86_400_000);

async function call(page: Page, tokenKey: string, method: string, path: string, body?: unknown): Promise<Reply> {
  return page.evaluate(async ({ api, tokenKey, method, path, body }) => {
    const vendorUser = JSON.parse(localStorage.getItem('vendor_user') ?? '{}'); const vendorCode = vendorUser?.vendor_tenant_selector || vendorUser?.vendor_code || vendorUser?.principal_code || vendorUser?.vendor?.code || '';
    const memberUser = JSON.parse(localStorage.getItem('member_user') ?? '{}'); const memberCode = memberUser?.member?.code ?? memberUser?.member_code ?? '';
    const response = await fetch(api + path, {
      method,
      headers: { Authorization: `Bearer ${localStorage.getItem(tokenKey) ?? ''}`, Accept: 'application/json', 'Content-Type': 'application/json', ...(vendorCode ? { 'X-Vendor-Code': vendorCode } : {}), ...(memberCode ? { 'X-Member-Code': memberCode } : {}) },
      body: body ?? undefined,
    });
    const text = await response.text();
    try { return { status: response.status, body: JSON.parse(text) }; } catch { return { status: response.status, body: text }; }
  }, { api: urls.api, tokenKey, method, path, body: body === undefined ? null : JSON.stringify(body) });
}

async function sessionPage(browser: Awaited<ReturnType<typeof chromium.launch>>, role: string, origin: string): Promise<Page> {
  if (!existsSync(`.auth/${role}.json`)) throw new Error(`.auth/${role}.json missing: run npm run bdd:auth first`);
  const context = await browser.newContext({ storageState: `.auth/${role}.json` });
  // Only the origin is needed (the saved token lives in its localStorage): serve a blank page instead of loading the portal.
  await context.route(`${new URL(origin).origin}/**`, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>qa</title>' }));
  const page = await context.newPage();
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  return page;
}

function setEnv(values: Record<string, string>): void {
  const lines = readFileSync('.env', 'utf8').split('\n');
  for (const [key, value] of Object.entries(values)) {
    const index = lines.findIndex((line) => line.startsWith(`${key}=`));
    if (index >= 0) lines[index] = `${key}=${value}`;
    else lines.splice(lines.lastIndexOf('') > 0 ? lines.length - 1 : lines.length, 0, `${key}=${value}`);
  }
  writeFileSync('.env', lines.join('\n'), { mode: 0o600 });
  chmodSync('.env', 0o600);
}

function ask(question: string, hidden = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) (rl as any)._writeToOutput = (text: string) => { if (text.startsWith(question)) process.stdout.write(question); };
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(answer); }));
}

async function askPassword(email: string, previous: string): Promise<string> {
  if (GENERATE_PASSWORDS) return `Qa-${randomBytes(12).toString('hex')}!`;
  for (;;) {
    const first = await ask(`Password for ${email}${previous ? ' (Enter = same as the previous one)' : ''}: `, true);
    if (!first && previous) return previous;
    if (first.length < 8) { console.log('  at least 8 characters'); continue; }
    if ((await ask('  again: ', true)) === first) return first;
    console.log('  the two entries differ, try again');
  }
}

/**
 * Confirms a registration e-mail and returns the password_setup_token the confirmation answers (never printed).
 * Uses the portal's own link (not the awstrack.me tracking copy, which hides the token in its path). When the newest
 * token was already used, asks for a fresh e-mail once and confirms that one.
 */
async function confirmByEmail(email: string, since: Date, linkPattern: RegExp, confirmPath: string, resendPath: string, resendBody: unknown): Promise<string | null> {
  const post = (path: string, body: unknown) => fetch(`${urls.api}${path}`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const portalLink = (text: string) => linkIn(text.replace(/https?:\/\/[^\s"'<>)]*awstrack[^\s"'<>)]*/g, ''), linkPattern);
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = tokenOf(portalLink(await waitForEmail(email, since)));
    const confirmed = await post(confirmPath, { token });
    const body = await confirmed.json().catch(() => null);
    const setupToken = body?.data?.password_setup_token;
    if (confirmed.ok && typeof setupToken === 'string' && setupToken) return setupToken;
    console.log(`  confirm-email: ${confirmed.status} ${body?.error_code ?? ''}${attempt === 0 ? ' → asking for a fresh confirmation e-mail' : ''}`);
    if (attempt === 0) {
      since = new Date(Date.now() - 5_000);
      const resent = await post(resendPath, resendBody);
      if (!resent.ok) { console.log(`  resend-confirmation: ${resent.status}`); return null; }
    }
  }
  return null;
}

function tokenOf(link: string): string {
  const url = new URL(link);
  return url.searchParams.get('token') ?? url.pathname.split('/').filter(Boolean).pop() ?? '';
}

if (SWAP_SUPER_ADMIN) {
  let swapped = 0;
  for (const portal of ['ADMIN', 'MEMBER']) {
    const env = readFileSync('.env', 'utf8');
    const next = (key: string) => env.match(new RegExp(`^QA_${key}_${portal}_SUPER_NEXT=(.*)$`, 'm'))?.[1] ?? '';
    if (!next('USER') || !next('PASS')) continue;
    setEnv({ [`QA_USER_${portal}_SUPER`]: next('USER'), [`QA_PASS_${portal}_SUPER`]: next('PASS') });
    writeFileSync('.env', readFileSync('.env', 'utf8').split('\n').filter((line) => !line.startsWith(`QA_USER_${portal}_SUPER_NEXT=`) && !line.startsWith(`QA_PASS_${portal}_SUPER_NEXT=`)).join('\n'), { mode: 0o600 });
    rmSync(`.auth/${portal.toLowerCase()}-super.json`, { force: true });
    console.log(`${portal.toLowerCase()}-super now signs in as ${next('USER')}; next npm run bdd:auth signs it in.`);
    swapped++;
  }
  if (!swapped) throw new Error('no QA_USER/QA_PASS_<ADMIN|MEMBER>_SUPER_NEXT in .env: run npm run bdd:accounts first');
  process.exit(0);
}

const browser = await chromium.launch();
const admin = await sessionPage(browser, 'admin-super', urls.admin);
const invites: Invite[] = [];
const report: string[] = [];

const roleList = (await call(admin, 'mlm_auth_token', 'GET', '/admin/roles?per_page=100')).body?.data ?? [];
const roleIdByName = new Map<string, number>(roleList.map((r: any) => [r.name, r.id]));
for (const clone of ROLE_CLONES) {
  if (roleIdByName.has(clone.name)) { report.push(`role   exists   ${clone.name}`); continue; }
  const source = (await call(admin, 'mlm_auth_token', 'GET', `/admin/roles/${clone.from}`)).body?.data;
  if (!source) throw new Error(`source role ${clone.from} not found`);
  const pages = (source.pages ?? []).flatMap((group: any) => group.pages ?? [group])
    .filter((p: any) => ['view', 'manage'].includes(p.access_level)).map((p: any) => ({ key: p.key, access_level: p.access_level }));
  const payload = {
    name: clone.name,
    description: `Automation only (~/qa-regression/pmp). Copy of «${source.name}». Do not change for manual QA.`,
    pages,
    product_type_authorities: (source.product_type_authorities ?? []).map((a: any) => ({ product_type: a.product_type?.slug ?? a.product_type, can_negotiate: !!a.can_negotiate, can_approve: !!a.can_approve, can_activate: !!a.can_activate, review_sla_days: a.review_sla_days ?? null, fallback_role: a.fallback_role?.slug ?? a.fallback_role ?? null })),
  };
  if (DRY_RUN) { report.push(`role   create   ${clone.name} ← ${source.name} (${pages.length} pages, ${payload.product_type_authorities.length} product types)`); continue; }
  const created = await call(admin, 'mlm_auth_token', 'POST', '/admin/roles', payload);
  if (created.status >= 300) throw new Error(`create role ${clone.name}: ${created.status} ${JSON.stringify(created.body).slice(0, 300)}`);
  roleIdByName.set(clone.name, created.body.data.id);
  report.push(`role   created  ${clone.name}`);
}

const adminList = (await call(admin, 'mlm_auth_token', 'GET', '/admin/admins?per_page=100')).body?.data ?? [];
const unit = adminList.find((a: any) => /^qa\+konfigurasi@/i.test(a.email))?.unit ?? 'QA';
for (const account of ADMINS) {
  const existing = adminList.find((a: any) => a.email.toLowerCase() === account.email);
  if (existing) { report.push(`admin  exists   ${account.email} (${existing.account_state}/${existing.invitation_status ?? '-'})`); if (existing.invitation_status === 'pending') invites.push({ ...account, portal: 'admin', sentAt: new Date(existing.invitation_sent_at) }); continue; }
  if (!roleIdByName.has(account.role)) throw new Error(`role «${account.role}» not found`);
  if (DRY_RUN) { report.push(`admin  invite   ${account.email} as ${account.role} (id ${roleIdByName.get(account.role)}) (unit ${JSON.stringify(unit)})`); continue; }
  const sentAt = new Date(Date.now() - 5_000);
  const created = await call(admin, 'mlm_auth_token', 'POST', '/admin/admins', { email: account.email, name: account.name, unit: typeof unit === 'string' ? unit : unit?.name, role_id: roleIdByName.get(account.role), invitation_validity_days: INVITATION_VALIDITY_DAYS });
  if (created.status >= 300) throw new Error(`invite ${account.email}: ${created.status} ${JSON.stringify(created.body).slice(0, 300)}`);
  invites.push({ ...account, portal: 'admin', sentAt });
  report.push(`admin  invited  ${account.email}`);
}

for (const user of VENDOR_USERS) {
  const vendor = await sessionPage(browser, user.session, urls.vendor);
  const users = (await call(vendor, 'vendor_access_token', 'GET', '/vendor/users?per_page=100')).body?.data ?? [];
  const me = JSON.parse(await vendor.evaluate(() => localStorage.getItem('vendor_user') ?? '{}'));
  const role = users.find((u: any) => u.email?.toLowerCase() === me.email?.toLowerCase())?.role;
  const roleSlug = role?.slug ?? role ?? me.role;
  const existing = users.find((u: any) => u.email?.toLowerCase() === user.email);
  if (existing) { report.push(`vendor exists   ${user.email} (${existing.status ?? '-'})`); if (/invit|pending/i.test(String(existing.status))) invites.push({ ...user, portal: 'vendor', sentAt: new Date(existing.invitation_sent_at ?? Date.now() - 86_400_000) }); continue; }
  if (DRY_RUN) { report.push(`vendor invite   ${user.email} on ${me.vendor_code ?? '?'} as ${roleSlug} (${users.length} users now)`); continue; }
  const sentAt = new Date(Date.now() - 5_000);
  const created = await call(vendor, 'vendor_access_token', 'POST', '/vendor/users/invite', { name: user.name, email: user.email, role: roleSlug });
  if (created.status >= 300) throw new Error(`invite ${user.email}: ${created.status} ${JSON.stringify(created.body).slice(0, 300)}`);
  invites.push({ ...user, portal: 'vendor', sentAt });
  report.push(`vendor invited  ${user.email}`);
}
// ---- registration drafts (Admin «Undangan Mendaftar») ----
const categories = (await call(admin, 'mlm_auth_token', 'GET', '/reference/partner-categories')).body?.data ?? [];
const knownVendors = JSON.stringify((await call(admin, 'mlm_auth_token', 'GET', '/admin/vendor-registrations?per_page=100&q=QA-AUTO')).body ?? {});
for (const reg of VENDOR_REGISTRATIONS) {
  const category = categories.find((c: any) => c.name === reg.partnerCategory);
  const productType = category?.product_types?.find((t: any) => t.name === reg.productType);
  if (!category || !productType) throw new Error(`lookup: category «${reg.partnerCategory}» or product type «${reg.productType}» not found`);
  if (knownVendors.includes(reg.email) || knownVendors.includes(reg.entityName)) {
    report.push(`vendor registration exists ${reg.email} (accepting it if .env has no account yet)`);
    if (!readFileSync('.env', 'utf8').includes(`QA_USER_${reg.envKey}=`)) invites.push({ envKey: reg.envKey, email: reg.email, portal: 'vendor', sentAt: WEEK_AGO(), kind: 'vendor-lead' });
    continue;
  }
  const payload = { kind: 'registration', entity_name: reg.entityName, entity_type: reg.entityType, partner_category_id: category.id, product_type_ids: [productType.id], emails: [reg.email], first_user_role: reg.firstUserRole, investment_status: reg.investmentStatus };
  if (DRY_RUN) { report.push(`vendor registration invite ${reg.email} ${JSON.stringify(payload)}`); continue; }
  const sentAt = new Date(Date.now() - 5_000);
  const created = await call(admin, 'mlm_auth_token', 'POST', '/admin/vendor-invitations', payload);
  if (created.status >= 300) throw new Error(`registration invite ${reg.email}: ${created.status} ${JSON.stringify(created.body).slice(0, 300)}`);
  invites.push({ envKey: reg.envKey, email: reg.email, portal: 'vendor', sentAt, kind: 'vendor-lead' });
  report.push(`vendor registration invited ${reg.email}`);
}
const knownMembers = JSON.stringify((await call(admin, 'mlm_auth_token', 'GET', '/admin/member-registrations?per_page=100&q=QA-AUTO')).body ?? {});
for (const reg of MEMBER_REGISTRATIONS) {
  if (readFileSync('.env', 'utf8').includes(`QA_USER_${reg.envKey}=`)) { report.push(`member registration has its account ${reg.email}`); continue; }
  if (knownMembers.includes(reg.email) || knownMembers.includes(reg.facilityName)) { report.push(`member registration exists ${reg.email}`); continue; }
  const payload = { facility_name: reg.facilityName, email: reg.email };
  if (DRY_RUN) { report.push(`member registration invite ${reg.email} ${JSON.stringify(payload)}`); continue; }
  const sentAt = new Date(Date.now() - 5_000);
  const created = await call(admin, 'mlm_auth_token', 'POST', '/admin/member-invitations', payload);
  const pending = JSON.stringify(created.body ?? '').includes('EMAIL_INVITATION_PENDING');
  if (created.status >= 300 && !pending) throw new Error(`member registration invite ${reg.email}: ${created.status} ${JSON.stringify(created.body).slice(0, 300)}`);
  invites.push({ envKey: reg.envKey, email: reg.email, portal: 'member', sentAt: pending ? WEEK_AGO() : sentAt, kind: 'member-register', name: reg.facilityName });
  report.push(`member registration invited ${reg.email}`);
}

const member = await sessionPage(browser, 'member-super', urls.member);
const memberUsers = (await call(member, 'member_token', 'GET', '/member/users?per_page=100')).body?.data ?? [];
for (const user of MEMBER_USERS) {
  const existing = memberUsers.find((u: any) => u.email?.toLowerCase() === user.email);
  if (existing) { report.push(`member exists   ${user.email} (${existing.status ?? '-'})`); if (/invit|pending/i.test(String(existing.status))) invites.push({ ...user, portal: 'member', sentAt: new Date(existing.invitation_sent_at ?? existing.invited_at ?? Date.now() - 86_400_000) }); continue; }
  if (DRY_RUN) { report.push(`member invite   ${user.email} on HRMPSTQ as ${user.role} (${memberUsers.length} users now)`); continue; }
  const sentAt = new Date(Date.now() - 5_000);
  const created = await call(member, 'member_token', 'POST', '/member/users/invite', { name: user.name, email: user.email, role: user.role });
  if (created.status >= 300) throw new Error(`invite ${user.email}: ${created.status} ${JSON.stringify(created.body).slice(0, 300)}`);
  invites.push({ ...user, portal: 'member', sentAt });
  report.push(`member invited  ${user.email}`);
}
await browser.close();
console.log(report.join('\n'));
if (DRY_RUN) process.exit(0);

copyFileSync('.env', `.auth/env-before-auto-accounts-${Date.now()}`);
let password = '';
for (const invite of invites) {
  console.log(`\nWaiting for the invitation e-mail to ${invite.email} …`);
  const post = (path: string, body: unknown) => fetch(`${urls.api}${path}`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let response: Response;
  if (invite.kind === 'vendor-lead') {
    // Undangan Mendaftar vendor: /registration/confirm-email?token=… → confirm-email answers a password_setup_token,
    // which set-password takes. A token already used by an earlier confirm needs a fresh e-mail (resend-confirmation).
    const confirm = await confirmByEmail(invite.email, invite.sentAt, /\/registration\/confirm-email\?token=/, '/vendor-leads/confirm-email', '/vendor-leads/resend-confirmation', { work_email: invite.email });
    if (!confirm) continue;
    password = await askPassword(invite.email, password);
    response = await post('/vendor-leads/set-password', { token: confirm, password, password_confirmation: password });
  } else if (invite.kind === 'member-register') {
    // Undangan Mendaftar faskes: /register?invitation=… → register (202) → e-mail /register/confirm-email?token=… →
    // confirm-email answers a password_setup_token → set-password. A second run (already registered) resends the confirmation.
    const newest = await waitForEmail(invite.email, invite.sentAt);
    let registeredAt = invite.sentAt;
    if (/\/register\?invitation=/.test(newest)) {
      registeredAt = new Date(Date.now() - 5_000);
      const registered = await post('/auth/member/register', { name: invite.name, email: invite.email, invitation_token: new URL(linkIn(newest, /\/register\?invitation=/)).searchParams.get('invitation') });
      if (registered.status !== 202) console.log(`  register: ${registered.status} (already registered: the confirmation is resent)`);
    }
    const confirm = await confirmByEmail(invite.email, registeredAt,/\/register\/confirm-email\?token=/, '/auth/member/confirm-email', '/auth/member/resend-confirmation', { email: invite.email });
    if (!confirm) continue;
    password = await askPassword(invite.email, password);
    response = await post('/auth/member/set-password', { token: confirm, password, password_confirmation: password });
  } else {
    const link = linkIn(await waitForEmail(invite.email, invite.sentAt), /token|invit|accept|activation/i);
    password = await askPassword(invite.email, password);
    const body = invite.portal === 'admin' ? { token: tokenOf(link), password } : { token: tokenOf(link), password, password_confirmation: password };
    response = await post(`/${invite.portal}/auth/accept-invitation`, body);
  }
  if (!response.ok) { console.log(`  accept failed: ${response.status} ${(await response.text()).slice(0, 200)}`); continue; }
  setEnv({ [`QA_USER_${invite.envKey}`]: invite.email, [`QA_PASS_${invite.envKey}`]: password });
  const role = { ADMIN_CONFIG_VIEW: 'admin-config-view', ADMIN_LIMITS_KELOLA: 'admin-limits-kelola', ADMIN_ARCHIVE_LOG: 'admin-archive-log', ADMIN_PRODUCT_NO_CONTRACT: 'admin-product-no-contract', VENDOR_DIST_A: 'vendor-dist-a', VENDOR_V00003: 'vendor-v00003', MEMBER_MAKER: 'member-maker' }[invite.envKey];
  if (role) rmSync(`.auth/${role}.json`, { force: true });
  console.log(`  accepted; .env ${invite.envKey} → ${invite.email}`);
}
console.log('\nDone. Next: move the facility Super Admin seat to qa+auto-member@ (Member portal › Pengguna), then npm run bdd:accounts -- --swap-super-admin.');
