@priority:P2 @REG-ARC-01 @severity:normal @as-admin-super
Feature: Audit › Arsip
  Arsip

  Scenario: [Admin] Every Arsip tab loads with its count
    When the Arsip page is opened
    Then every Arsip tab shows a count

  Scenario: [Admin] A cancelled admin invitation that was never accepted cannot be restored
    Given the Arsip page is opened
    When the Admin tab is shown
    Then a cancelled admin invitation offers no «Pulihkan»
