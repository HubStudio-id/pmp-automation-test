# PMP regression suite — plan (5 Nov 2026)

Runner (6 Nov 2026): **Cucumber BDD** — feature files in `src/features/<portal>/<area>/` (portal = admin-portal · vendor-portal ·
member-portal since 9 Nov 2026; multi-portal cases are split per portal under the same ID); modes below keep
their meaning (`e2e` = automated, `e2e+` = automated and restores QA data). No lead-only set: every case runs in `npm run bdd:all` (QA lead, 10 Nov 2026).

Scope: features the QA lead has tested (39 QA tickets, 46 bugs filed). Environment: staging.
Rules used to pick a case (column **Rules**):

1. Core & critical feature
2. Frequent code change / defect area (merged PRs since 1 Oct 2026: catalog 179 · invoice/payment 151 · vendor registration & documents 135 · cart/PO/delivery 129 · Help Desk & copy 92 · contract/PKS 92 · roles 66 · SLA/tasks 66 · auth 51)
3. Highly integrated (crosses portals or Core ↔ portal data)
4. Past defect (bug key in **Source**)
5. Happy path / sanity
6. Boundary value
7. Production defect («prod» + Slack permalink or Jira key in **Source**; usually raised in Slack #mlm-pmp, not Jira; always admitted, never retired while the feature exists; P1 when blocker/critical, else P2 — QA lead, 10 Nov 2026)

**Pri** — P1: every release (sanity, ≈15 min run). P2: every release candidate (full run).
**Severity** (Allure label from the `@severity:<level>` tag; set 6 Nov 2026 by the impact of a failure, not by priority) — `blocker`: the core procurement path stops (vendor onboarding wizard, member catalog, PO across portals) · `critical`: a security or access rule breaks, or a core flow/queue fails (sign-out, lockout, role enforcement, Super Admin cap, invitation reuse, registration queue, activation, negotiation, contract, cart, SLA tasks) · `normal`: a feature works wrongly but has a workaround (lists, dashboards, logs, document rules, form validation) · `minor`: wrong label, placeholder or info text · `trivial`: cosmetic (layout overlap, punctuation in copy).
**Mode** — `e2e`: automated, read-only or self-cleaning · `e2e+`: automated, writes QA data a fixture restores · no `lead-run` and no semi-manual cases: everything runs in `npm run bdd:all` (QA lead, 5 and 10 Nov 2026).

Accounts: role handles from `.env` (`admin-super`, `admin-config-view`, `member-super`, `vendor-dist-a`, …).

## A. Sign-in & session

| ID | Scenario | Rules | Pri | Severity | Mode | Account | Source |
|---|---|---|---|---|---|---|---|
| REG-AUTH-01 | Admin sign-in without «Ingat saya» → Keluar: the old access token answers 401 (200 before) | 1 4 5 | P1 | critical | e2e | admin-config-view | PMP-484 AC1 |
| REG-AUTH-02 | Member and Vendor sign-in with «Ingat saya» → Keluar: access token 401 (200 before), remember token cannot refresh | 1 3 4 | P1 | critical | e2e | member-super, vendor-dist-a | PMP-484 AC1–2 |
| REG-AUTH-04 | Wrong password: generic «Login gagal»; Help Desk search «Login gagal» finds the guide | 4 5 | P2 | normal | e2e | — | PMP-743 |
| REG-AUTH-05 | Member account menu (Profil Saya · Pengaturan · Keluar) lies inside the viewport at 375 px and 1280 px | 4 | P2 | normal | e2e | member-super | PMP-729 AC1 |
| REG-AUTH-06 | 5th wrong password locks an ordinary admin; Super Admin unlocks | 1 4 6 | P2 | critical | e2e+ | admin-product-no-contract + admin-super | PMP-669 TC-3.3 |

## B. Roles & access

| ID | Scenario | Rules | Pri | Severity | Mode | Account | Source |
|---|---|---|---|---|---|---|---|
| REG-ROLE-01 | Super Admin: sidebar groups and role-editor page names match (incl. «Profil & Keamanan Akun» always active) | 1 2 4 | P1 | normal | e2e | admin-super | PMP-344, PMP-606, PMP-749 bug (no «Calon vendor» right, 10 Nov 2026) |
| REG-ROLE-02 | Lihat-only Konfigurasi: config pages read-only, Manajemen Pengguna › Peran = «Akses Ditolak» | 1 5 | P1 | critical | e2e | admin-config-view | PMP-523 TC-450-12-022 (no-access state for a role without the page) |
| REG-ROLE-03 | «Hak akses efektif»: Super Admin all 7 types × 3 rights; Role GG «Tidak ada» | 1 3 | P2 | normal | e2e | admin-super, admin-config-view | PMP-647 |
| REG-ROLE-05 | Kelola Batas & Domain without full access: Pengumuman locked, no «Simpan» | 1 6 | P2 | critical | e2e | admin-limits-kelola | PMP-649 TC-2.2 |
| REG-ROLE-06 | Kewenangan Tipe Produk enforced on «Edit Produk» for a role without the type | 1 4 | P2 | critical | e2e | admin-product-no-contract | PMP-736 bug |
| REG-ROLE-07 | Role GG (Lihat only) opens the Registrasi Vendor queue: rows, no «Akses Ditolak» | 1 4 | P1 | critical | e2e | admin-config-view | PMP-752 bug (re-admitted 10 Nov 2026) |
| REG-ROLE-11 | Admin Legal (qa+auto-legal@, role «Admin Legal») opens Template Dokumen: «Unggah templat baru» on the list, «Unggah versi baru» on a template (nothing uploaded) | 1 4 | P1 | critical | e2e | admin-legal | PMP-726 bug (Team Lead decision 29 Oct, comment 14271) |
| REG-ROLE-08 | Super Admin detail: «Alihkan Super Admin», no Kunci/Nonaktifkan (anchored on an ordinary admin); transfer dialog keeps the reason ≤ 500, «Konfirmasi» disabled while incomplete | 1 6 | P2 | normal | e2e (never confirms) | admin-super | PMP-669 TC-2.1 |
| REG-ROLE-09 | «Edit Detail» of qa+procurement@ offers every admin role but no «Super Admin» (Super Admin is an account status since 10 Nov 2026; the seat only moves with «Alihkan Super Admin»), read-only | 1 6 | P2 | critical | e2e | admin-super | PMP-669 TC-2.6 |

## C. Vendor registration & documents

| ID | Scenario | Rules | Pri | Severity | Mode | Account | Source |
|---|---|---|---|---|---|---|---|
| REG-VREG-01 | Vendor wizard walk Tahap 1 → 7 on the QA draft (no submit): step titles, «Lanjut ke Review», consent texts without «Draf konsen» | 1 2 4 5 | P1 | blocker | e2e+ | vendor wizard draft (qa+pmp466v); @wizard-baseline removes and re-uploads «NPWP Perusahaan» | PMP-728 AC1 (SRT-KJM 0× «templat SRT-KJM v», 0× «Baris stempel verifikasi») |
| REG-VREG-06 | Sole distributor · Obat · PMDN draft (qa+auto-sole@) walks Tahap 1–7 and issues SRT-KJM on one page with the company name (no 422) | 1 3 4 | P2 | critical | e2e+ (@wizard-baseline; draft never submitted) | vendor-sole-wizard | PMP-753 bug |
| REG-VREG-02 | Admin Registrasi Vendor queue + detail open; «Dokumen» counter of a «Verifikasi Legalitas» registration = waiting files from the API | 1 2 4 | P1 | critical | e2e | admin-super | PMP-515 TC-450-04-015 |
| REG-VREG-03 | Vendor Pengajuan Berkas: status chips and resubmission rules on a verified package | 2 3 | P2 | normal | e2e | vendor-dist-a | PMP-685 |
| REG-VREG-04 | Undangan Aktivasi vendor first sign-in with incomplete documents succeeds; 30-day banner | 1 3 4 | P2 | critical | e2e+ (new invite each run, archived after; uses one AX code) | admin-super, new QA vendor | PMP-822 |
| REG-VREG-05 | New PKS draft on the QA contract each run (no delete endpoint: versions add up on KTR-00062): LAMP-3 current template (no «v0.1» or stamp placeholder); PKS-KOMP headed «PERJANJIAN KERJA SAMA» + «PENGADAAN PRODUK BAHAN MEDIS HABIS PAKAI» (SRT-KJM is covered by REG-VREG-01) | 2 3 4 | P2 | normal | e2e+ | admin-super, QA contract KTR-00062 (QA-GRP3 Distributor BMHP) | PMP-829 AC1 (LAMP-3 markers), PMP-675 (PKS-KOMP heading) |

## D. Member registration & faskes

| ID | Scenario | Rules | Pri | Severity | Mode | Account | Source |
|---|---|---|---|---|---|---|---|
| REG-MREG-01 | Member Dokumen checklist = active member rules (wajib/opsional), no retired rule | 1 2 3 | P2 | normal | e2e | member-applicant | PMP-687 |
| REG-MREG-03 | Admin «Undang faskes» dialog offers both invitation types and states the configured working-day validity (dialog only, not sent) | 1 5 | P2 | normal | e2e | admin-super | PMP-673 TC-1.6 |
| REG-MREG-05 | Used member invitation link: Member «Tautan undangan sudah digunakan» + «Masuk» only; same link in Vendor «Undangan tidak berlaku lagi»; changed token «Tautan undangan tidak berlaku» (all 422, nothing written) | 1 3 | P2 | critical | e2e | no session; member-maker invitation e-mail (Gmail) | PMP-608 |
| REG-MREG-06 | Member registration draft (qa+auto-regmember@): profile + one partner by API, SRT-SP issued with «ID Dokumen» filled and no «{{id_dokumen}}»; page count only noted (Team Lead expects 2, open question to HUB; 3 on 10 Nov 2026) | 1 3 4 | P2 | critical | e2e+ (one SRT-SP per run; draft never submitted) | member-registrant | PMP-793 bug (comment 14405) |

## E. Catalog, product, price & activation

| ID | Scenario | Rules | Pri | Severity | Mode | Account | Source |
|---|---|---|---|---|---|---|---|
| REG-CAT-02 | Admin Aktivasi Produk queue loads and every pair_prices row has a numeric price and a ready flag | 1 2 4 | P1 | critical | e2e | admin-super | PMP-744 AC1–2 |
| REG-CAT-04 | MF rate with 3 decimals / comma refused, nothing saved | 4 6 | P2 | normal | e2e | admin-super | PMP-517 bug |
| REG-CAT-06 | «Stok habis» SKU has no enabled «Tambahkan ke keranjang» | 1 3 | P2 | critical | e2e+ | member-super (+ vendor stock flag restore) | PMP-517 (vendor stock flag → member catalog) |
| REG-CAT-07 | A new HNA line on Aktif SKU QA-PMP-517-ITEM-05 is the member's catalogue price right after «Simpan Produk» (HNA alternates Rp 100.000 / 101.000) | 1 2 3 4 | P2 | critical | e2e+ (one price line per day — a second line the same day is refused for equal priority, so a same-day rerun verifies that day's line; lines cannot be deleted) | admin-super, member-super | PMP-735 bug (fix with PMP-744) |
| REG-CAT-09 | Aktivasi Produk › Lihat drawer of a waiting product: «ATRIBUSI JASA MANAJEMEN SKU INI», «Ubah penanggung atau tarif», «Tolak produk», «Setujui & terbitkan» (nothing pressed) | 4 | P2 | normal | e2e | admin-super | PMP-739 bug |

