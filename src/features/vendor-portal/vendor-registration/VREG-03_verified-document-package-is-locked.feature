@priority:P2 @REG-VREG-03 @severity:normal @as-vendor-dist-a
Feature: Registrasi › Pengajuan Berkas
  Verified vendor document package

  Scenario: [Vendor] A verified document package is locked and cannot be submitted again
    When the vendor opens «Pengajuan Berkas»
    Then the notice "Berkas telah diajukan" is shown
    And «Ajukan Berkas» is disabled
    And the document statuses "Terverifikasi" and "Belum diunggah" are shown
