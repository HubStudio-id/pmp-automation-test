@priority:P1 @REG-VREG-02 @severity:critical @as-admin-super
Feature: Master › Registrasi Vendor
  Admin Registrasi Vendor queue and the «Dokumen» counter of what waits for verification (PMP-515 TC-450-04-015).
  Read-only: nothing is approved.

  Scenario: [Admin] A vendor registration detail opens from the queue
    Given the Registrasi Vendor queue is open
    When the first registration is opened
    Then the heading "Detail pendaftar" is shown
    And no load error is shown on the registration pages

  Scenario: [Admin] The «Dokumen» counter matches the files waiting for verification
    Given a registration in «Verifikasi Legalitas» with files waiting for verification
    When its «Dokumen» tab is opened
    Then the counter reads the waiting wajib, opsional and surat counts from the API