## F. Negotiation

| ID | Scenario | Rules | Pri | Severity | Mode | Account | Source |
|---|---|---|---|---|---|---|---|
| REG-NEG-01 | Admin Negosiasi opens the vendor's negotiation with the same code; target card and payload carry no «Pembulatan» | 1 3 5 | P1 | critical | e2e | admin-super, vendor-dist-a | PMP-518 TC-450-07-006, TC-450-07-010 |
| REG-NEG-03 | A negotiation attachment link is a portal API path: 200 with the admin session, 401/403 without | 3 4 | P2 | critical | e2e | admin-super, NEG-2026-0033 | PMP-732 bug |
| REG-NEG-02 | Vendor Negosiasi Saya: a PDF of exactly 10 485 760 bytes is sent (200/201, shown in the chat); one byte more shows «Ukuran lampiran maksimum 10 MB.» and sends nothing | 4 6 | P2 | normal | e2e+ (one message per run; messages cannot be deleted) | vendor-dist-a, NEG-2026-0036 | PMP-731 bug (re-admitted 10 Nov 2026) |

## G. Contract, PKS & LoA

| ID | Scenario | Rules | Pri | Severity | Mode | Account | Source |
|---|---|---|---|---|---|---|---|
| REG-KTR-01 | Admin contract register: an Aktif contract past its end date (from the API) keeps «PKS Aktif» in its row, not «Berakhir» | 1 2 3 | P1 | critical | e2e | admin-super, vendor-dist-a | PMP-666 TC-1.1 |

