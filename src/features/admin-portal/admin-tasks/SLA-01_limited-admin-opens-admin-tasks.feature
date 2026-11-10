@priority:P1 @REG-SLA-01 @severity:critical @as-admin-archive-log
Feature: Transaksi › Tugas Admin
  The invoice escalation appears for an Admin without full access and names «SLA Terlampaui» (PMP-673 TC-1.2).
  Read-only: the task is opened, nothing is closed.

  Scenario: [Admin] A non-full-access admin finds and opens the breached vendor-invoice task
    Given an open invoice-creation task that breached its SLA exists for this admin
    When Tugas Admin is searched for that task
    Then its row reads «SLA Terlampaui» for the vendor invoice
    When the task is opened with «Buka»
    Then the task detail names «SLA Terlampaui» and the reference, without «Akses Ditolak»
