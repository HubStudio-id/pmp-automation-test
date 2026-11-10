// npm run bdd:data-check — read-only preflight of the staging data the BDD suite depends on.
// Run it before a regression run (after npm run bdd:auth). It changes nothing: GET calls only, plus the AX
// «ax-match» check VREG-04 itself uses to find a free creditor code (it reserves nothing).
// Exit code 1 when a FAIL row means some scenarios cannot pass; WARN rows still let the suite run.
import { existsSync } from 'node:fs';
import { chromium, type Browser, type Page } from 'playwright';
import '../src/utils/env';
import { data, urls } from '../src/testdata';

// «Test data» rule 1: expiry is flagged at least 90 days ahead.
const CONTRACT_WARN_DAYS = 90;
const AX_WARN_FREE_CODES = 10;
const PKS_WARN_VERSIONS = 50;

type Row = { level: 'OK' | 'WARN' | 'FAIL'; cases: string; check: string; detail: string };
const rows: Row[] = [];
const add = (level: Row['level'], cases: string, check: string, detail: string) => rows.push({ level, cases, check, detail });

async function sessionPage(browser: Browser, role: string, origin: string): Promise<Page | null> {
  if (!existsSync(`.auth/${role}.json`)) { add('FAIL', '-', `session ${role}`, 'missing: run npm run bdd:auth first'); return null; }
  const context = await browser.newContext({ storageState: `.auth/${role}.json` });
  // The saved token lives in the portal origin's localStorage; a blank page on that origin is enough.
  await context.route(`${new URL(origin).origin}/**`, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html>' }));
  const page = await context.newPage();
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  return page;
}

async function call(page: Page, method: 'GET' | 'POST', path: string, body?: unknown): Promise<{ status: number; body: any }> {
  return page.evaluate(async ({ api, method, path, body }) => {
    // No helper functions in here: tsx wraps named functions with __name, which the page does not define.
    const memberUser = JSON.parse(localStorage.getItem('member_user') ?? '{}');
    const vendorUser = JSON.parse(localStorage.getItem('vendor_user') ?? '{}');
    const token = localStorage.getItem('mlm_auth_token') ?? localStorage.getItem('member_token') ?? localStorage.getItem('vendor_access_token') ?? '';
    const memberCode = memberUser?.member?.code ?? memberUser?.member_code ?? '';
    const vendorCode = vendorUser?.vendor_tenant_selector || vendorUser?.vendor_code || vendorUser?.principal_code || vendorUser?.vendor?.code || '';
    const response = await fetch(api + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json', ...(memberCode ? { 'X-Member-Code': memberCode } : {}), ...(vendorCode ? { 'X-Vendor-Code': vendorCode } : {}) },
      body: body ?? undefined,
    });
    const text = await response.text();
    try { return { status: response.status, body: JSON.parse(text) }; } catch { return { status: response.status, body: null }; }
  }, { api: urls.api, method, path, body: body === undefined ? null : JSON.stringify(body) });
}

const daysUntil = (date: string) => Math.floor((new Date(date).getTime() - Date.now()) / 86_400_000);
const list = (reply: { body: any }) => (Array.isArray(reply.body?.data) ? reply.body.data : []);
// Search endpoints may ignore an unknown filter and return anything, so a row only counts when it names the product.
const named = (rows: any[], name: string) => rows.find((row) => JSON.stringify(row).includes(name));

const browser = await chromium.launch();

const admin = await sessionPage(browser, 'admin-super', urls.admin);
if (admin) {
  const { vendorSlug, contractSlug } = data.pksDraft;
  const versions = list(await call(admin, 'GET', `/admin/vendors/${vendorSlug}/pks`)).filter((v: any) => v.contract_slug === contractSlug);
  const newest = versions.sort((a: any, b: any) => b.version - a.version)[0];
  if (!newest) add('FAIL', 'VREG-05', `PKS of ${contractSlug.toUpperCase()}`, 'no PKS version found');
  else if (newest.sent_at) add('FAIL', 'VREG-05', `PKS of ${contractSlug.toUpperCase()}`, `v${newest.version} was sent: the contract left «Peninjauan PKS»`);
  else add(versions.length > PKS_WARN_VERSIONS ? 'WARN' : 'OK', 'VREG-05', `PKS of ${contractSlug.toUpperCase()}`, `${versions.length} versions, newest v${newest.version} ${newest.status}`);

  const product = list(await call(admin, 'GET', `/admin/items?q=${encodeURIComponent(data.admin.productWithoutTypeAuthority)}`)).find((i: any) => i.name === data.admin.productWithoutTypeAuthority);
  add(product && !product.archived_at ? 'OK' : 'FAIL', 'ROLE-06', data.admin.productWithoutTypeAuthority, product ? `${product.status}${product.archived_at ? ', archived' : ''}` : 'not found');

  const admins = list(await call(admin, 'GET', '/admin/admins?per_page=100'));
  const lockable = admins.find((a: any) => a.slug === data.admin.lockableAdminSlug);
  add(lockable && lockable.account_state !== 'deactivated' ? 'OK' : 'FAIL', 'AUTH-06', data.admin.lockableAdminEmail, lockable ? `${lockable.account_state}, ${lockable.role?.name ?? lockable.role}` : 'not found');
  const target = admins.find((a: any) => a.slug === data.admin.promotionTargetSlug);
  add(target ? 'OK' : 'FAIL', 'ROLE-09', `promotion target ${data.admin.promotionTargetSlug}`, target ? `${target.role?.name ?? target.role}, SA=${target.is_super_admin}` : 'not found');
  const superAdmin = admins.find((a: any) => a.slug === data.admin.superAdminSlug);
  add(superAdmin?.is_super_admin ? 'OK' : 'FAIL', 'ROLE-08', `Super Admin ${data.admin.superAdminSlug}`, superAdmin ? `SA=${superAdmin.is_super_admin}` : 'not found');

  let free = 0;
  for (const prefix of data.vendorActivationInvite.axCodePrefixes) {
    for (const row of list(await call(admin, 'GET', `/admin/ax-masters?kind=vendor&q=${encodeURIComponent(prefix)}&per_page=50`))) {
      if ((await call(admin, 'POST', '/admin/vendor-invitations/ax-match', { entity_type: 'distributor', ax_creditor_code: row.code })).status === 200) free++;
    }
  }
  add(free === 0 ? 'FAIL' : free < AX_WARN_FREE_CODES ? 'WARN' : 'OK', 'VREG-04', `free AX codes (${data.vendorActivationInvite.axCodePrefixes.join(', ')})`, `${free} free; each run uses one`);
}

