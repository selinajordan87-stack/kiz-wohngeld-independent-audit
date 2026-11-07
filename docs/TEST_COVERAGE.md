# Prüfbereiche und Grenzen

Pro Version sind 25 unveränderte Testdateien mit 1.103 Einzeltests enthalten. Sie decken Einkommensregeln, Bereinigung, Kinder-/Elternbedarf, Vermögen, Bedarfsdeckung, Endrundung, Wohngeldhaushalt, Miete, Einkommen und Formel ab. `end-to-end-tests.js` bezeichnet eine vollständige fachliche Aufrufkette; es ist kein Browser-End-to-End-Test.

| Prüfbereich | Neu ausführbare synthetische Fälle | Unabhängig zu klärender Sollmaßstab |
|---|---|---|
| Erwerbseinkommen/Freibeträge | `jobrad-A`, `partner-income`, `salary-correction` | Staffelung, tatsächliche Pflichtabzüge, Monatsbereinigung |
| Krankengeld/ALG I | `sick-net`, `alg-net`, `mixed-income` | Nettozufluss, monatliche Pauschalen, kein doppelter SV-Abzug |
| Minijob/Midijob | `minijob`, `payroll-*` | Steuerüberwälzung, RV-Befreiung, Beitragssätze/Jahr; 2027-Netto im Modul offen |
| Nachzahlung/Einmalzahlung/Weihnachtsgeld | `arrears-early`, `arrears-late`, `bonus-receipt` | Rechtskonforme Zuordnung/Verteilung vor Übergabe der sechs Monatswerte |
| Gehaltskorrektur | `salary-correction` | Zugehöriger Abrechnungszeitraum und tatsächlicher Zufluss |
| Pfändung | `garnishment` | Kein automatischer Abzug im Fall; rechtliche Verfügbarkeit und Titel fehlen absichtlich |
| Jobrad | `jobrad-A` bis `jobrad-D`, `jobrad-double-deduction`, `jobrad-market-value-sensitivity` | Steuerwert und SGB-II-Verkehrswert getrennt ermitteln |
| Ein/mehrere Kinder | `one-child`, `child-income`, `single-parent` | Kindereinkommen, Mehrbedarf, Regelstufe |
| Wechselmodell/Kindergeld | `parity`, `parity-forwarded`, `asymmetric` | KiZ-Kindergeldbezug versus temporäre BG versus § 5 WoGG |
| Patchwork/Partnereinkommen | `patchwork`, `partner-income` | Empfängerzuordnung, Minderung, Auszahlungsrundung |
| Wohngeld | `wg-rent-cap`, `wg-member-excluded`, `income-to-forecast` | Bruttokaltmiete, Grenzen, Komponenten und getrennte Prognose |
| Antrag/BWZ/BG-Änderung | `application-2026-*`, `finance-matrix`, `finance-household-change` | Bestehender Antrag ist kein frei austauschbarer Szenarioparameter |
| Jahreswechsel | `year-2027-boundary`, `payroll-midi-2027` | Bewusste Diagnosefälle; kein rechtlich bestätigtes 2027-Ergebnis |

Neue Adaptertests sichern Integrität, Ausführbarkeit, Versionsisolation, unveränderte Eingaben, B=C und die Erkennung widersprüchlicher Metadaten. Sie sind keine neue rechtliche Berechnungsreferenz. `reports/synthetic-observations.json` listet jeden tatsächlich durchlaufenen Fall und beide Versionen.

Bewusst nicht exportiert: private Preset-/Bescheidtests und Tests, die deren Harness importieren; UI-, Layout-, Navigations-, Browser- und öffentlicher Build-Tests, die ohne die aus Datenschutzgründen ausgeschlossene Anwendung nicht laufen. Ihre Dateien und Ausschlussgründe stehen im Inventar. Ausgelassene Tests wurden nicht als bestanden gezählt.

Offen bleiben der echte historische Bescheid, vollständige Lohnbelege, Pfändungstitel, die originale Familienkassenberechnung und eine unabhängige amtliche Sollrechnung für alle Fälle. Keine echten Personen- oder Monatsledger wurden als „synthetisch“ umbenannt.
