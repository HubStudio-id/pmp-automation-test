@priority:P1 @REG-AUTH-02 @severity:critical @sign-in-form
Feature: Menu akun › Keluar
  Member logout ends the session even with «Ingat saya». Vendor side: vendor/login/AUTH-02.

  @sign-ins-1
  Scenario: [Member] Logout with «Ingat saya» does not restore the session
    Given the "member-maker" member has signed in with «Ingat saya»
    And the member session tokens are noted
    When the member signs out
    And the Member cart page is opened
    Then the Member sign-in page is shown
    And the old access token is refused with 401
    And the remember token can no longer refresh the session