const member = await sessionPage(browser, 'member-super', urls.member);
if (member) {
  const cartItem = named(list(await call(member, 'GET', `/member/catalog?q=${encodeURIComponent(data.member.cartProductName)}`)), data.member.cartProductName);
  const contract = JSON.stringify(cartItem ?? {});
  const underContract = /"under_contract":true/.test(contract);
  const validUntil = contract.match(/"valid_until":"([^"]+)"/)?.[1];
  const reference = contract.match(/"contract_reference":"([^"]+)"/)?.[1] ?? '?';
  if (!cartItem || !underContract || !validUntil) add('FAIL', 'CART-01', data.member.cartProductName, cartItem ? 'no longer under contract' : 'not in the member catalogue');
  else add(daysUntil(validUntil) < CONTRACT_WARN_DAYS ? 'WARN' : 'OK', 'CART-01', data.member.cartProductName, `${reference} valid until ${validUntil} (${daysUntil(validUntil)} days)`);

  const stockItem = named(list(await call(member, 'GET', `/member/catalog?q=${encodeURIComponent(data.stockFlag.productName)}`)), data.stockFlag.productName);
  add(stockItem ? 'OK' : 'FAIL', 'CAT-06', `${data.stockFlag.productName} in member catalogue`, stockItem ? 'listed' : 'not listed');
}

const distributor = await sessionPage(browser, 'vendor-dist-a', urls.vendor);
if (distributor) {
  const negotiations = await call(distributor, 'GET', '/vendor/negotiations?per_page=1');
  add(list(negotiations).length ? 'OK' : 'FAIL', 'NEG-01', `a negotiation of ${data.vendor.distributorAName}`, `HTTP ${negotiations.status}, ${list(negotiations).length ? 'found' : 'none'}`);
}

const v00003 = await sessionPage(browser, 'vendor-v00003', urls.vendor);
if (v00003) {
  const products = await call(v00003, 'GET', `/vendor/catalog?q=${encodeURIComponent(data.stockFlag.productName)}`);
  const ownProduct = named(list(products), data.stockFlag.productName);
  add(ownProduct ? 'OK' : 'FAIL', 'CAT-06', `${data.stockFlag.productName} in V00003 «Produk Saya»`, `HTTP ${products.status}, ${ownProduct ? 'found' : 'none'}`);
}

