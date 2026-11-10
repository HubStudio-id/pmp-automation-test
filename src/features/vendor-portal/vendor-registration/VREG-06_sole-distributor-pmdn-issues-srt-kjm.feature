@priority:P2 @REG-VREG-06 @severity:critical @as-vendor-sole-wizard @wizard-baseline
Feature: Registrasi › Daftarkan perusahaan Anda
  A Sole distributor · Obat · PMDN draft can issue SRT-KJM on one page (PMP-753: it once failed with 422 LETTER_TOO_LONG).
  Draft qa+auto-sole@ «QA-AUTO Sole Distributor PMDN», invited by Admin «Undangan Mendaftar»; never submitted.
  The wizard-baseline hook removes the «NPWP Perusahaan» file first so the upload path runs every time.

  Scenario: [Vendor] A Sole distributor registration issues SRT-KJM on one page
    Given the Sole distributor registration draft is used
    And the registration wizard is open at step 1
    When the company step is filled and saved
    And the legal step is filled and saved
    And the responsible-person step is filled and saved
    And the bank step is filled and saved
    And every incomplete required document is uploaded and the documents step is saved
    And the missing consents are given and the consent step is saved
    And the review is saved
    And SRT-KJM is issued from the template block
    Then every step was saved with HTTP 200
    And no required document is incomplete
    And SRT-KJM is issued on one page with the company name
