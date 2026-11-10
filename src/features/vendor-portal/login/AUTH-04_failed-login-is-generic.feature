@priority:P2 @REG-AUTH-04 @severity:normal
Feature: Login › Login gagal
  Failed sign-in is generic (PMP-743). Member side (Help Desk guide): member/login/AUTH-04.

  @sign-in-form @sign-ins-1
  Scenario: [Vendor] A wrong sign-in does not reveal whether the e-mail exists
    When an unknown e-mail signs in to the Vendor portal with a wrong password
    Then a generic sign-in error is shown
    And no message says whether the e-mail exists
    And the Vendor sign-in page is still shown
