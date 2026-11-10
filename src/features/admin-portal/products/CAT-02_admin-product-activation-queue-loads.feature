@priority:P1 @REG-CAT-02 @severity:critical @as-admin-super
Feature: Master › Aktivasi Produk
  Aktivasi Produk queue (PMP-744): the queue loads, and every pair price row has a numeric price and a ready flag (AC1–2)

  Scenario: [Admin] The Aktivasi Produk queue loads without an error
    When the Aktivasi Produk queue is opened
    Then the queue shows at least one row
    And no queue load error is shown
    And every pair price in the queue has a numeric price and a ready flag
