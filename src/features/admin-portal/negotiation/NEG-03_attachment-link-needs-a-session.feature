@priority:P2 @REG-NEG-03 @severity:critical @as-admin-super
Feature: Master › Negosiasi
  A message attachment is served through the portal API with the session, not as an open storage link (PMP-732).
  Read-only: it reads the attachments of the QA negotiation of the NEG-02 fixture.

  Scenario: [Admin] A negotiation attachment opens only with a signed-in session
    When the attachments of the QA negotiation are listed
    Then the attachment link is a portal API path, not a storage URL
    And the attachment opens with the admin session
    And the attachment is refused without a session
