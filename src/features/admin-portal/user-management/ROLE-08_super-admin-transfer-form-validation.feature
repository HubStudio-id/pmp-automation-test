@priority:P2 @REG-ROLE-08 @severity:normal @as-admin-super
Feature: Manajemen Pengguna › Admin › Detail Admin › Alihkan Super Admin
  A Super Admin cannot be locked or deactivated; the seat only moves with «Alihkan Super Admin» (PMP-669 TC-2.1).
  Read-only: the transfer dialog is cancelled, never confirmed.

  Scenario: [Admin] A Super Admin's detail offers «Alihkan Super Admin» but no lock or deactivation
    Given an ordinary admin's detail offers «Kunci Akun»
    When the detail of the QA Super Admin is open
    Then it offers «Alihkan Super Admin» and no «Kunci Akun» or «Nonaktifkan & arsipkan»

  Scenario: [Admin] The transfer dialog keeps the reason at 500 characters and stays unconfirmed when incomplete
    Given the detail of the QA Super Admin is open
    When the «Alihkan Super Admin» dialog is opened
    And a wrong confirmation e-mail and a 510-character reason are typed
    Then «Konfirmasi» is disabled
    And the reason keeps at most 500 characters
    And cancelling closes the dialog
