@priority:P2 @REG-ROLE-05 @severity:critical @as-admin-limits-kelola
Feature: Konfigurasi › Batas & Domain
  «Batas & Domain» Kelola without full access

  Scenario: [Admin] Full-access fields are locked for a Kelola admin
    When the «Batas & Domain» configuration page is opened
    Then these fields are disabled:
      | Pengumuman              |
      | Berlaku mulai           |
      | Berlaku sampai          |
      | Nama penanda tangan MLM |
      | Tarif PPN (basis poin)  |
    And the field "Batas pengguna vendor per entitas" is enabled
    And exactly 1 «Simpan» button is offered
