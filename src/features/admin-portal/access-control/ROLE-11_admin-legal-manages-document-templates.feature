@priority:P1 @REG-ROLE-11 @severity:critical @as-admin-legal
Feature: Konfigurasi › Template Dokumen
  Admin Legal holds Kelola on Template Dokumen (PMP-726). Read-only: nothing is uploaded or archived.

  Scenario: [Admin] Admin Legal opens Template Dokumen and may upload templates and versions
    When Template Dokumen is opened
    Then the template list offers «Unggah templat baru»
    And a template offers «Unggah versi baru»
