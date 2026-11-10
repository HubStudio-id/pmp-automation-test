@priority:P2 @REG-MREG-05 @severity:critical
Feature: Aktivasi
  A member invitation link is not accepted by the Vendor portal (PMP-608). Member side: member/activation/MREG-05.

  # Uses the invitation e-mail of the member-maker account, accepted on 6 Nov 2026. The submit is refused
  # (HTTP 422), so nothing changes on staging.

  Background:
    Given the used invitation link of the member-maker account

  Scenario: [Vendor] A member invitation link is not accepted
    When the link is submitted with a new password in the Vendor portal
    Then the activation is refused with "INVALID_TOKEN"
    And the message "Undangan tidak berlaku lagi" is shown
