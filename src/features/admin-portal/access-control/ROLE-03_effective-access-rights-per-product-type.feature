@priority:P2 @REG-ROLE-03 @severity:normal
Feature: Pengaturan › Profil & Keamanan Akun › Hak akses efektif
  «Hak akses efektif» shows the product-type authority

  @as-admin-super
  Scenario: [Admin] Super Admin has all seven product types with all three rights
    When the Admin account settings page is opened
    Then the «Hak akses efektif» card is shown
    And every product type is listed with "Negosiasi, Setujui Negosiasi, Aktifkan Produk"

  @as-admin-config-view
  Scenario: [Admin] Role GG has no product-type authority
    When the Admin account settings page is opened
    Then the role "Role GG" is shown
    And the product-type authority reads "Tidak ada"
