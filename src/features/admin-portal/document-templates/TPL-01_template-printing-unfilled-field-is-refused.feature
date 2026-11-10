@priority:P2 @REG-TPL-01 @severity:normal @as-admin-super @restore-template
Feature: Konfigurasi › Template Dokumen
  «Unggah versi baru» refuses a letter template that prints a field its letter never fills (PMP-792, fixed by Core PR #414;
  retest PASS 10 Nov 2026, PMP-515 comment 15204): SRT-SKK with an extra «{{nama_faskes}}» in the letter body. Nothing is
  stored; @restore-template puts the original file back only if a version was stored anyway.
  The field goes next to «{{nib}}» in the body. The «KETERANGAN BIDANG ISIAN» legend page at the end of the file is never
  scanned or published, so a field placed there is rightly accepted (the false red this case showed until 10 Nov 2026).

  Scenario: [Admin] A letter version with a field the letter never fills is refused and nothing changes (PMP-792)
    Given the active file of the QA letter template is downloaded
    When a new version that prints a field the letter never fills is uploaded
    Then the upload is refused because the letter cannot render
    And the active version of the template is unchanged
