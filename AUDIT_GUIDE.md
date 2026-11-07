# Auftrag für unabhängige Prüfer

Ziel: Fehler reproduzieren und zwischen Eingabe-, Programm- und Rechtsfehlern unterscheiden. **Nicht korrigieren, nichts veröffentlichen, nicht an einen Zielbetrag anpassen.** Jede Behauptung mit Quelle, Rechtsdatum und reproduzierbarem Fall belegen.

## Einstieg in 10 Minuten

1. README lesen, `npm test` und `npm run verify` ausführen.
2. `docs/specifications/<version>/CALCULATION_SPEC.md` mit dem tatsächlichen Code vergleichen. Deren Statuswörter „bestätigt“ oder „getestet“ sind Aussagen des Originalprojekts, keine unabhängigen Nachweise.
3. `node audit/run-case.js --version main --input cases/jobrad-A.json --output outputs/probe.json` ausführen. Der Adapter erstellt das Ausgabe-Verzeichnis selbst.
4. `node audit/compare.js --input cases/jobrad-B.json` zum Versionsvergleich benutzen.
5. Neue synthetische Fälle erstellen und die vollständigen Zwischenrechnungen prüfen. Rechtsstand je Fall festlegen, keine Parameter verschiedener Jahre mischen.

## Architektur und Einstiegspunkte

| Datei | Einstieg / Aufgabe |
|---|---|
| `calculator.js` | `calculateKinderzuschlag(state, validation)`; `evaluateAdultIncomeForHousehold`, `evaluateParentNeedForHousehold`, `evaluateParentIncomeReduction`, `evaluateFamilySgbIINeed`, `evaluateCoverage` |
| `calculation-rules.js` | Regelregister, Quellenverweise und Strukturentscheidungen |
| `wohngeld.js` | `evaluateWohngeld(household, children, context)`; Haushalt, Miete, Einkommen, Formel |
| `wohngeld-data.js` | Mietobergrenzen, Klimakomponente, Heizkostenentlastung und Formelkoeffizienten |
| `validation.js`, `ux-relevance.js` | Eingabeprüfung und fachliche Relevanz |
| `parent-need-data.js` | Datenstruktur, Standardwerte und Migrationen |
| `ux-income-forecast.js` | Übernahme/Normalisierung aus laufenden Einkommensangaben in die Wohngeldprognose |
| `scenario-comparison.js` | Zustandsaufbau und bestehende Szenariofunktionen, teils globale Abhängigkeiten |
| `finance-payroll.js` | Nur `finance`: `grossForMonth`, `calculate` |
| `finance-scenarios.js` | Nur `finance`: `createPlan`, `incomeAt`, `buildKizState`, `buildWohngeldState`, `runMatrix` |

`audit/` ist ein neuer Aufruf- und Beobachtungsadapter. Er enthält keine zweite Leistungsformel. Für beide Versionen werden getrennte Prozesse verwendet. Tests unter `snapshots/` sind unverändert ausgewählte Originaltests. Neue synthetische Fälle stehen unter `cases/`; vorhandene Prüfbeobachtungen unter `reports/`.

## Bekannte offene Fragen, noch keine abschließenden Fehlerbefunde

