@priority:P2 @REG-CAT-06 @severity:critical @as-vendor-v00003 @as-member-super @restore-stock
Feature: Katalog › Produk Saya + Pembelian › Buat Pesanan › Katalog
  Out-of-stock SKU in the member catalog

  Scenario: [Vendor → Member] A SKU marked «Stok habis» by the vendor cannot be ordered by the member
    Given vendor V00003 has the QA stock SKU open in «Produk Saya»
    When the vendor marks it out of stock
    And the member searches the catalog for it
    Then the card says "Stok habis · tetap tampil, tidak dapat dipesan"
    And its «Stok habis» button is disabled
    And no «Tambah ke keranjang» is offered
