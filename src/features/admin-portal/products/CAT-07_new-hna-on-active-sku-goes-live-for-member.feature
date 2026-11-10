@priority:P2 @REG-CAT-07 @severity:critical @as-admin-super @as-member-super
Feature: Master › Produk
  A new HNA line saved on an Aktif SKU becomes the member price at once (PMP-735, fix with PMP-744).
  Writes one price line per run on the reserved SKU QA-PMP-517-ITEM-05; the HNA alternates between Rp 100.000 and
  Rp 101.000, so the price stays within those two values (price lines cannot be deleted). Core allows one new line per
  day per SKU (equal «Berlaku dari» = equal priority, refused): a same-day rerun verifies that day's line instead.

  Scenario: [Admin → Member] A new HNA on an Aktif SKU is the member's price right after saving
    Given the member price of the reserved HNA SKU is read
    When Admin adds a price line with the other HNA and saves the product
    Then the product is saved
    And the member catalogue shows the new HNA
