@priority:P2 @REG-VREG-05 @severity:normal
Feature: Master › Registrasi Vendor › Kontrak
  Generated letters use the current templates (PMP-728, PMP-829, PMP-675).
  This scenario is read-only: it checks the reserved latest PKS fixture without creating another version.

  # SRT-KJM is covered by REG-VREG-01.

  @as-admin-super
  Scenario: [Admin] The latest PKS draft has the current Lampiran 3 and the agreement title of its product type
    When the latest PKS draft for the QA contract is read
    Then the latest PKS version is available
    And its Lampiran 3 has no "templat LAMP-3 v0.1" marker and no stamp placeholder
    And its PKS-KOMP is headed by the agreement title, then the body title of the contract's product type
