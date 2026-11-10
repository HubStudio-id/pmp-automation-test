@priority:P2 @REG-NEG-02 @severity:normal @as-vendor-dist-a
Feature: Katalog › Negosiasi Saya
  The attachment limit is 10 MB (10 485 760 bytes): a file at the limit is sent, one byte more is refused (PMP-731).
  Writes one message with a 10 MB PDF on the reserved QA negotiation NEG-2026-0036 per run; messages cannot be deleted.

  Scenario: [Vendor] A PDF of exactly 10 MB is sent in the negotiation chat
    Given the QA negotiation room is open in «Negosiasi Saya»
    When a message with a PDF of exactly 10 MB is sent
    Then the message is accepted with its attachment

  Scenario: [Vendor] A PDF one byte over 10 MB is refused before sending
    Given the QA negotiation room is open in «Negosiasi Saya»
    When a PDF one byte over 10 MB is attached
    Then the size alert is shown and nothing is sent
