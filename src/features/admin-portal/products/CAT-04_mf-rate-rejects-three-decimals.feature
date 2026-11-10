@priority:P2 @REG-CAT-04 @severity:normal @as-admin-super
Feature: Master › Produk › Detail Produk › Ubah penanggung atau tarif
  MF rate precision (never saved)

  Scenario: [Admin] An MF rate with three decimals is refused
    Given the MF attribution of the first product is being edited
    When the MF rate "1,234" is typed
    Then the message "Tarif maksimal dua angka di belakang koma." is shown
