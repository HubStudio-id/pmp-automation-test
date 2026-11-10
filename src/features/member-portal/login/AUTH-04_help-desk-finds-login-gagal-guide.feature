@priority:P2 @REG-AUTH-04 @severity:normal
Feature: Login › Login gagal
  The sign-in guide can be found in Help Desk (PMP-743). Vendor side (generic error): vendor/login/AUTH-04.

  @as-member-super
  Scenario: [Member] Help Desk finds the sign-in guide for «Login gagal»
    Given the Member Help Desk is open
    When the member searches Help Desk for "Login gagal"
    Then at least one Help Desk topic is found
    And the Help Desk topic "Keamanan akun dan passkey" is listed
