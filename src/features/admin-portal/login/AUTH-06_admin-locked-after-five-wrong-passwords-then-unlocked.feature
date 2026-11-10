@priority:P2 @REG-AUTH-06 @severity:critical @sign-in-lockout @sign-ins-5 @as-admin-super @unlock-lockable
Feature: Manajemen Pengguna › Admin › Detail Admin › Buka Kunci Akun
  Five wrong passwords lock an admin, Super Admin unlocks

  Scenario: [Admin] The lockable QA admin is locked after five wrong passwords and unlocked by Super Admin
    When five wrong passwords are sent for the lockable admin
    Then every attempt is refused with the generic login error
    And the lockable admin shows an automatic lock
    When the Super Admin unlocks the lockable admin
    Then the lockable admin is no longer locked
