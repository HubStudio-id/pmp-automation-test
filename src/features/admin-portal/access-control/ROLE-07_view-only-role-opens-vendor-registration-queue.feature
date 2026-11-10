@priority:P1 @REG-ROLE-07 @severity:critical @as-admin-config-view
Feature: Master › Registrasi Vendor
  A role with «Lihat» on Registrasi Vendor opens the queue, not «Akses Ditolak» (PMP-752)

  Scenario: [Admin] A view-only role opens the Registrasi Vendor queue
    Given Role GG, the role of this admin, holds Lihat only
    When the Registrasi Vendor queue is open
    Then the queue lists registrations
    And no load error is shown on the registration pages
