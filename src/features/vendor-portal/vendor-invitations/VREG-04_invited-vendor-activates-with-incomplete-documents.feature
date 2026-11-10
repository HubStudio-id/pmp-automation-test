@priority:P2 @REG-VREG-04 @severity:critical @account-create @as-admin-super @archive-invited @sign-ins-1
Feature: Master › Registrasi Vendor › Undang vendor
  Activation-invited vendor signs in with incomplete documents
  Creates a new QA vendor account each run (random password) and archives it after (@archive-invited); vendors
  cannot be deleted. Runs in the sign-in phase (@account-create), one at a time, because it signs in.

  Scenario: [Admin → Vendor] The invited vendor activates, signs in and sees the 30-day deadline
    Given a free AX creditor code is found
    When a new QA distributor is invited with «Undangan Aktivasi»
    And the activation link from the invitation e-mail is opened without a vendor session
    And the vendor sets a new password and activates the account
    And the vendor signs in with the new account
    Then the invitation was created with HTTP 201
    And the activation and the sign-in answered HTTP 200
    And the notice "Berkas wajib belum lengkap" is shown
    And the deadline reads "Sisa 30 hari"