## H. Cart (Member)

| ID | Scenario | Rules | Pri | Severity | Mode | Account | Source |
|---|---|---|---|---|---|---|---|
| REG-CART-01 | Add QA product → footer «Tidak ada Cito»; Cito dialog shows served SLA, condition gate; save → «1 item Cito · SLA …»; cart emptied after | 1 2 3 4 6 | P1 | critical | e2e+ | member-super | PMP-673, PMP-835 |

## I. SLA, tasks, notifications

| ID | Scenario | Rules | Pri | Severity | Mode | Account | Source |
|---|---|---|---|---|---|---|---|
| REG-SLA-01 | A non-full-access admin finds the open VENDOR_INVOICE_CREATE task «SLA Terlampaui» (from the tasks API, precondition > 0), its row reads «Vendor menerbitkan invoice», and «Buka» opens its detail with the reference, no «Akses Ditolak» | 1 3 | P1 | critical | e2e | admin-archive-log | PMP-673 TC-1.2 |
| REG-NOTIF-01 | Member bell panel shows «n baru» = API unread count and 1–6 newest rows; Notifikasi page counts per category | 3 5 | P2 | normal | e2e | member-maker | PMP-746 TC-1.2 |

## J. Dashboard, configuration, archive & log

| ID | Scenario | Rules | Pri | Severity | Mode | Account | Source |
|---|---|---|---|---|---|---|---|
| REG-DASH-01 | Dasbor Utama blocks (Tugas saya, Antrean per modul, SLA terlampaui, Aktivitas terbaru); no «Atur widget» | 1 5 | P1 | normal | e2e | admin-config-view | PMP-649, PMP-309 |
| REG-ARC-01 | Arsip tabs load; cancelled never-accepted admin invite has no «Pulihkan» | 1 3 | P2 | normal | e2e | admin-super | PMP-669, PMP-312 |
| REG-LOG-01 | Log Aktivitas: transfer row shows reason + role change; archived admin row offers «Pulihkan» to Super Admin | 4 | P2 | normal | e2e+ (archives and restores qa+auto-archive@) | admin-super | PMP-836, PMP-837 (both fixed 9 Nov 2026) |

