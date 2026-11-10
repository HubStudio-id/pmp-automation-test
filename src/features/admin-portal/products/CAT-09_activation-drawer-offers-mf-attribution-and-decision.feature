@priority:P2 @REG-CAT-09 @severity:normal @as-admin-super
Feature: Master › Aktivasi Produk
  The «Lihat» drawer carries the MF attribution and the decision actions (PMP-739). Read-only: nothing is pressed.

  Scenario: [Admin] A product waiting for verification shows its MF attribution and can be approved or rejected
    When the Aktivasi Produk queue is opened
    And the first product waiting for verification is viewed
    Then the drawer shows the MF attribution section
    And the drawer offers the MF change, reject and approve actions
