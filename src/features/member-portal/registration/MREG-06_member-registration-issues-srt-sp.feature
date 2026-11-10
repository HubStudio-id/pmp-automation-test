@priority:P2 @REG-MREG-06 @severity:critical @as-member-registrant
Feature: Pendaftaran Faskes
  A member registration issues Surat Pernyataan (SRT-SP) with «ID Dokumen» filled and no raw «{{id_dokumen}}»
  (PMP-793). Draft qa+auto-regmember@ «QA-AUTO RS Pendaftaran», never submitted; its profile and one partner are
  written by API each run, and each run issues one SRT-SP.
  The page count is only noted: «two pages» is the Team Lead's retest note (comment 14405), who asked HUB whether the
  fixed «Hal. x dari 2» footers should become page fields; on 10 Nov 2026 the PDF is 3 pages with one partner.

  Scenario: [Member] The registration's Surat Pernyataan is issued with its document ID
    Given the member registration draft has its profile and a partner
    When the Surat Pernyataan is issued
    Then the Surat Pernyataan is issued with its «ID Dokumen» filled
    And the page count is noted against the two pages the Team Lead expects
