@priority:P2 @REG-NOTIF-01 @severity:normal @as-member-maker
Feature: Notifikasi
  The bell shows the unread count and at most the six newest notifications (PMP-746 TC-1.2); the Notifikasi page counts per category.

  Scenario: [Member] The bell opens the notification panel
    Given the Member dashboard is open
    When the member opens the notification bell
    Then the panel shows the unread count from the API and between 1 and 6 notifications

  Scenario: [Member] The Notifikasi page counts notifications per category
    When the member opens the Notifikasi page
    Then every notification category shows a count
    And at least one notification is listed
