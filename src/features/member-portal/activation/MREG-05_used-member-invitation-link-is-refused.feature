@priority:P2 @REG-MREG-05 @severity:critical
Feature: Aktivasi
  A used member invitation link is refused in the Member portal (PMP-608). Vendor side: vendor/activation/MREG-05.

  # Uses the invitation e-mail of the member-maker account, accepted on 6 Nov 2026. Every submit below is refused
  # (HTTP 422), so nothing changes on staging.

  Background:
    Given the used invitation link of the member-maker account

  Scenario: [Member] A used invitation link is reported as already used, with only «Masuk»
    When the link is submitted with a new password in the Member portal
    Then the activation is refused with "INVITATION_ALREADY_USED"
    And the message "Tautan undangan sudah digunakan" is shown
    And only «Masuk» is offered, without «Kirim ulang»

  Scenario: [Member] A changed invitation token is invalid, not "already used"
    When the link with a changed token is submitted in the Member portal
    Then the activation is refused with "INVALID_TOKEN"
    And the message "Tautan undangan tidak berlaku" is shown
