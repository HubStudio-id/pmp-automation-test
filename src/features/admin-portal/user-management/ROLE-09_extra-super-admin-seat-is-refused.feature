@priority:P2 @REG-ROLE-09 @severity:critical @as-admin-super
Feature: Manajemen Pengguna › Admin › Detail Admin
  Super Admin seat cap (PMP-669 TC-2.6): «Edit Detail» cannot add a Super Admin seat. Since 10 Nov 2026 Super Admin is
  an account status, not a role, so the «Peran» list never offers it; the seat only moves with «Alihkan Super Admin»
  (ROLE-08). Read-only: the edit is cancelled.

  Scenario: [Admin] «Edit Detail» offers no Super Admin role, so no extra seat can be granted
    Given the detail of the promotion target admin is open
    When the roles offered in «Edit Detail» are read
    Then the list holds the admin roles but not "Super Admin"
    And the admin keeps the original role
