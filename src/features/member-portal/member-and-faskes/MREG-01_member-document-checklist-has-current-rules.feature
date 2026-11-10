@priority:P2 @REG-MREG-01 @severity:normal @as-member-applicant
Feature: Pengaturan › Profil Faskes › Dokumen
  Member document checklist

  Scenario: [Member] The document checklist shows the current rules and none of the retired ones
    When the member opens «Dokumen»
    Then these checklist items are shown:
      | B. Informasi Legal                   |
      | NIB / KBLI aktivitas rumah sakit     |
      | Izin operasional rumah sakit         |
      | Dokumen Wajib Terunggah              |
    And none of the retired member document rules is shown
