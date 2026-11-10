@priority:P1 @REG-AUTH-02 @severity:critical @sign-in-form
Feature: Menu akun › Keluar
  Vendor logout ends the session even with «Ingat saya». Member side: member/login/AUTH-02.

  @sign-ins-1
  Scenario: [Vendor] Logout with «Ingat saya» does not restore the session
    Given the "vendor-bmhp-alkes" vendor has signed in with «Ingat saya»
    And the vendor session tokens are noted
    When the vendor signs out
    And the Vendor dashboard is opened
    Then the Vendor sign-in page is shown
    And the old access token is refused with 401
    And the remember token can no longer refresh the session
