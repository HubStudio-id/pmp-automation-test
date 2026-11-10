@priority:P2 @REG-AUTH-05 @severity:normal @as-member-super
Feature: Menu akun
  The account menu opens inside the viewport at 375 px and at desktop width (PMP-729 AC1).

  Scenario Outline: [Member] The account menu opens inside a <width> px screen
    Given the screen is <width> px wide
    And the Member dashboard is open
    When the member opens the account menu
    Then "Profil Saya", "Pengaturan" and "Keluar" lie entirely inside the screen

    Examples:
      | width |
      | 375   |
      | 1280  |
