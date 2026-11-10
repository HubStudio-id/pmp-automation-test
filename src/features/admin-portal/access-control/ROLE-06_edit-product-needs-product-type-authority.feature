@priority:P2 @REG-ROLE-06 @severity:critical @as-admin-product-no-contract
Feature: Master › Produk › Edit Produk
  Product-type authority on «Edit Produk» (PMP-736)

  Scenario: [Admin] A role without authority for the product type gets no «Edit Produk»
    When the admin searches Master › Produk for the QA product without type authority
    Then the product can be viewed
    And «Edit Produk» is not offered for it
