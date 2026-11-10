@priority:P1 @REG-NEG-01 @severity:critical @as-vendor-dist-a @as-admin-super
Feature: Katalog › Negosiasi Saya + Master › Negosiasi
  The vendor's negotiation opens in Admin with the same code; its target card and payload carry no «Pembulatan»
  (PMP-518 TC-450-07-006 and TC-450-07-010).

  Scenario: [Vendor → Admin] The vendor's negotiation opens in Admin with the same code
    Given the vendor's first negotiation code is read from «Negosiasi Saya»
    When that negotiation is opened in Admin Negosiasi
    Then the Admin page shows the same code
    And the Admin page names the vendor QA-DIST Distributor A
    And its target card shows «Target diskon bagian» and no «Pembulatan»
    And the negotiation payload has sections and no rounding value
