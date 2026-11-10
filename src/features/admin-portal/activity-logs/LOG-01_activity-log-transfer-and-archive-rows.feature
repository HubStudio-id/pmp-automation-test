@priority:P2 @REG-LOG-01 @severity:normal @as-admin-super
Feature: Audit › Log Aktivitas
  Log Aktivitas rows for account changes (past defects PMP-836 and PMP-837, fixed 9 Nov 2026)

  Scenario: [Admin] An «Alihkan Super Admin» log row shows the reason and the role change
    Given Log Aktivitas is open on «Akun & peran»
    When the log is searched for "dialihkan kepada"
    Then the Super Admin transfer row shows its change and its reason

  @archived-admin
  Scenario: [Admin] An archived admin log row offers «Pulihkan» to Super Admin
    Given Log Aktivitas is open on «Akun & peran»
    When the log is searched for "dinonaktifkan"
    Then the archived admin row offers «Pulihkan»
