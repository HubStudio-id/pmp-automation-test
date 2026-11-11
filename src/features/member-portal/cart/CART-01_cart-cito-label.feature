@priority:P1 @REG-CART-01 @severity:critical @as-member-super @empty-cart
Feature: Pembelian › Buat Pesanan › Keranjang › Cito
  Cito label in the member cart (never submitted)

  Scenario: [Member] Cito needs a condition, shows the served SLA and is counted (PMP-835 group label)
    Given the QA cart product is in the member cart
    And the distributor group label is noted
    When the member marks the line as Cito
    And the Cito condition is entered and saved
    Then the Cito dialog showed the served Cito SLA
    And «Simpan label Cito» was disabled before the condition
    And the footer reads "1 item Cito · SLA pengantaran Cito <n> hari"
    And the summary counts "1 Cito"
    And the group read «Tidak ada Cito» before any line was Cito (PMP-835)
