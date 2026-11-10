@priority:P1 @REG-ROLE-01 @severity:normal @as-admin-super
Feature: Pengaturan › Profil & Keamanan Akun
  «Profil & Keamanan Akun» naming; the role editor has no retired «Calon vendor» right (PMP-749)

  Scenario: [Admin] The account page is «Profil & Keamanan Akun» under PENGATURAN
    When the Admin account settings page is opened
    Then the page heading "Profil & Keamanan Akun" is shown
    And the sidebar group "PENGATURAN" is shown

  Scenario: [Admin] The role editor lists «Profil & Keamanan Akun» as always on
    When the role editor of the configured role is opened
    Then the role editor says the account page, Help Desk and Notifikasi are always on
    And the role editor never mentions "Pengaturan akun"
    And the role editor never mentions "Calon vendor"
