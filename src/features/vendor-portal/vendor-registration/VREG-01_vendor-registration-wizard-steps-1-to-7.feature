@priority:P1 @REG-VREG-01 @severity:blocker @as-vendor-wizard @wizard-baseline
Feature: Registrasi › Daftarkan perusahaan Anda
  Vendor registration wizard on the QA draft, never submitted (PMP-728 AC1: SRT-KJM without «templat SRT-KJM v» or the stamp line).
  Baseline: @wizard-baseline removes the «NPWP Perusahaan» file first, so every run uploads a document; it is uploaded
  back after if the scenario stopped earlier. Consents cannot be withdrawn (no API), so the run checks they are on the draft.

  Scenario: [Vendor] Registration steps 1 to 7 save and SRT-KJM is issued from the current template
    Given the registration wizard is open at step 1
    When the company step is filled and saved
    And the legal step is filled and saved
    And the responsible-person step is filled and saved
    And the bank step is filled and saved
    And every incomplete required document is uploaded and the documents step is saved
    And the missing consents are given and the consent step is saved
    And the review is saved
    And SRT-KJM is issued from the template block
    Then every step was saved with HTTP 200
    And the baseline document was uploaded in this run
    And no required document is incomplete
    And the review step is reached
    And SRT-KJM is issued on one page with the company name
    And SRT-KJM has no "templat SRT-KJM v0.1" marker and no stamp placeholder
