@priority:P2 @REG-LIST-01 @severity:normal @as-admin-super
Feature: Transaksi › Invoice + Master › Produk
  Lists show the API total, 25 rows a page, and find a number by its last segment (PMP-60, PMP-306)

  Scenario: [Admin] Invoice shows 25 rows of the API total and a matching pager
    When the Admin Invoice list is opened
    Then the list shows rows 1 to 25 of the API total
    And the pager ends at the last page of the API total

  Scenario: [Admin] An invoice is found by its full number and by its last segment
    Given the Admin Invoice list is opened
    When the list is searched for an invoice's full number
    Then only that invoice is listed, with "1 hasil"
    When the list is searched for the last segment of that number
    Then only that invoice is listed, with "1 hasil"

  Scenario: [Admin] An invoice middle segment or an unknown text gives the empty state, not an error
    Given the Admin Invoice list is opened
    When the list is searched for the middle segment of an invoice number
    Then the list is empty, with "0 hasil"
    When the list is searched for the unknown text
    Then the list is empty, with "0 hasil"

  Scenario: [Admin] Produk footer and pager follow the API total (PMP-60)
    When the Admin product list is opened
    Then the product footer shows 25 of the API total
    And the pager ends at the last page of the API total
