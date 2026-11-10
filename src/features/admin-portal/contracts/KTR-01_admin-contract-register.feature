@priority:P1 @REG-KTR-01 @severity:critical @as-admin-super
Feature: Master › Kontrak
  An Aktif contract past its end date keeps the stored status «PKS Aktif» and is not made «Berakhir» (PMP-666 TC-1.1).
  The «Masa berlaku telah berakhir» badge is expected only after PMP-540 ships (In Development on 10 Nov 2026).

  Scenario: [Admin] A contract past its end date still reads «PKS Aktif» in the register
    Given an Aktif contract past its end date exists
    When the Admin contract register is searched for it
    Then its row keeps the stored status «PKS Aktif» and is not «Berakhir»