- **Jobrad:** keine eigenen Felder oder spezifische Klassifizierung im Kern und in den untersuchten ursprünglichen Eingabeformularen gefunden. Unterschiedliche Bruttobegriffe und Sachbezugsbewertung können nicht getrennt eingegeben werden. B/C müssen gleich bleiben; D wird erst durch den externen Metadatenprüfer auffällig, nicht durch die ursprüngliche Validierung.
- **Pfändung:** keine spezielle, beleggebundene Pfändungslogik gefunden. Rechtsgrund, Verfügbarkeit, tatsächliche Zuflüsse und bereits enthaltene Abzüge prüfen. Keine generelle Abziehbarkeit unterstellen.
- **Wechselmodell:** KiZ-Kindergeldbezug, temporäre SGB-II-Zuordnung und Wohngeldhaushalt getrennt prüfen; auch Kind ohne eigenen Kindergeldbezug. Veraltete `halfForwarded`-Werte nach Betreuungswechseln gezielt nachstellen. Dieser Rechenkernexport testet die UI-Ereignisfolge nicht.
- **Einkommensbereinigung:** Monatsabzüge vor Durchschnittsbildung, Freibeträge bei gemischten Einkommensarten, Netto-Krankengeld ohne doppelte SV-Abzüge, Grenz- und Rundungsfälle prüfen.
- **Nachzahlungen:** Leistungsmonat, Abrechnungsmonat und Zuflussmonat trennen. Der Grundkern bekommt sechs Monatswerte; er hat keinen vollständigen Belegimport, der alle Nachzahlungsregeln selbst entscheidet.
- **Bedarfsdeckung:** temporäre BG mit nicht KiZ-berechtigten Kindern, Kindergeldüberschuss, erweiterter Zugang und Wohngeld dürfen nicht aus einer bloßen Zwischen-KiZ-Höhe abgeleitet werden.
- **Zeitrecht:** gemeinsamer KiZ-Kern nutzt feste 2026-Werte. Wohngeldtabellen sind als 2025/2026 gekennzeichnet. Finanzmodul weist 2027 teilweise als offen aus. 2025-Einkommensmonate einer 2026-Bewilligung benötigen ihre jeweils geltenden Bereinigungsregeln.
- **Verfahrenslage:** September-Antrag, Ablehnung/Rücknahme, tatsächliche BG-Änderung und bloßer gemeinsamer Umzug unterscheiden. Automatisch erzeugte BWZ-Pläne sind keine verbindliche Rechtsbewertung.
- **Wohngeld:** `resolveMietstufe()` ist nicht implementiert. Amtliche Mietstufe muss als belegte Eingabe kommen. Jahresprognose, rückwirkende Änderungen und Bescheidaufhebung erfordern zusätzliche Verfahrensdaten.
- **Lohn:** Modul enthält keine vollständige Lohnsteuerberechnung; Steuerbeträge kommen als Eingaben. 2027-Midijob-Netto wird nicht abschließend berechnet. Sonderfälle (Mehrfachbeschäftigung, Studierende, Krankengeld während Leasing usw.) unabhängig prüfen.

## Arbeitsteilung zwischen KI-Systemen

- **Claude:** Importgraph, alle Formeln und Datenpfade prüfen; kleine reproduzierbare Fehlerfälle erstellen; beide Snapshots getrennt vergleichen.
- **ChatGPT Work:** unabhängig von vorhandenen Endwerten Zwischenrechnungen und später das nur privat bereitgestellte historische Referenzpaket prüfen. Fehlende Bescheid-/Abrechnungsdaten ausdrücklich ausweisen.
- **Gemini:** zweite unabhängige Berechnung ausgewählter Grenz-, Wechselmodell- und Jobrad-Fälle; Abweichungen zwischen Implementierung und Sollregel lokalisieren.
- **Perplexity:** amtliche Primärquellen und zeitlich richtige Fassungen recherchieren, besonders Jobrad/Sachbezug, Pfändung und Antragsverfahren; Datum und genaue Fundstelle nennen.

## Format eines Befunds

Fall-ID, Version und Commit; unveränderte Eingabe-JSON; Befehl; tatsächlicher Wert und Zwischenwerte; unabhängig ermittelter Sollwert oder ausdrücklich offene Rechtsfrage; Quelle mit Paragraph/Abschnitt und Gültigkeit; Ursache und Sicherheit des Befunds. Kategorien:

1. **Eingabefehler:** falscher Bruttobegriff, doppelt erfasster Sachbezug, nicht belegter Zufluss oder falscher Haushalt.
2. **Programmfehler:** korrekt erfasste Eingabe, implementierte Regel wird falsch ausgeführt.
3. **Rechtsfehler:** Code folgt seiner Spezifikation, Spezifikation oder Jahresparameter widersprechen dem maßgeblichen Recht.
4. **Abdeckungslücke:** notwendiger Sachverhalt wird nicht dargestellt oder bleibt offen.

Kein Fehler allein deshalb, weil eine zulässig offene Berechnung `UNRESOLVED` liefert. Umgekehrt beweist ein konkreter Eurobetrag keine fachliche Richtigkeit. Amtliche Quellen: [LEGAL_SOURCES.md](docs/LEGAL_SOURCES.md).
