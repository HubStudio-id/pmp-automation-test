@priority:P2 @REG-TPL-02 @severity:normal @as-admin-super
Feature: Konfigurasi › Template Dokumen
  «Riwayat versi» shows the active version as «Aktif» and every replaced version as «Diarsipkan» (PMP-725). Read-only.

  Scenario: [Admin] A template's replaced versions read «Diarsipkan»
    When Template Dokumen is opened
    And the versioned QA template is viewed
    Then the active version reads «Aktif» and every replaced version «Diarsipkan»
