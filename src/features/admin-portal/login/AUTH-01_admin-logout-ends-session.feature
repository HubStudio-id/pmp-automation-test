@priority:P1 @REG-AUTH-01 @severity:critical @sign-in-form
Feature: Menu akun › Keluar
  Admin logout ends the session
  An admin who did not tick «Ingat saya» stays signed out after «Keluar».

  @sign-ins-1
  Scenario: [Admin] Logout without «Ingat saya» keeps the admin signed out
    Given the "admin-config-view" admin has signed in without «Ingat saya»
    And the admin session tokens are noted
    When the admin signs out
    And the Admin portal is opened again
    Then the Admin sign-in page is shown
    And the old access token is refused with 401
