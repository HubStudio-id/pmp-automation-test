@priority:P2 @REG-MREG-03 @severity:normal @as-admin-super
Feature: Master › Member › Undang faskes
  «Undang faskes» offers both invitation types and states the validity configured in Standar Operasional (PMP-673 TC-1.6). The dialog is not sent.

  Scenario: [Admin] «Undang faskes» offers two invitation types valid for the configured working days
    Given the Admin member list is opened
    When the «Undang faskes» dialog is opened
    Then the dialog offers "Undangan Aktivasi" and "Undangan Mendaftar"
    And the dialog states the facility-invitation validity configured in Standar Operasional
