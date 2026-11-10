@priority:P1 @REG-DASH-01 @severity:normal @as-admin-config-view
Feature: Utama › Dasbor Utama
  Dasbor Utama

  Scenario: [Admin] Every Dasbor Utama block is shown and widgets cannot be rearranged
    When the Admin dashboard is opened
    Then these dashboard blocks are shown:
      | Tugas saya              |
      | Antrean per modul       |
      | SLA terlampaui (7 hari) |
      | Aktivitas terbaru       |
    And no "Atur widget" button is offered
