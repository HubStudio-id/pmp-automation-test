@priority:P1 @REG-ROLE-02 @severity:critical @as-admin-config-view
Feature: Manajemen Pengguna › Peran
  A role without «Peran» gets the no-access state (PMP-523 TC-450-12-022).

  Scenario: [Admin] «Peran» is hidden from the sidebar
    When the Admin dashboard is opened
    Then the dashboard block "Tugas saya" is shown
    And the sidebar has no "Peran" link

  Scenario: [Admin] The role page answers «Akses Ditolak»
    When the Admin role page is opened
    Then access is denied