// ---- fixtures added 10 Nov 2026 («Test data» rule 5: every reserved fixture has a check) ----
if (admin) {
  const admins = list(await call(admin, 'GET', '/admin/admins?per_page=100'));
  const archivable = admins.find((a: any) => a.email?.toLowerCase() === data.admin.archivableAdminEmail);
  add(archivable && archivable.account_state === 'active' ? 'OK' : 'FAIL', 'LOG-01', data.admin.archivableAdminEmail, archivable ? `${archivable.account_state} (must be active before the run; @archived-admin archives and restores it)` : 'not found: npm run bdd:accounts');
  const legal = admins.find((a: any) => a.email?.toLowerCase() === data.admin.legalAdminEmail);
  const legalRole = legal?.role?.name ?? legal?.role;
  add(legal && legal.account_state === 'active' && legalRole === 'Admin Legal' ? 'OK' : 'FAIL', 'ROLE-11', data.admin.legalAdminEmail, legal ? `${legal.account_state}, role ${legalRole}` : 'not found: npm run bdd:accounts');

  const templates = list(await call(admin, 'GET', '/admin/document-templates?per_page=100'));
  const versionsOf = async (code: string) => {
    const template = templates.find((t: any) => t.code === code);
    if (!template) return null;
    return { template, versions: (await call(admin, 'GET', `/admin/document-templates/${template.slug}`)).body?.data?.versions ?? [] };
  };
  const skk = await versionsOf(data.templateUploadCheck.templateCode);
  const skkActive = skk?.versions.find((v: any) => v.status === 'active');
  const field = data.templateUploadCheck.unfilledField.replace(/[{}]/g, '');
  if (!skk || skk.template.status !== 'active' || !skkActive) add('FAIL', 'TPL-01', data.templateUploadCheck.templateCode, skk ? `template ${skk.template.status}, active version ${skkActive ? 'present' : 'missing'}` : 'template not found');
  else add((skkActive.merge_fields ?? []).includes(field) || /harus ditolak/.test(skkActive.note ?? '') ? 'FAIL' : 'OK', 'TPL-01', data.templateUploadCheck.templateCode, `active ${skkActive.version_label}${/harus ditolak/.test(skkActive.note ?? '') ? ' is a TPL-01 test upload: re-upload the original file' : ''}`);
  const versioned = await versionsOf(data.documentTemplates.versionedTemplate);
  const archived = versioned?.versions.filter((v: any) => v.status === 'archived').length ?? 0;
  add(archived > 0 ? 'OK' : 'FAIL', 'TPL-02', `${data.documentTemplates.versionedTemplate} version history`, `${archived} archived version(s)`);

  const sole = named(list(await call(admin, 'GET', `/admin/vendor-registrations?per_page=50&q=${encodeURIComponent(data.soleWizard.companyName)}`)), data.soleWizard.companyName);
  add(sole && sole.status === 'draft' ? 'OK' : 'FAIL', 'VREG-06', data.soleWizard.companyName, sole ? `registration ${sole.status} (must stay draft, never submitted)` : 'not found: npm run bdd:accounts');
}
if (member) {
  const hnaItem = list(await call(member, 'GET', `/member/catalog?q=${encodeURIComponent(data.hnaChange.productName)}`)).find((r: any) => r.sku_code === data.hnaChange.sku);
  const until = hnaItem?.valid_until;
  const price = hnaItem?.catalog_price?.per_purchase_unit;
  if (!hnaItem || !until) add('FAIL', 'CAT-07', data.hnaChange.productName, hnaItem ? 'no longer under contract' : 'not in the member catalogue');
  else if (!(data.hnaChange.hnaValues as number[]).includes(price)) add('FAIL', 'CAT-07', data.hnaChange.productName, `price ${price} is outside the alternating values ${data.hnaChange.hnaValues.join('/')}: someone changed it`);
  else add(daysUntil(until) < CONTRACT_WARN_DAYS ? 'WARN' : 'OK', 'CAT-07', data.hnaChange.productName, `Rp ${price}, contract valid until ${until} (${daysUntil(until)} days)`);
}
if (distributor) {
  const code = data.negotiationAttachment.openCode;
  const negotiation = await call(distributor, 'GET', `/vendor/negotiations/${code}`);
  const status = negotiation.body?.data?.status;
  add(negotiation.status === 200 && status && status !== 'completed' ? 'OK' : 'FAIL', 'NEG-02', code, status ? `${status} (must stay open: reserved, never agree/close it)` : `HTTP ${negotiation.status}`);
  const attachments = await call(distributor, 'GET', `/vendor/negotiations/${data.negotiationAttachment.code}`);
  add(attachments.status === 200 ? 'OK' : 'FAIL', 'NEG-03', `${data.negotiationAttachment.code} readable`, `HTTP ${attachments.status}`);
}
const soleDraft = await sessionPage(browser, 'vendor-sole-wizard', urls.vendor);
if (soleDraft) {
  const draft = (await call(soleDraft, 'GET', '/vendor/registration-draft')).body?.data;
  add(draft && !draft.submitted_at ? 'OK' : 'FAIL', 'VREG-06', 'Sole distributor draft (vendor-sole-wizard)', draft ? (draft.submitted_at ? `submitted ${draft.submitted_at}: cannot run again` : `draft at step ${draft.current_step}`) : 'draft not readable');
}
const registrant = await sessionPage(browser, 'member-registrant', urls.member);
if (registrant) {
  const registration = (await call(registrant, 'GET', '/member/onboarding/registration')).body?.data;
  add(registration?.status === 'draft' ? 'OK' : 'FAIL', 'MREG-06', `${data.memberRegistration.facilityName} registration`, registration ? `${registration.status} (must stay draft, never submitted)` : 'not readable');
}

await browser.close();

const width = (key: keyof Row) => Math.max(...rows.map((r) => r[key].length));
for (const r of rows) console.log(`${r.level.padEnd(4)}  ${r.cases.padEnd(width('cases'))}  ${r.check.padEnd(width('check'))}  ${r.detail}`);
const failed = rows.filter((r) => r.level === 'FAIL').length;
console.log(`\n${rows.length} checks: ${rows.length - failed - rows.filter((r) => r.level === 'WARN').length} OK · ${rows.filter((r) => r.level === 'WARN').length} WARN · ${failed} FAIL`);
process.exit(failed ? 1 : 0);