## L. Lists & search

| ID | Scenario | Rules | Pri | Severity | Mode | Account | Source |
|---|---|---|---|---|---|---|---|
| REG-LIST-01 | Admin Invoice: «N hasil», «Menampilkan 1–25 dari N» and pager = API `pagination.count`; full number and last segment find one invoice, middle segment and «ZZZ999» give the empty state; Admin Produk footer «Menampilkan 25 dari N SKU» and pager = API total | 1 2 4 | P2 | normal | e2e | admin-super | PMP-64 (bug PMP-60), PMP-306 |

## M. Template Dokumen

| ID | Scenario | Rules | Pri | Severity | Mode | Account | Source |
|---|---|---|---|---|---|---|---|
| REG-TPL-01 | «Unggah versi baru» on SRT-SKK with its active DOCX + «{{nama_faskes}}» in the letter body (next to {{nib}}, before the field legend page) is refused (422 TEMPLATE_RENDER_FAILED / unknown_field, Core's message) and the active version stays (PMP-792, fixed by Core PR #414; retest PASS 10 Nov 2026, PMP-515 comment 15204) | 4 | P2 | normal | e2e+ (@restore-template re-uploads the original when a version is stored) | admin-super | PMP-792 bug |
| REG-TPL-02 | «Riwayat versi» of TRX-RT: the active version reads «Aktif», every replaced version «Diarsipkan» (versions from the API) | 4 | P2 | normal | e2e | admin-super | PMP-725 bug |

## AC alignment audit (10 Nov 2026)

Rule (QA lead): every case names its TC / AC line and asserts **at least one** of its Expected Results strongly
(checked where the TC says, with a positive anchor or a precondition — no vacuous pass). Full coverage is not required.

| Case | Source TC / AC | Strong Expected Result asserted | Status |
|---|---|---|---|
| AUTH-01, AUTH-02 | PMP-484 AC1–2 | old access token 401 after «Keluar» (200 before), remember token cannot refresh | **ok** (fixed 10 Nov) |
| CAT-02 | PMP-744 AC1–2 | every pair_prices row numeric price_idr + boolean ready (≥ 1 row) | **ok** (fixed 10 Nov) |
| SLA-01 | PMP-673 TC-1.2 | breached invoice task (API, > 0) reads and opens «SLA Terlampaui» | **ok** (fixed 10 Nov) |
| AUTH-06 | PMP-669 TC-3.3 | «Terkunci» after 5 wrong passwords; @unlock-lockable unlocks first, so no stale lock | ok |
| AUTH-04 | PMP-743 AC1 | «Login gagal» finds «Keamanan akun dan passkey» (≥ 1 topic) | ok |
| ROLE-01 | PMP-749 AC1 | no «Calon vendor» after the editor's note is visible | ok |
| ROLE-03 | PMP-647 TC-1.2 | each product type row lists the three rights | ok |
| ROLE-05 | PMP-649 TC-2.2 | the full-access fields are disabled | ok |
| ROLE-06 | PMP-736 AC1 | no «Edit Produk» on the product that can be viewed | ok |
| ROLE-07 | PMP-752 AC2 | Role GG (from /account) sees queue rows, no «Akses Ditolak» | ok |
| ROLE-09 | PMP-669 TC-2.6 | «Super Admin» never offered in «Peran» (list ≥ 2 roles, target's role present) | ok (TC text predates the 10 Nov design) |
| ROLE-11 | PMP-726 AC1 | Admin Legal gets «Unggah templat baru» and «Unggah versi baru» | ok |
| VREG-03 | PMP-685 TC-1.1 | «Ajukan Berkas» stays disabled on the verified package | ok |
| VREG-04 | PMP-822 AC1 | activation + sign-in 200 with documents incomplete | ok |
| VREG-06 | PMP-753 AC1 | SRT-KJM 201 and one page | ok |
| MREG-01 | PMP-687 TC-2.1 | no retired rule, after the current items are shown | ok |
| MREG-05 | PMP-608 TC-1.2, 1.4, 3.1 | INVITATION_ALREADY_USED / INVALID_TOKEN + message | ok |
| MREG-06 | PMP-793 AC1 | SRT-SP issued, «ID Dokumen» filled, no {{id_dokumen}} | ok |
| CAT-04 | PMP-740 AC1 | «Tarif maksimal dua angka di belakang koma.» for 1,234 | ok |
| CAT-06 | PMP-517 (vendor stock flag) | member card «Stok habis · …», no «Tambah ke keranjang» | ok |
| CAT-07 | PMP-735 AC1, AC3 | member price = new HNA; line activated | ok |
| CAT-09 | PMP-739 AC1–2 | MF section + «Tolak produk» / «Setujui & terbitkan» in the drawer | ok |
| NEG-02 | PMP-731 AC1–2 | 10 485 760 B sent, 10 485 761 B refused | ok |
| NEG-03 | PMP-732 AC2 | admin downloads (200); the same link without a session is refused | ok |
| LOG-01 | PMP-836 AC1–2, PMP-837 AC1 | reason + role change; «Pulihkan» on the archived admin | ok |
| TPL-01 | PMP-792 AC1 | upload refused 422 | ok |
| TPL-02 | PMP-725 AC1 | active «Aktif», replaced «Diarsipkan» (versions from the API) | ok |
| DASH-01 | PMP-649 TC-3.1 | no «Atur widget», after the blocks are shown | ok |
| ARC-01 | PMP-312 / PMP-669 TC-2.8 | every Arsip tab shows a count | ok |
| LIST-01 | PMP-306 | full number / last segment find one invoice, middle / ZZZ999 empty | ok |
| CART-01 | PMP-835 AC1 | «Tidak ada Cito» (red: soft known bug) and Cito count | ok |
| KTR-01 | PMP-666 TC-1.1 | an Aktif contract past its end date (API validity_state past) keeps «PKS Aktif», not «Berakhir»; badge awaits PMP-540; weak vendor scenario dropped | **ok** (fixed 10 Nov) |
| VREG-02 | PMP-515 TC-450-04-015 | «Dokumen» counter = API waiting files (wajib · opsional · surat) | **ok** (fixed 10 Nov) |
| NOTIF-01 | PMP-746 TC-1.2 | bell panel (its own overlay, not any menu) shows «n baru» = API unread_count and 1–6 rows | **ok** (fixed 10 Nov) |
| AUTH-05 | PMP-729 AC1 | menu items fully inside the viewport at 375 px and 1280 px | **ok** (fixed 10 Nov) |
| ROLE-08 | PMP-669 TC-2.1 | «Alihkan Super Admin» and no Kunci/Nonaktifkan, anchored on an ordinary admin that has them | **ok** (fixed 10 Nov) |
| MREG-03 | PMP-673 TC-1.6 | dialog states the SLA MEMBER_FACILITY_INVITE_ACCEPT value in working days | **ok** (fixed 10 Nov) |
| NEG-01 | PMP-518 TC-450-07-006, 010 | target card «Target diskon bagian» without «Pembulatan»; payload with ≥ 1 section has no rounding | **ok** (fixed 10 Nov) |
| VREG-01 | PMP-728 AC1 | SRT-KJM issued without «templat SRT-KJM v» / stamp line, one page | **ok** (re-sourced 10 Nov) |
| VREG-05 | PMP-829 AC1, PMP-675 | new LAMP-3 without the v0.1 marker / stamp line; PKS-KOMP heading | **ok** (re-sourced 10 Nov) |
| ROLE-02 | PMP-523 TC-450-12-022 | «Peran» absent from the sidebar (dashboard loaded first) and the page answers «Akses Ditolak» | **ok** (re-sourced 10 Nov) |
| CAT-01, CART-02, PO-01 | PMP-805/830 (KJAditya), none | not Maolana's tickets / no source | **removed** (QA lead, 10 Nov 2026) |

## Planned — Maolana Hadiar's PMP tickets, not automated yet (10 Nov 2026)

Source: PMP tickets with assignee or reporter Maolana Hadiar (99: 45 QA, 54 bugs); bugs whose own key had no case,
severity normal or higher. Rows move into their section (and the Totals) once automated and green. Build in batch order.

| Batch | ID | Scenario | Rules | Pri | Severity | Mode | Account / data | Source |
|---|---|---|---|---|---|---|---|---|
| 3 | REG-CAT-08 | «Tautkan» on a distributor «Menunggu kode item» line creates the SKU and returns it to «Menunggu verifikasi» (a principal line goes to «Periksa harga» by design, comment 14841) | 1 2 4 | P2 | critical | e2e+ (new waiting line each run) | admin-super, QA vendor proposal | PMP-828 bug |
| 3 | REG-VREG-07 | The note typed in «Setujui semua» is recorded in Riwayat | 4 | P2 | normal | e2e+ | QA registration at Legalitas | PMP-751 bug |
| 3 | REG-VREG-08 | A document replaced by Tim MLM in «Finalisasi Kontrak» does not return to «Menunggu» | 4 | P2 | normal | e2e+ | QA registration at Finalisasi Kontrak | PMP-754 bug |

Priority note: access cases are always P1, so ROLE-07 and ROLE-11 enter P1 and REG-MREG-01 moves to P2 when they land
(it meets no P1 criterion: no happy path, one-sided rule 3, no defect). P1 then holds 16 cases (14 after CAT-01 and PO-01 were removed).

Not taken (10 Nov 2026): minor/cosmetic PMP-370, 371, 717–724, 730, 756, 757, 840, 842, 843, 844; API-only PMP-727;
To Do PMP-841 and QA tickets PMP-288, 298, 307, 313, 598, 599; no defect and not core PMP-292, 302, 308, 524, 663,
design fidelity PMP-439, 441, 801. PMP-652 (SRT-LOA) can return once the PO's decision is on the ticket. PMP-790 (empty SRT-KJM footer) was closed as not a bug
(comment 14392: by design per PMP-451).

## Totals

- 42 cases · P1 14 · P2 28 (10 Nov 2026: 7 minor/trivial deleted; CAT-01, CART-02, PO-01 removed; ROLE-07, ROLE-11, CAT-07, CAT-09, NEG-02, NEG-03, TPL-01, TPL-02, VREG-06, MREG-06 added; MREG-01 to P2)
- Mode: e2e 30 · e2e+ 12
- Severity: blocker 1 · critical 22 · normal 19
- Rule coverage (cases tagged): (1) 30 · (2) 11 · (3) 18 · (4) 26 · (5) 8 · (6) 7
- Reds: the earlier @known-bug cases. TPL-01 was a false red until 10 Nov 2026: its file put the field on the legend page, which Core never scans; fixed to put it in the body. MREG-06 notes SRT-SP's page count (3 vs 2 expected) for HUB's answer, without failing

## Deleted (10 Nov 2026 — minor/trivial severity is left out, QA lead)

Feature files, their steps, page objects and test data were deleted (not kept in `retired/`).
REG-AUTH-03 (passkey copy), REG-ROLE-10 (user search placeholder), REG-MREG-02 («Jenis faskes» labels),
REG-CAT-03 (product detail labels), REG-CAT-05 (Produk Saya tiles), REG-SLA-03 (transaction number overlap),
REG-HD-01 (Help Desk connectors).

Removed the same day, also deleted outright: REG-CAT-01 (member catalog contract price and purchase unit; PMP-805/830,
not Maolana Hadiar's tickets), REG-CART-02 (cart line selection; PMP-805), REG-PO-01 (Member PO in Vendor PO Inbox and
Admin Lacak Transaksi; no source ticket). Reason: the suite only holds cases traced to the QA lead's tickets or a
production defect (QA lead, 10 Nov 2026).

## Retired (6 Nov 2026 — do not meet the admission rule; ROLE-07 and NEG-02 re-admitted 10 Nov 2026)

Admission: rule 4 with a proven defect that the test reproduces, or rules 1 + 5, or two or more rules (rule 3 only
when the test really crosses portals or systems). Their feature files were removed from the suite (a `retired/` copy was not kept); rebuild from this table if a case returns.

| ID | Scenario | Why it left the suite |
|---|---|---|
| REG-ROLE-04 | Vendor user without Pengguna & Peran → «Anda tidak memiliki akses ke halaman ini» | no access defect in PMP-523 → rule 1 only |
| REG-MREG-04 | Undangan Mendaftar expiry = 30 working days (weekends/holidays) | rule 6 only; can return as 3 6 if the test also matches the e-mail text with the API date |
| REG-KTR-02 | «Ref. kontrak (sistem)» picker lists Draf and running contracts of the distributor (form not saved) | PMP-607 PASS (no picker defect) → rule 2 only; can return as 2 3 if the test creates a Draf contract and finds it in the picker |
| REG-KTR-03 | Vendor Profil › Hubungan: no «Unduh SRT-LOA» | no defect (PMP-652/615 TCs were TBD awaiting the PO); no rule holds until the PO decides |
| REG-SLA-02 | Standar Operasional: escalation picker one «Admin Keuangan» + «Admin Integrasi»; HANDOFF/MEMBER_DOCUMENT working days | rule 2 only |
| REG-CFG-01 | Pengumuman validation: 501 chars kept at 500, tab refused, «Berlaku sampai» before «Berlaku mulai» refused — nothing saved | rule 6 only |
| REG-HD-02 | «Profil & Keamanan Akun» in sidebar, title, breadcrumb, user menu; invitation e-mail path | PMP-606 all PASS (no defect) → rule 2 only; the heading check duplicates REG-ROLE-01a |
| REG-TXT-01 | Status chips follow the Status Catalogue per portal (vendor «Ditolak» red in Admin) | PMP-718 PASS (no defect) → rule 2 only |

## Not covered yet

- Invoice, payment, MF billing, rebate and PPh23 (151 PRs since October) are not in the lead's tested tickets; add their sanity paths once owned.
- Hypercare connection metrics and SLA archive states need engineering fixtures on staging.
