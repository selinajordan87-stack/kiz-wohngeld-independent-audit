<!-- Dokumentationskopie mit ausschließlich protokollierten Datenschutz-Schwärzungen. Keine unveränderte Originaldatei. -->
# Verbindliche fachliche Rechenspezifikation

Diese Datei ist die verbindliche fachliche Spezifikation für die Kinderzuschlags-Berechnung.

Keine Rechenregel darf in `calculator.js` implementiert werden, wenn sie nicht zuvor in `CALCULATION_SPEC.md` dokumentiert wurde. Offene oder ungeklärte Punkte dürfen nicht durch Annahmen ersetzt werden.

`SPEC.md` beschreibt Produktumfang, Datenmodell, Benutzeroberfläche und Validierung. `CALCULATION_SPEC.md` beschreibt ausschließlich den fachlichen Rechenkern, seine geplanten Ein- und Ausgaben, Regel-IDs, Quellen und Berechnungstests.

## Private Szenario-Labor: ausdrückliche Nicht-Regel

`KIZ-SCENARIO-001` bleibt `OFFEN`. Das private Labor führt keine neue KiZ- oder Wohngeldformel ein: A und B laufen als tiefe State-Kopien durch die bestehenden Produktionsmodule. Jobquellen werden nur als normale Einkommensquellen mit ausdrücklich eingegebenem Betrag, Betragstyp und erforderlichen Status-/Abzugsfeldern ersetzt oder ergänzt. Die Wohngeld-Prognose ist ein separater normaler `incomeForecast`-Eintrag mit eigener Quell-ID; beim Ersatz wird die alte Quelle nicht zusätzlich behalten.

Wochenstunden sind ausschließlich informative Szenario-Metadaten und werden nicht in Geld oder Leistungswerte umgerechnet. Das Szenario besitzt keine Zeitachse, kein Startdatum und keine Übergangsmonate. Eine zukünftige Datumsphase ist fachlich offen und darf nicht implementiert werden. Eine Brutto-Netto-Umrechnung sowie eine Addition von Einkommen zu KiZ/Wohngeld sind ausdrücklich ausgeschlossen.

[DATENSCHUTZ: Zahlenfolge einer privaten Regression entfernt; keine fachliche Berechnungsregel entfernt.]

## Verbindlichkeit und Statusmodell

Jede Rechenregel enthält:

- eine stabile Regel-ID
- eine verständliche Bezeichnung
- Status, Zweck und benötigte Eingaben
- eine fachliche Regel oder eine ausdrückliche Offen-Markierung
- das geplante Ergebnis
- bekannte Sonderfälle
- Quelle und Quellenstand
- mindestens einen geplanten Testfall

Zulässige Statuswerte:

- `OFFEN`: Es liegt noch keine ausreichend bestimmte fachliche Regel vor.
- `ZU PRÜFEN`: Eine Aussage ist im Produktstand dokumentiert, muss aber fachlich oder anhand der Primärquelle präzisiert werden. Keine Implementierung erlaubt.
- `BESTÄTIGT`: Regel, Quelle und technische Bedeutung sind fachlich freigegeben.
- `IMPLEMENTIERT`: Eine bestätigte Regel wurde mit ihrer Regel-ID im Rechenkern umgesetzt.
- `GETESTET`: Die implementierte Regel besitzt bestandene automatisierte Normal-, Grenz- und soweit erforderlich Sonderfalltests.

Eine Regel darf nur in der Reihenfolge `OFFEN`/`ZU PRÜFEN` → `BESTÄTIGT` → `IMPLEMENTIERT` → `GETESTET` fortgeschrieben werden. Eine Statusänderung muss nachvollziehbar dokumentiert werden.

## Abgrenzung des aktuellen Stands

Diese Datei strukturiert Phase 3 und die darauf aufbauenden Phasen bis D9. D1.5 bereinigt unterstütztes Kindeseinkommen monatsweise, D2 ermittelt die kindbezogene 45-Prozent-Minderung, D3 den getrennten Elternbedarf und D4 den Kinder-/Familien-SGB-II-Bedarf einschließlich BG-Mitgliedschaften. D5 bereinigt häufige Standardfälle des Erwachsenen-Einkommens je Person und Monat, D6 mindert den Gesamtkinderzuschlag durch Elterneinkommen, D7 integriert bestätigte Kindes- und Elternvermögensfälle und D8A prüft die Bedarfsdeckung. D8B1 bereitet die eigenständigen Wohngeld-Bemessungsgrundlagen vor, D8B2 berechnet den mathematischen Wohngeldbetrag und D8B3 integriert ihn kontrolliert als fiktiven Coverage-Wert. D9 orchestriert diese Stufen, trifft für vollständig unterstützte Standardfälle die Anspruchsentscheidung und rundet den endgültigen Monatsbetrag. Weiterhin nicht freigegeben sind komplexe Wohngeldsonderfälle einschließlich der vollständigen Prüfungen nach § 20 und § 21 Nummer 3, vollständiges Coverage-Vermögen, weitere dokumentierte Einkommens-, §-26-, Patchwork- und Vermögenssonderfälle sowie ein unbekannter zukünftiger Regelstand 2027.

Die in `SPEC.md` genannten Werte für 2026 sind dokumentierter Produktstand:

- Kindergeld: 259 €
- maximaler Kinderzuschlag: 297 € je Kind

Die Herkunft, zeitliche Anwendbarkeit und konkrete Verwendung dieser Werte im Rechenkern sind noch anhand der vorgesehenen Primärquellen zu bestätigen. Aus den Werten wird in Phase 3 keine Formel abgeleitet.

## Vorläufige Rechenpipeline

Die folgende Reihenfolge ist eine Arbeitsstruktur und noch keine fachlich bestätigte Berechnungsreihenfolge. Änderungen der Reihenfolge müssen später mit betroffenen Regel-IDs dokumentiert werden.

1. Eingabedaten mit `validation.js` validieren.
2. Relevante Haushalte bestimmen.
3. Relevante Kinder pro Haushalt bestimmen.
4. Kinder mit eigenem möglichem KiZ-Anspruch bestimmen.
5. Kindergeldbezug pro Kind bestimmen.
6. Sechsmonatige Einkommensdaten aufbereiten.
7. Einkommen erwachsener Personen kategorisieren.
8. Einkommen von Kindern kategorisieren.
9. Mögliche Abzüge und Ausgaben aufbereiten.
10. Maßgebliches Einkommen bestimmen.
11. Mindesteinkommensgrenze prüfen.
12. Bedarfe der Erwachsenen bestimmen.
13. Bedarfe der Kinder bestimmen.
14. Wohnkosten zuordnen.
15. Mehrbedarfe berücksichtigen.
16. Maximal möglichen Kinderzuschlag pro Kind bestimmen.
17. Kindeseinkommen berücksichtigen.
18. Elterneinkommen berücksichtigen.
19. Möglichen Kinderzuschlag je Kind bestimmen.
20. Mögliche Aufteilung nach kindergeldberechtigter Person bestimmen.
21. Bedarfsdeckungscheck durchführen.
22. Wohngeld berücksichtigen.
23. Ergebnis pro Haushalt bestimmen.
24. Ergebnisse beider Haushalte vergleichen.
25. Alternative Kindergeldverteilungen als Szenarien berechnen.
26. Rechenprotokoll erzeugen.

## Quellenregister

Es werden nur Quellenbezüge übernommen, die in `SPEC.md` genannt oder für eine dokumentierte Regel fachlich geprüft wurden. Seit Phase D1 werden verifizierte amtliche Fundstellen als URL ergänzt; ungeprüfte Quellen bleiben ausdrücklich offen.

| Quellen-ID | Titel / Rechtsgrundlage | Stand | Status | Zugeordnete Regel-IDs |
|---|---|---|---|---|
| `SRC-PRODUCT-SPEC-2026` | Interne Produktspezifikation `SPEC.md` | 2026 | dokumentierter Projektstand, keine Primärquelle | alle Regelgruppen als Abgrenzung |
| `SRC-SGBV-47-1` | § 47 Absatz 1 SGB V, amtliche Fassung unter `https://www.gesetze-im-internet.de/sgb_5/__47.html` | Rechtsstand und Abruf 05.09.2026 | Primärquelle für die kalendertägliche Krankengeldbemessung und den 30-Tage-Wert eines vollen Kalendermonats | `KIZ-SICK-PAY-INPUT-001` |
| `SRC-WOGG-2026` | Wohngeldgesetz, amtliche Fassung unter `https://www.gesetze-im-internet.de/wogg/`; geprüft wurden insbesondere §§ 3, 5 bis 21 und Anlagen 1 bis 3 | Rechtsstand und Abruf 15.08.2026 | Primärquelle für Wohngeldberechtigung, Haushaltsmitglieder, Ausschluss, Miete/Belastung, Prognose-Jahreseinkommen, Freibeträge, Unterhaltsabzüge und den mathematischen Wohngeldbetrag | `WG-HOUSEHOLD-001`, `WG-INCOME-001`, `WG-RENT-001`, `WG-OWNER-BURDEN-001`, `WG-FOUNDATION-001`, `WG-AMOUNT-001` |
| `SRC-WOGV-2026` | Wohngeldverordnung, amtliche Fassung unter `https://www.gesetze-im-internet.de/wogv/`; geprüft wurden insbesondere §§ 2 bis 15 | Rechtsstand und Abruf 15.08.2026 | Primärquelle für Mietabgrenzung und Lastenberechnung; Standardfall mit Kapitaldienst und 36-EUR-Bewirtschaftungspauschale | `WG-RENT-001`, `WG-OWNER-BURDEN-001`, `WG-FOUNDATION-001` |
| `SRC-ESTG-2-9-9A-2026` | §§ 2, 9 und 9a EStG, amtliche Fassung unter `https://www.gesetze-im-internet.de/estg/` | Rechtsstand und Abruf 15.08.2026 | Steuerrechtlicher Einkunftsbezug des § 14 WoGG und Arbeitnehmer-Pauschbetrag von 1.230 EUR | `WG-INCOME-001` |
| `SRC-DA-KIZ-2026-02-20` | Durchführungsanweisung Kinderzuschlag (DA-KiZ), Bundesagentur für Arbeit / Familienkasse Direktion FB13, `https://www.arbeitsagentur.de/datei/fw-bkgg_ba013284.pdf`; verwendet insbesondere: B.1.1, B.2, B.3, C.1 bis C.4, E.1, E.2 und E.5 | 20.02.2026, erneut abgerufen und fachlich abgeglichen am 05.09.2026 | Primärquelle für die bestätigten strukturellen Regeln, Einkommens-/Abzugsregeln, D2/D3, D6, die KiZ-Vermögensregeln, die in D7.1 korrigierte Ablehnungssemantik sowie BWZ, Auszahlung und Endrundung in D9 | `KIZ-CHILD-001`, `KIZ-KG-001`, `KIZ-WM-001`, `KIZ-WM-EXT-001`, `KIZ-RESIDENCE-001`, `KIZ-CONTACT-001`, `KIZ-PERIOD-001`, `KIZ-INCOME-ADULT-001`, `KIZ-INCOME-CHILD-001`, `KIZ-DEDUCTION-001`, `KIZ-MIN-INCOME-001`, `KIZ-REDUCE-CHILD-001`, `KIZ-PARENT-NEED-001`, `KIZ-PARENT-ADDITIONAL-NEED-001`, `KIZ-HOUSING-RECOGNITION-001`, `KIZ-PARENT-HOUSING-SHARE-001`, `KIZ-REDUCE-PARENT-001`, `KIZ-ASSET-001`, `KIZ-REDUCE-CHILD-ASSETS-001`, `KIZ-REDUCE-PARENT-ASSETS-001`, `KIZ-ASSET-INTEGRATION-001`, `KIZ-FINAL-001` |
| `SRC-SGBII-12-PRE-2026-07` | § 12 SGB II und Fachliche Weisungen § 12, Stand 01.01.2026, Bundesagentur für Arbeit, `https://www.arbeitsagentur.de/datei/dok_ba023900.pdf` | Rechtsstand bis 30.06.2026; abgerufen und fachlich abgeglichen am 15.08.2026 | Schutz- und Bewertungsrahmen vor dem 01.07.2026; für KiZ gilt ergänzend das besondere erhebliche-Vermögen-Regime aus § 6a BKGG/DA-KiZ, insbesondere ohne Übernahme altersabhängiger SGB-II-Freibeträge | `KIZ-ASSET-001` |
| `SRC-SGBII-12-POST-2026-07` | § 12 SGB II, amtliche Fassung ab 01.07.2026, `https://www.gesetze-im-internet.de/sgb_2/__12.html`, sowie Fachliche Weisungen § 12, Stand 01.07.2026, `https://www.arbeitsagentur.de/datei/fw-zu-par-12-sgb2-beruecksichtigung-von-vermoegen_ba058027.pdf` | Rechtsstand ab 01.07.2026; abgerufen und fachlich abgeglichen am 15.08.2026 | Schutz- und Bewertungsrahmen ab dem 01.07.2026, insbesondere Fahrzeug, Altersvorsorge, selbst genutztes Wohneigentum und Marktwert; die besonderen KiZ-Freibeträge des § 6a BKGG bleiben vorrangig | `KIZ-ASSET-001` |
| `SRC-SGBII-11-11B` | §§ 11 bis 11b SGB II, amtliche Fassung unter `https://www.gesetze-im-internet.de/sgb_2/` | zuletzt abgerufen und fachlich abgeglichen am 14.08.2026 | Primärgrundlage für Einkommensbegriff, Zufluss und Absetzbeträge; § 11b Absatz 2b unterscheidet insbesondere Ausbildung, Freiwilligendienst und Schülererwerbstätigkeit | `KIZ-INCOME-ADULT-001`, `KIZ-INCOME-CHILD-001`, `KIZ-DEDUCTION-001`, `KIZ-REDUCE-PARENT-001` |
| `SRC-FW-SGBII-11-11B-2024-10-24` | Fachliche Weisungen §§ 11 bis 11b SGB II, Bundesagentur für Arbeit, `https://www.arbeitsagentur.de/datei/fw-p11-11b-sgb-ii-stand-01072023_ba044381.pdf`; verwendet insbesondere Rz. 11.150 bis 11.155 | 24.10.2024, abgerufen und fachlich abgeglichen am 14.08.2026 | Primärquelle für Personen-Monatsbereinigung, Verhältnis von Grundabsetzbetrag zu tatsächlichen Aufwendungen sowie die begrenzte Übertragung nicht verbrauchter Abzüge nach § 11b Absatz 1 Nummer 3 und 4 | `KIZ-INCOME-ADULT-001`, `KIZ-ADULT-DEDUCTION-001` |
| `SRC-SGBII-11A` | § 11a SGB II - nicht zu berücksichtigendes Einkommen, amtliche Fassung unter `https://www.gesetze-im-internet.de/sgb_2/__11a.html` | abgerufen und fachlich abgeglichen am 13.08.2026 | Primärgrundlage für ausdrücklich ausgeschlossene Einnahmen; Absatz 7 regelt Erwerbseinnahmen unter 25-jähriger Schülerinnen und Schüler aus Tätigkeiten in den Schulferien | `KIZ-INCOME-ADULT-001`, `KIZ-INCOME-CHILD-001` |
| `SRC-BUERGERGELDV-1` | §§ 1 und 6 Bürgergeld-Verordnung; amtliche Fassung seit 01.07.2026 unter dem Titel Grundsicherungsgeld-Verordnung, `https://www.gesetze-im-internet.de/algiiv_2008/` | abgerufen und fachlich abgeglichen am 13.08.2026 | ergänzende Primärgrundlage; insbesondere mögliche Versicherungspauschale bei entsprechend versicherten Minderjährigen, daher ohne Versicherungsdaten kein endgültiger Kindeseinkommensbetrag | `KIZ-INCOME-ADULT-001`, `KIZ-INCOME-CHILD-001` |
| `SRC-BEEG-10` | § 10 BEEG, amtliche Fassung unter `https://www.gesetze-im-internet.de/beeg/__10.html` | abgerufen und fachlich abgeglichen am 14.08.2026 | Primärgrundlage für den bestätigungspflichtigen Elterngeldfreibetrag bis 300 EUR beim Basiselterngeld beziehungsweise bis 150 EUR beim Elterngeld Plus | `KIZ-INCOME-ADULT-001` |
| `SRC-BKGG-6A` | § 6a BKGG - Kinderzuschlag, amtliche Fassung unter `https://www.gesetze-im-internet.de/bkgg_1996/__6a.html` | zuletzt abgerufen und fachlich abgeglichen am 15.08.2026 | Grundlage für Zugangsvoraussetzungen, Einkommens- und Vermögensminderung, Bedarfsdeckung, sechsmonatigen BWZ und Endentscheidung | `KIZ-CHILD-001`, `KIZ-KG-001`, `KIZ-INCOME-CHILD-001`, `KIZ-REDUCE-CHILD-001`, `KIZ-REDUCE-PARENT-001`, `KIZ-ASSET-001`, `KIZ-REDUCE-CHILD-ASSETS-001`, `KIZ-REDUCE-PARENT-ASSETS-001`, `KIZ-ASSET-INTEGRATION-001`, `KIZ-COVERAGE-001`, `KIZ-EXTENDED-ACCESS-001`, `KIZ-FINAL-001` |
| `SRC-BKGG-11` | § 11 Absatz 2 BKGG, amtliche Fassung unter `https://www.gesetze-im-internet.de/bkgg_1996/__11.html` | abgerufen und fachlich abgeglichen am 15.08.2026 | Primärgrundlage für die Rundung des auszuzahlenden Kinderzuschlags; D6 rundet weiterhin nicht, D9 rundet ausschließlich den endgültigen Monatsbetrag | `KIZ-REDUCE-PARENT-001`, `KIZ-FINAL-001` |
| `SRC-SGBII-20` | § 20 SGB II, amtliche Fassung unter `https://www.gesetze-im-internet.de/sgb_2/__20.html` | abgerufen und fachlich abgeglichen am 13.08.2026 | Primärgrundlage für die Zuordnung der Regelbedarfsstufen Erwachsener | `KIZ-PARENT-NEED-001` |
| `SRC-SGBII-21` | § 21 SGB II, amtliche Fassung unter `https://www.gesetze-im-internet.de/sgb_2/__21.html` | abgerufen und fachlich abgeglichen am 13.08.2026 | Primärgrundlage für Schwangerschaft, Alleinerziehung, Teilhabe, Ernährung, unabweisbaren laufenden Bedarf, dezentrale Warmwassererzeugung und die Höchstgrenze der Absätze 2 bis 5 | `KIZ-PARENT-ADDITIONAL-NEED-001` |
| `SRC-RBSFV-2026` | § 2 Regelbedarfsstufen-Fortschreibungsverordnung 2026, amtliche Fassung unter `https://www.gesetze-im-internet.de/rbsfv_2026/__2.html` | 2026; abgerufen und fachlich abgeglichen am 13.08.2026 | Primärgrundlage für Regelbedarfsstufe 1 mit 563 EUR und Regelbedarfsstufe 2 mit 506 EUR | `KIZ-PARENT-NEED-001`, `KIZ-PARENT-ADDITIONAL-NEED-001` |
| `SRC-SGBII-7` | § 7 SGB II, amtliche Fassung unter `https://www.gesetze-im-internet.de/sgb_2/__7.html` | abgerufen und fachlich abgeglichen am 14.08.2026 | Primärgrundlage für die SGB-II-BG-Zugehörigkeit unverheirateter U25-Kinder und den Ausschluss bei eigenständig gesichertem Lebensunterhalt | `KIZ-SGBII-BG-MEMBERSHIP-001`, `KIZ-FAMILY-SGBII-NEED-001` |
| `SRC-SGBII-11` | § 11 SGB II, amtliche Fassung unter `https://www.gesetze-im-internet.de/sgb_2/__11.html` | abgerufen und fachlich abgeglichen am 14.08.2026 | Primärgrundlage für die Zuordnung von Kindergeld und eigenem Einkommen zum Kind bei der SGB-II-BG-Prüfung | `KIZ-SGBII-BG-MEMBERSHIP-001` |
| `SRC-FW-TBG-2026-01-12` | Fachliche Weisungen zu den Besonderheiten der temporären Bedarfsgemeinschaft, Bundesagentur für Arbeit, `https://www.arbeitsagentur.de/datei/fw-sgb-ii_ba014177.pdf`; Rz. TBG.14 (echtes Wechselmodell, S. 9) sowie Abschnitt 3.2, Rz. TBG.20/TBG.21 und Beispiel 2 (S. 11–12) | 12.01.2026, abgerufen und fachlich abgeglichen am 05.09.2026 | Amtliche Verwaltungspraxis zur Aufteilung tatsächlich weitergeleiteter Kindergeldteilbeträge; TBG.14 beschreibt daneben die hälftige Bedarfsberücksichtigung im echten Wechselmodell | `KIZ-KG-001`, `KIZ-CHILD-BENEFIT-SURPLUS-001` |
| `SRC-SGBII-22` | § 22 SGB II, amtliche Fassung unter `https://www.gesetze-im-internet.de/sgb_2/__22.html` | abgerufen und fachlich abgeglichen am 14.08.2026 | Primärgrundlage der Unterkunfts- und Heizbedarfe; die für KiZ abweichend maßgebliche zeitliche Wohnkostenbasis und Kopfteilanwendung folgen § 6a Absatz 8 BKGG und DA-KiZ | `KIZ-CHILD-SGBII-NEED-001`, `KIZ-FAMILY-SGBII-NEED-001` |
| `SRC-SGBII-23` | § 23 SGB II, amtliche Fassung unter `https://www.gesetze-im-internet.de/sgb_2/__23.html` | abgerufen und fachlich abgeglichen am 14.08.2026 | Primärgrundlage für Kinder-Regelbedarfsstufen 4 bis 6 und ergänzende Mehrbedarfe nicht erwerbsfähiger Personen | `KIZ-CHILD-SGBII-NEED-001` |
| `SRC-SGBII-26` | § 26 SGB II, amtliche Fassung unter `https://www.gesetze-im-internet.de/sgb_2/__26.html` | abgerufen und fachlich abgeglichen am 15.08.2026 | Abgrenzung möglicher Zuschüsse zu Kranken- und Pflegeversicherungsbeiträgen; D8A baut keine eigene Beitragsengine und bleibt bei konkretem Hinweis offen | `KIZ-COVERAGE-001` |
| `SRC-KIZ-HINWEISE-1H` | Hinweise KiZ 1-H | Stand im Projekt noch nicht dokumentiert | fachliche Grundlage für die Erfassung auch zeitweise im Haushalt lebender Kinder; Quellenstand bleibt nachzuführen | `KIZ-CHILD-001` |

## Datenvertrag zwischen Benutzeroberfläche und Rechenkern

Der Rechenkern erhält später einen bereits strukturell validierten, unveränderten State. Die fachliche Berechnung darf UI-Daten nicht umbenennen oder stillschweigend ergänzen. Die folgenden fachlichen Namen werden auf die tatsächlich vorhandenen State-Pfade abgebildet.

### Allgemeine Daten

| Fachlicher Name | State-Pfad | Typ | Beispiel | Pflicht | Rechenschritt |
|---|---|---|---|---|---|
| calculationMode | `mode` | `"single" \| "compare"` | `"single"` | ja | relevante Haushalte, Vergleich |
| applicationMonth | `applicationMonth` | Ganzzahl | `7` | ja | Betrachtungszeitraum |
| applicationYear | `applicationYear` | Ganzzahl | `2026` | ja | Betrachtungszeitraum, Quellenstand |
| dataVersion | `dataVersion` | Ganzzahl | `15` | technisch ja | Migration und Datenvertrag |
| Szenario Halbweiterleitung | `scenarioHalfForwarding` | Boolean | `false` | im Szenariovergleich | Szenarien |

### Daten pro Kind

| Feld | State-Pfad | Typ | Beispiel | Pflicht | Rechenschritt |
|---|---|---|---|---|---|
| ID | `centralChildren[].id` | String | `"central-1"` | ja | Zuordnung und Protokoll |
| Name | `centralChildren[].name` | String | `"Kind A1"` | nein, aber empfohlen | Anzeige und Protokoll |
| Alter | `centralChildren[].age` | Ganzzahl als String/Zahl | `"14"` | ja | mögliche Anspruchsprüfung; Regel offen |
| Betreuungssituation | `centralChildren[].careSituation` | Enum | `"wechselmodell-50-50"` | ja | Haushalts- und Kinderzuordnung |
| verheiratet oder verpartnert | `centralChildren[].maritalPartnershipStatus` | Enum `no/yes/unknown` | `"unknown"` | ja oder bewusst unbekannt | mögliches eigenes KiZ-Kind |
| betroffene Haushalte | `centralChildren[].affectedHouseholds` | String-Array | `["A", "B"]` | ja | Relevanz pro Haushalt |
| externer Haushalt | `centralChildren[].hasExternalHousehold` | Boolean | `false` | ja | externes Wechselmodell |
| Aufenthaltstage | `centralChildren[].stayDays` | Ganzzahl als String/Zahl | `"8"` | beim Umgangsmodell | Betreuungsmodell |
| Kindergeldort | `centralChildren[].childBenefitAt` | Enum `A/B/external/unknown` | `"A"` | ja oder bewusst unbekannt | Kindergeldzuordnung |
| Kindergeldperson | `centralChildren[].childBenefitPerson` | Personen-ID | `"applicant-a"` | abhängig vom Kindergeldort | Auszahlung und Aufteilung |
| externe Kindergeldperson | `centralChildren[].externalChildBenefitPerson` | String | `"Person im anderen Haushalt"` | optional | Protokoll externes Wechselmodell |
| Hälfte nachgewiesen weitergeleitet | `centralChildren[].halfForwarded` | Boolean | `true` | ja | Kindergeldfaktor für späteren SGB-II-Bedarfscheck; keine technische Nachweisprüfung |
| eigenes Einkommen vorhanden | `centralChildren[].hasOwnIncome` | `"yes" \| "no"` | `"no"` | ja | Kindeseinkommen |
| eigene angemessene private Versicherung | `centralChildren[].eligiblePrivateInsuranceStatus` | `"yes" \| "no" \| "unknown"` | `"unknown"` | bei minderjährigem Kind mit relevantem Einkommen | Versicherungspauschale |
| Einkommensquellen | `centralChildren[].incomeSources` | Array | `[]` | abhängig von `hasOwnIncome` | Kindeseinkommen |
| U25-Regelbedarfsstufe bestätigt | `centralChildren[].u25RuleStageStatus` | `yes/no/unknown` | `"yes"` | bei Alter 18 bis 24 | Regelbedarfsstufe 3 |
| dezentrales Warmwasser beim Kind je Haushalt | `centralChildren[].decentralHotWaterStatus.A/B` | `yes/no/unknown` | `"no"` | bei nicht zentraler Erzeugung | Kindermehrbedarf |
| weiterer anerkannter laufender Mehrbedarf | `centralChildren[].additionalNeedStatus` | `yes/no/unknown` | `"no"` | ja | Kindermehrbedarf |
| bestätigter weiterer Monatsbetrag | `centralChildren[].additionalNeedMonthlyAmount` | nicht negative Zahl oder leer | `"25"` | bei Status `yes` | Kindermehrbedarf |

Eine Kinder-Einkommensquelle enthält `id`, `incomeType`, `customLabel`, `amountType`, `entryMethod`, `monthlyAverage` und sechs `monthlyValues`. Für `side-job`, `education-support`, `orphan-pension`, `training-wage` und `voluntary-service` enthält sie zusätzlich `subtype`. Erwerbsquellen enthalten außerdem `directDeductions.tax` und `directDeductions.socialInsurance` als Betragsserien. Zulässige Nebenjob-Unterarten sind `normal`, `student-regular`, `school-holiday-only` und `unknown`; Waisenrenten verwenden `running`, `backpay`, `unknown`; Ausbildungsvergütungen `eligible-training`, `other-employment`, `unknown`; Freiwilligendienste `pocket-money-only`, `includes-other-benefits`, `unknown`; Ausbildungsförderung `bafog`, `bab`, `scholarship`, `training-allowance`, `other`, `unknown`. Alte Quellen ohne neue Merkmale werden defensiv auf `unknown` beziehungsweise leere Betragsserien migriert. Bedeutung und strukturelle Zulässigkeit sind in `SPEC.md` und `validation.js` dokumentiert.

### Daten pro Haushalt

| Fachlicher Name | State-Pfad | Typ | Beispiel | Pflicht | Rechenschritt |
|---|---|---|---|---|---|
| Bezeichnung | `households.A/B.label` | String | `"Haushalt A"` | nein | Anzeige und Protokoll |
| Haushaltsform | `households.A/B.adults` | `"single" \| "couple"` | `"single"` | ja | relevante Erwachsene, Mindestgrenze, Bedarf |
| applicantName | `households.A/B.person1` | String | `"Person 1"` | nein, aber empfohlen | Anzeige und Personenzuordnung |
| partnerName | `households.A/B.partner` | String | `"Person 2"` | bei Paar empfohlen | Anzeige und Personenzuordnung |
| weitere Bewohner | `households.A/B.otherResidents` | nicht negative Ganzzahl | `0` | derzeit Warnung bei unbekannt | spätere Wohnkostenaufteilung |
| Wohngeldbetrag | `households.A/B.housingBenefit` | nicht negative Zahl | `0` | statusabhängig | Bedarfsdeckungscheck |
| Wohngeldstatus | `households.A/B.housingBenefitStatus` | Enum | `"approved"` | ja oder bewusst unbekannt | Wohngeldbehandlung |
| Wohnform | `households.A/B.housingType` | `"rent" \| "owner"` | `"rent"` | ja | Wohnkosten |
| rentCosts | `households.A/B.housingCosts.rent` | Objekt | `{coldRent, coldUtilities, heating, costMonth, sublettingStatus, sublettingAmount, parkingAmount, parkingInseparableStatus}` | bei Miete | anerkannte Wohnkosten |
| ownerCosts | `households.A/B.housingCosts.owner` | Objekt | Beträge, Zahlungsrhythmen, Bezugsjahr oder bis zu zwölf Monatsgesamtwerte | bei Eigentum | anerkannte Wohnkosten |
| Warmwasserart | `households.A/B.hotWaterType` | Enum | `"central"` | ja oder bewusst unbekannt | möglicher Mehrbedarf; Fachregel offen |
| Warmwassernotiz | `households.A/B.hotWaterNote` | String | `"gemischt"` | bei gemischter Erzeugung empfohlen | Protokoll |
| dezentrales Warmwasser je erwachsener Person | `households.A/B.decentralHotWaterAdults` | Objekt mit `applicant` und `partner`, jeweils `yes/no/unknown` | `{applicant: "yes", partner: "no"}` | bei dezentraler Erzeugung | Warmwassermehrbedarf |
| besondere Situationen | `households.A/B.specialSituations` | Array | `[]` | nein | mögliche Mehrbedarfe |
| Vermögensstatus und Positionen | `households.A/B.assetsStatus`, `.assetPersons` | `no/yes/unknown`, personenbezogene Listen | `"unknown"`, leere Listen | Status; bei ja Detailpositionen | D7-Vermögensprüfung oder sichtbarer offener Prüfpunkt |
| manueller Mehrbedarf | `households.A/B.additionalNeedOverride` | nicht negative Zahl oder leer | `""` | nein | möglicher Mehrbedarf |

### Daten pro erwachsener Person

| Rolle | State-Pfad | Inhalt | Rechenschritt |
|---|---|---|---|
| antragstellende Person | `households.A/B.applicantIncomeSources` | Einkommensquellen | Einkommen, Mindestgrenze, Elternbedarf |
| Partner/in | `households.A/B.partnerIncomeSources` | Einkommensquellen | nur bei Paar; Einkommen und Bedarf |
| antragstellende Person | `households.A/B.applicantExpenses` | weitere Ausgaben und Abzüge | Einkommensaufbereitung |
| Partner/in | `households.A/B.partnerExpenses` | weitere Ausgaben und Abzüge | nur bei Paar; Einkommensaufbereitung |

Eine besondere Situation enthält `id`, `situationType`, `personRole`, `confirmationStatus`, `recurringStatus`, `description` und `monthlyAmount`. Alte Einträge ohne Bestätigungs- oder Personenzuordnung werden defensiv auf `unknown` beziehungsweise die antragstellende Person migriert und nicht stillschweigend anerkannt.

Eine Erwachsenen-Einkommensquelle enthält `id`, `personRole`, `incomeType`, `customLabel`, `amountType`, `entryMethod`, `monthlyAverage`, sechs `monthlyValues`, `employmentType`, `u25SpecialAllowanceStatus`, `parentalAllowanceType`, `confirmedExemptionMonthly` und `deductions`. Für `sick-pay` können zusätzlich `grossAmount` und `netAmount` als getrennte Serien mit derselben `entryMethod` und entweder `monthlyAverage` oder sechs `monthlyValues` erfasst werden. `netAmount` beziehungsweise der bei alten Quellen vorhandene primäre Betrag ist der alleinige KiZ-Rechenwert; `grossAmount` ist ein Nachweis-/Erfassungswert und wird nicht zusätzlich als Einkommen summiert. Ist nur Brutto eindeutig vorhanden, bleibt die KiZ-Berechnung offen. Pflichtbeiträge in `deductions` führen zusätzlich `mandatoryStatus = yes/no/unknown`; bei einem bereits nach SV-Abzug ausgewiesenen Krankengeld-Netto-/Zahlbetrag werden aktivierte SV-Serien nicht nochmals als Pflichtbeitrag abgezogen. Ein Ausgabeneintrag enthält `id`, `personRole`, `expenseType`, `entryMethod`, `monthlyAverage`, sechs `monthlyValues`, `description`, `commuteMode`, `distanceKm`, `workDaysPerMonth`, `reasonablePublicTransport`, `monthlyPublicTransportAlternativeCost`, `legalDeductibleAmountConfirmed`, `liabilityOnlyConfirmed`, `proofStatus`, `pureCareCostsConfirmed`, `incomeConnectionConfirmed`, `legalObligationConfirmed` und `titleOrNotarialMonthlyMaximum`. Alte Datensätze werden defensiv auf `unknown` beziehungsweise leere Betragsfelder migriert; unbekannt bedeutet nie stillschweigend `yes`.

## Regelgruppen und stabile Regel-IDs

| Gruppe | Thema | Regel-ID | Status |
|---|---|---|---|
| A | Allgemeine Grundlagen | `KIZ-GEN-001` | `GETESTET` |
| B | Antragsmonat und Betrachtungszeitraum | `KIZ-PERIOD-001` | `GETESTET` |
| C | Relevante Haushalte | `KIZ-HH-001` | `GETESTET` |
| D | Relevante Kinder | `KIZ-CHILD-001` | `GETESTET` |
| E | Kindergeldbezug und Person | `KIZ-KG-001` | `GETESTET` |
| F | Wechselmodell | `KIZ-WM-001` | `GETESTET` |
| G | Externes Wechselmodell | `KIZ-WM-EXT-001` | `GETESTET` |
| H | Dauerhaft/überwiegend lebende Kinder | `KIZ-RESIDENCE-001` | `GETESTET` |
| I | Umgangsmodell und Aufenthaltstage | `KIZ-CONTACT-001` | `GETESTET` |
| J | Einkommen Erwachsener | `KIZ-INCOME-ADULT-001` | `GETESTET` |
| J0 | Krankengeld-Bescheidwerte | `KIZ-SICK-PAY-INPUT-001` | `GETESTET` |
| J1 | Abschließende Erwachsenen-Abzüge | `KIZ-ADULT-DEDUCTION-001` | `GETESTET` |
| J2 | Kindergeldüberschuss als vorbereitetes Elterneinkommen | `KIZ-CHILD-BENEFIT-SURPLUS-001` | `GETESTET` |
| K | Einkommen von Kindern | `KIZ-INCOME-CHILD-001` | `GETESTET` |
| L | Abzüge und Ausgaben | `KIZ-DEDUCTION-001` | `GETESTET` |
| M | Mindesteinkommensgrenze | `KIZ-MIN-INCOME-001` | `GETESTET` |
| N | Historischer Bedarfsplatzhalter | `KIZ-NEED-001` | `ABGELÖST DURCH D4` |
| O | Historischer Wohnkostenplatzhalter | `KIZ-HOUSING-001` | `TEILWEISE ABGELÖST DURCH D3/D4` |
| P | Wohngeld | `KIZ-WOHNGELD-001` | `GETESTET (D8A/D8B3)` |
| WG1 | Wohngeld-Haushaltsmitglieder | `WG-HOUSEHOLD-001` | `GETESTET` |
| WG2 | Wohngeld-Prognoseeinkommen | `WG-INCOME-001` | `GETESTET` |
| WG3 | rohe Mietzuschussbasis | `WG-RENT-001` | `GETESTET` |
| WG4 | rohe Lastenzuschussbasis | `WG-OWNER-BURDEN-001` | `GETESTET` |
| WG5 | vorbereitete Formelwerte | `WG-FOUNDATION-001` | `GETESTET` |
| WG6 | mathematischer Wohngeldbetrag 2025/2026 | `WG-AMOUNT-001` | `GETESTET` |
| Q | Mehrbedarfe | `KIZ-ADD-NEED-001` | `OFFEN` |
| Q1 | Elternregelbedarf und Gesamtbedarf | `KIZ-PARENT-NEED-001` | `GETESTET` |
| Q2 | Mehrbedarfe der Eltern | `KIZ-PARENT-ADDITIONAL-NEED-001` | `GETESTET` |
| Q3 | Anerkannte Wohnkosten für KiZ | `KIZ-HOUSING-RECOGNITION-001` | `GETESTET` |
| Q4 | Wohnkostenanteil der Eltern | `KIZ-PARENT-HOUSING-SHARE-001` | `GETESTET` |
| Q5 | Individueller Kinderbedarf | `KIZ-CHILD-SGBII-NEED-001` | `GETESTET` |
| Q6 | Einkommensabhängige KiZ-BG des Kindes | `KIZ-CHILD-BG-INCOME-001` | `GETESTET` |
| Q7 | Einkommensabhängige SGB-II-BG des Kindes | `KIZ-SGBII-BG-MEMBERSHIP-001` | `GETESTET` |
| Q8 | SGB-II-Familienbedarf | `KIZ-FAMILY-SGBII-NEED-001` | `GETESTET` |
| R | Maximale KiZ-Höhe | `KIZ-MAX-001` | `GETESTET` |
| S | Minderung durch Kindeseinkommen | `KIZ-REDUCE-CHILD-001` | `GETESTET` |
| T | Minderung durch Elterneinkommen | `KIZ-REDUCE-PARENT-001` | `GETESTET` |
| T1 | Vermögensbewertung und KiZ-Freibeträge | `KIZ-ASSET-001` | `GETESTET` |
| T2 | Minderung durch Kindesvermögen | `KIZ-REDUCE-CHILD-ASSETS-001` | `GETESTET` |
| T3 | Minderung durch Elternvermögen | `KIZ-REDUCE-PARENT-ASSETS-001` | `GETESTET` |
| T4 | Vermögensintegration in die Monatspipeline | `KIZ-ASSET-INTEGRATION-001` | `GETESTET` |
| T5 | Coverage-Einkommen | `KIZ-COVERAGE-INCOME-001` | `GETESTET` |
| T6 | SGB-II-Kindergeldzuordnung für Coverage | `KIZ-COVERAGE-CHILD-BENEFIT-001` | `GETESTET` |
| U | Patchwork und Kindergeldpersonen | `KIZ-PATCHWORK-001` | `ZU PRÜFEN` |
| V | Bedarfsdeckungscheck | `KIZ-COVERAGE-001` | `GETESTET` |
| V1 | Erweiterter Zugang | `KIZ-EXTENDED-ACCESS-001` | `GETESTET` |
| W | Einzelhaushaltsmodus | `KIZ-SINGLE-001` | `BESTÄTIGT` (strukturell) |
| X | Vergleichsmodus | `KIZ-COMPARE-001` | `BESTÄTIGT` (strukturell) |
| Y | Szenariovergleich | `KIZ-SCENARIO-001` | `OFFEN` |
| Z | Rechenprotokoll | `KIZ-PROTOCOL-001` | `BESTÄTIGT` (Strukturziel) |
| Z1 | Finale KiZ-Orchestrierung und kompaktes Rechenprotokoll | `KIZ-FINAL-001` | `GETESTET` |

## Regel-ID: KIZ-GEN-001

### Bezeichnung
Allgemeine Voraussetzungen des Rechenkerns

### Status
GETESTET

### Zweck
Legt fest, wann der spätere Rechenkern ausgeführt werden darf und welchen fachlichen Stand er verwendet.

### Eingaben
Validierungsergebnis, Antragsmonat, Antragsjahr, Rechenmodus und Versionsangaben.

### Fachliche Regel
1. Der Rechenkern darf nur beginnen, wenn das übergebene Validierungsergebnis keine `ERROR`-Meldung enthält. Ein Fehler ergibt `BLOCKED_BY_VALIDATION`.
2. `WARNING` und `INFO` blockieren nicht automatisch und werden unverändert als Metadaten übernommen.
3. Offene oder nicht unterstützte regelbezogene Sachverhalte werden als `PARTIAL`, `UNRESOLVED` oder `UNSUPPORTED` ausgewiesen. Sie dürfen nicht stillschweigend ergänzt oder als 0 interpretiert werden.
4. Das Ergebnis enthält Antragsmonat/-jahr, angewendete Regel-IDs, Quellenstand, Berechnungsstatus, Warnungen, offene Prüfpunkte und nicht unterstützte Sachverhalte.
5. Diese Einstiegsregel trifft keine Anspruchsentscheidung und berechnet keinen vollständigen Kinderzuschlag.

### Ergebnis
Reines Metadatenobjekt aus `createCalculationContext(state, validationResult)` mit `canCalculate`, `status`, Zeitraumangaben, Regel- und Quellenstand sowie strukturierten Meldungslisten.

### Sonderfälle
Warnungen blockieren nicht automatisch; ihre fachliche Wirkung ist regelbezogen festzulegen.

### Quelle
`SRC-PRODUCT-SPEC-2026`; Sicherheits- und Statusvorgabe dieses bestätigten Implementierungsschritts vom 11.07.2026.

### Stand
Am 11.07.2026 in `calculator.js` implementiert und mit `tests/monetary-foundation-tests.js` automatisiert getestet. Vollständige Anspruchsvoraussetzungen bleiben anderen Regel-IDs vorbehalten.

### Testfälle
- Normalfall: formal valide Eingaben starten später die Pipeline.
- Grenzfall: eine Warnung wird protokolliert, blockiert aber nicht allein.
- Sonderfall: ein Validierungsfehler blockiert den Rechenkern.

## Regel-ID: KIZ-PERIOD-001

### Bezeichnung
Antragsmonat und sechsmonatiger Betrachtungszeitraum

### Status
GETESTET

### Zweck
Bestimmt die zeitliche Zuordnung der Einkommenswerte.

### Eingaben
`applicationMonth`, `applicationYear`.

### Fachliche Regel
1. Der feste Bemessungszeitraum umfasst die sechs vollständigen Kalendermonate vor dem Antragsmonat beziehungsweise Beginn des Bewilligungszeitraums.
2. Die Ausgabe erfolgt chronologisch vom ältesten bis zum jüngsten Monat.
3. Jeder Eintrag enthält Monat, Jahr, Schlüssel `YYYY-MM`, deutsche Monatsbezeichnung und nullbasierte Position.
4. Jahreswechsel werden kalendarisch korrekt behandelt. Ungültige Monate oder Jahre werden nicht korrigiert; die Funktion liefert `INVALID_APPLICATION_PERIOD` ohne Monate.

### Ergebnis
`createAssessmentPeriod(applicationMonth, applicationYear)` liefert `ruleId`, `status`, Antragsmonat/-jahr, sechs Monatsobjekte sowie Warnungen und offene Prüfpunkte.

### Sonderfälle
Jahreswechsel und ungültige technische Werte. Fehlende Einkommenswerte werden von Validierung und Einkommensregel behandelt, nicht von der Periodenregel.

### Quelle
`SRC-DA-KIZ-2026-02-20`; bestätigte fachliche Vorgabe dieses Implementierungsschritts vom 11.07.2026.

### Stand
Am 11.07.2026 in `calculator.js` implementiert und mit Jahreswechsel-, Reihenfolge- und Fehlerfällen in `tests/monetary-foundation-tests.js` getestet; DA-KiZ Stand 20.02.2026.

### Testfälle
- Normalfall: Antrag Juli mit sechs vorhandenen Vormonaten.
- Normalfall: Antrag Oktober ergibt April bis September.
- Grenzfall: Antrag Januar über einen Jahreswechsel.
- Sonderfall: ungültiger Monat wird nicht normalisiert.

## Regel-ID: KIZ-HH-001

### Bezeichnung
Relevante Haushalte

### Status
GETESTET

### Zweck
Bestimmt den technischen Haushaltsumfang der Berechnung.

### Eingaben
`mode`, `households.A`, `households.B`.

### Fachliche Regel
Im Einzelmodus ist Haushalt A relevant. Im Vergleichsmodus sind Haushalt A und Haushalt B relevant. Nicht relevante Haushaltsdaten werden nicht gelöscht oder umgedeutet.

### Ergebnis
`getRelevantHouseholds(state)` liefert `['A']`, `['A', 'B']` oder bei ungültigem Modus defensiv `[]`.

### Sonderfälle
Ungültiger Modus wird bereits durch die Validierung blockiert.

### Quelle
`SRC-PRODUCT-SPEC-2026`; technisch in `validation.js` vorbereitet.

### Stand
Am 11.07.2026 in `calculation-rules.js` implementiert und in `tests/structural-rules-tests.js` automatisiert getestet. Die Funktion ist rein, browserfähig und Node-testbar.

### Testfälle
- Normalfall: `single` ergibt `["A"]`.
- Grenzfall: `compare` ergibt `["A", "B"]`.
- Sonderfall: ungültiger Modus führt nicht zu einer Berechnung.

## Regel-ID: KIZ-CHILD-001

### Bezeichnung
Haushaltsrelevanz und mögliches eigenes KiZ-Kind

### Status
GETESTET

### Zweck
Klassifiziert ein Kind für einen betrachteten Haushalt, ohne Euro-, Bedarfs- oder Einkommensberechnung.

### Eingaben
`id`, `name`, `age`, `careSituation`, `maritalPartnershipStatus`, `affectedHouseholds`, `hasExternalHousehold`, `stayDays`, `childBenefitAt`. Die vorhandenen Felder `childBenefitPerson`, `externalChildBenefitPerson`, `halfForwarded`, `hasOwnIncome` und `incomeSources` werden von dieser Teilregel nicht ausgewertet.

### Fachliche Regel
1. Die Regel betrachtet ausschließlich Haushalt `A` oder `B`.
2. Ein Kind ist für einen Haushalt relevant, wenn dieser Haushalt in `affectedHouseholds` steht und die Betreuungssituation diesen Haushalt bezeichnet. Ein externer Haushalt wird nicht als A oder B berechnet.
3. `wechselmodell-50-50` ist für A und B relevant. `wechselmodell-a-external` ist nur für A relevant, `wechselmodell-b-external` nur für B.
4. `dauerhaft-a/b`, `ueberwiegend-a/b` und `umgang-a/b` sind nur dem jeweils bezeichneten Haushalt zugeordnet.
5. Ein relevantes Kind ist nur dann ein mögliches eigenes KiZ-Kind dieses Haushalts, wenn `childBenefitAt` diesem Haushalt entspricht und das vorhandene Alter eine ganze Zahl von 0 bis unter 25 ist.
6. Liegt der Kindergeldbezug in einem anderen oder externen Haushalt, bleibt das Kind im zugeordneten Haushalt bedarfsrelevant, ist dort aber kein mögliches eigenes KiZ-Kind. Beim A/B-Wechselmodell und Umgangsmodell wird dies als temporäre beziehungsweise reine Bedarfsrelevanz markiert.
7. Bei `childBenefitAt = unknown` wird keine sichere Zuordnung als eigenes KiZ-Kind vorgenommen und ein Warnhinweis ausgegeben.
8. Bei einem Alter von 25 Jahren oder älter wird `AGE_25_OR_OLDER` als Ausschlussgrund für die mögliche eigene KiZ-Kind-Eigenschaft gesetzt. Ein ungültiges Alter führt defensiv ebenfalls zu keiner positiven Klassifikation; die strukturelle Fehlerbehandlung bleibt Aufgabe von `validation.js`.
9. Konkrete `stayDays` dürfen zusätzlich rein klassifiziert werden als `DAYS_1_12`, `DAYS_13_17` oder `DAYS_18_PLUS`. Ohne konkreten Wert wird aus der vorhandenen Betreuungskategorie nur `DAYS_1_12`, `DAYS_13_17`, `DAYS_18_PLUS`, `FULL_TIME` oder `NOT_CAPTURED` abgeleitet. Daraus wird kein Bedarf berechnet.
10. `maritalPartnershipStatus = no` erzeugt keinen Ausschluss aus diesem Grund. `yes` setzt `CHILD_MARRIED_OR_PARTNERED` und verhindert die positive Klassifikation als mögliches eigenes KiZ-Kind. `unknown` erzeugt die Warnung `CHILD_MARITAL_PARTNERSHIP_STATUS_UNKNOWN` und den offenen Prüfpunkt `CHILD_MARITAL_PARTNERSHIP_STATUS_REVIEW_REQUIRED`; es wird nicht stillschweigend `no` angenommen.
11. Angaben zu einem eigenen Kind des Kindes und zum Zusammenleben mit einem eigenen Partner fehlen weiterhin. Sie werden mit `CHILD_REMAINING_FAMILY_STATUS_NOT_CAPTURED` und einzelnen offenen Prüfpunkten ausgewiesen.
12. Die Betreuungssituation beschreibt nach der Produktspezifikation den regelmäßig bestehenden Zustand zu Beginn des gewählten Antragsmonats. Deshalb wird `CHILD_FIRST_BWZ_MONTH_RESIDENCE_NOT_CAPTURED` nicht mehr pauschal erzeugt.

### Ergebnis
Ein reines Klassifikationsobjekt mit `ruleId`, Kind- und Haushalts-ID, `isRelevantForHousehold`, `isPotentialOwnKizChildForThisHousehold`, `isTemporaryOrNeedRelevantOnly`, `residenceClassification`, `dayClassification`, `belongsToChildBenefitHousehold`, `exclusionReasons`, `openChecks`, `reasons` und strukturierten `warnings`.

### Sonderfälle
B-only-Kind im Einzelmodus, externer Haushalt, unbekannter Kindergeldbezug, Alter ab 25, unbekannter Heirats-/Verpartnerungsstatus, verbleibende Familienstatusdaten und inkonsistente Alt-Daten. Alte Kindobjekte ohne neues Feld werden als `unknown` behandelt. Die Regel verändert Eingaben nicht und ersetzt nicht die strukturelle Validierung.

### Quelle
`SRC-BKGG-6A`, `SRC-DA-KIZ-2026-02-20`, `SRC-KIZ-HINWEISE-1H`, `SRC-PRODUCT-SPEC-2026`.

### Stand
Fachliche Teilregel am 11.07.2026 bestätigt, in `calculation-rules.js` implementiert und mit `tests/calculation-tests.js` sowie `tests/structural-rules-tests.js` automatisiert getestet. Normstand von § 6a BKGG und Stand der Hinweise KiZ 1-H sind im Projekt noch nachzuführen. Eigenes Kind des Kindes und Zusammenleben mit einem eigenen Partner bleiben offene Datenlücken.

### Testfälle
- Kind A1: A/B-Wechselmodell, Kindergeld A; A mögliches eigenes KiZ-Kind, B nur bedarfsrelevant.
- Kind A2 und Kind A3: A/B-Wechselmodell, Kindergeld B; spiegelbildliche Klassifikation.
- Kind B1: dauerhaft B, Kindergeld B; B mögliches eigenes KiZ-Kind, A nicht relevant.
- Kind B2: B/externes Wechselmodell, Kindergeld extern; B bedarfsrelevant, A nicht relevant, weder A noch B eigenes KiZ-Kind.
- Unbekannter Kindergeldbezug: relevant möglich, aber keine sichere eigene KiZ-Kind-Zuordnung und Warnung.
- Alter ab 25: kein mögliches eigenes KiZ-Kind und Ausschlussgrund.
- Umgangsmodell im Nicht-Kindergeldhaushalt: nur bedarfsrelevant.
- Überwiegender Aufenthalt A: A relevant, B nicht relevant.
- Unveränderlichkeit: Eingabeobjekt ist vor und nach Auswertung strukturell identisch.
- Familienstand `no`, `yes`, `unknown`: kein Ausschluss, Ausschluss beziehungsweise Warnung/offener Prüfpunkt.
- Offene verbleibende Familienstatusdaten werden über `CHILD_REMAINING_FAMILY_STATUS_NOT_CAPTURED` und einzelne `openChecks` ausgewiesen.

## Regel-ID: KIZ-KG-001

### Bezeichnung
Kindergeldbezug und kindergeldberechtigte Person

### Status
GETESTET

### Zweck
Ordnet Kindergeldort und Person pro Kind rein strukturell einer späteren Auszahlung und Bedarfsprüfung zu.

### Eingaben
`childBenefitAt`, `childBenefitPerson`, `externalChildBenefitPerson`, `halfForwarded`.

### Fachliche Regel
1. Bei `childBenefitAt = A/B` kann nur der entsprechende Haushalt durch den Kindergeldbezug als eigener KiZ-Haushalt für dieses Kind positiv klassifiziert werden.
2. Bei `external` ist weder A noch B durch den Kindergeldbezug eigener KiZ-Haushalt. Eine Bedarfsrelevanz bleibt möglich.
3. Bei `unknown` erfolgt keine positive Zuordnung; Warnung und offener Prüfpunkt werden ausgegeben.
4. `childBenefitPerson` und `externalChildBenefitPerson` werden ausgegeben. Technische Widersprüche zur Haushaltsstruktur prüft weiterhin `validation.js`.
5. Die UI und `SPEC.md` definieren `halfForwarded = true` ausdrücklich als nachgewiesene hälftige Weiterleitung. Dann ist `childBenefitSgbCheckFactor = 0.5`, sonst `1`. Es wird weder ein Eurobetrag noch eine Nachweiskontrolle berechnet.

### Ergebnis
`evaluateChildBenefitAssignment(child, householdId)` liefert Regel-, Kind- und Haushalts-ID, Kindergeldort, Haushaltszuordnung, mögliche eigene KiZ-Zuordnung allein aufgrund des Kindergeldbezugs, Personen-ID, Weiterleitungsstatus, `childBenefitSgbCheckFactor`, Gründe, Warnungen und offene Prüfpunkte.

### Sonderfälle
Unbekannter Bezug, externer Bezug, unterschiedliche Personen innerhalb eines Paares, Weiterleitung.

### Quelle
`SRC-DA-KIZ-2026-02-20` B.1.1, B.2, B.3 und C.4.1; `SRC-BKGG-6A`; `SRC-PRODUCT-SPEC-2026` für die eindeutige Feldbedeutung.

### Stand
Am 11.07.2026 in `calculation-rules.js` implementiert und mit neun Zuordnungs-/Haushaltstests sowie ergänzenden Integrationstests in `tests/structural-rules-tests.js` getestet. Monetäre Anwendung im vollständigen Bedarfsdeckungscheck bleibt offen.

### Testfälle
- Normalfall: Kindergeld bei Antragsteller/in A.
- Grenzfall: Kindergeld bei Partner/in eines Paarhaushalts.
- Sonderfall: externer Bezug oder nachgewiesene hälftige Weiterleitung.

## Regel-ID: KIZ-WM-001

### Bezeichnung
Echtes 50/50-Wechselmodell

### Status
GETESTET

### Zweck
Bereitet die Bedarfs- und Haushaltszuordnung eines echten Wechselmodell-Kindes vor.

### Eingaben
`careSituation = "wechselmodell-50-50"`, `affectedHouseholds`, Kindergeldzuordnung, Wohnkosten.

### Fachliche Regel
1. `wechselmodell-50-50` ist in A und B relevant und wird als `DAYS_13_17` klassifiziert.
2. Nur der Kindergeld-Haushalt kann dieses Kind als mögliches eigenes KiZ-Kind führen; der andere Haushalt bleibt temporär/bedarfsrelevant.
3. In beiden Haushalten gelten strukturell `regularNeedMode = HALF`, `childAdditionalNeedMode = HALF`, `housingNeedMode = FULL` und die Faktoren `0.5`, `0.5`, `1`.
4. Bei einem Paar lautet `singleParentAdditionalNeedMode = NOT_APPLICABLE`. Bei einem alleinstehenden Elternteil mit ausschließlich Wechselmodell-Kindern lautet er `HALF`. Gibt es daneben mindestens ein dauerhaft im selben Haushalt lebendes Kind, lautet er `AVERAGE_REQUIRED`.
5. `AVERAGE_REQUIRED` bereitet nur die spätere DA-Methode vor: Wert mit allen betreffenden Kindern plus Wert nur mit dauerhaft dort lebenden Kindern, danach Division durch zwei. Prozent- und Eurobeträge bleiben unberechnet.

### Ergebnis
Ein gemeinsames reines Klassifikationsobjekt aus `evaluateChildNeedClassification(child, householdId, state)` mit Modi, Faktoren, Tagesklasse, KiZ-/Bedarfsrelevanz, Gründen, Warnungen und offenen Prüfpunkten.

### Sonderfälle
Unterschiedlicher Kindergeldbezug je Kind, Weiterleitung, mehrere gemeinsame Kinder.

### Quelle
`SRC-DA-KIZ-2026-02-20`, besonders C.3.1.2, C.4.1 und Seiten 60 bis 64; `SRC-PRODUCT-SPEC-2026`.

### Stand
Am 11.07.2026 in `calculation-rules.js` implementiert und in `tests/structural-rules-tests.js` automatisiert getestet. Keine Eurobeträge oder Mehrbedarfsprozentsätze implementiert.

### Testfälle
- Normalfall: ein gemeinsames Wechselmodell-Kind.
- Grenzfall: dokumentierte Tagesgrenzen 13 und 17; erwartete Wirkung offen.
- Sonderfall: drei gemeinsame Kinder mit unterschiedlichen Kindergeldpersonen.

## Regel-ID: KIZ-WM-EXT-001

### Bezeichnung
Wechselmodell mit externem anderem Haushalt

### Status
GETESTET

### Zweck
Behandelt ein Kind zwischen einem betrachteten und einem nicht mitberechneten Haushalt.

### Eingaben
`careSituation = wechselmodell-a-external/wechselmodell-b-external`, `affectedHouseholds`, `hasExternalHousehold`, externe Kindergeldangaben.

### Fachliche Regel
1. `wechselmodell-a-external` ist nur A, `wechselmodell-b-external` nur B zugeordnet. Der externe Haushalt wird nicht berechnet.
2. Das vorhandene 50/50-Modell wird im betrachteten Haushalt als `DAYS_13_17` mit `regularNeedFactor = 0.5`, `childAdditionalNeedFactor = 0.5` und `housingNeedFactor = 1` klassifiziert.
3. Bei externem Kindergeldbezug ist das Kind im betrachteten Haushalt bedarfsrelevant, aber kein mögliches eigenes KiZ-Kind. Liegt das Kindergeld ausnahmsweise im betrachteten Haushalt, kann die bestehende KiZ-Kind-Regel positiv klassifizieren.
4. Der nicht bezeichnete Haushalt A oder B erhält keine Wirkung.

### Ergebnis
Gemeinsames Klassifikationsobjekt mit `ruleId = KIZ-WM-EXT-001`, Relevanz, Tagesklasse, Modi und Faktoren.

### Sonderfälle
Kein Kindergeldbezug im betrachteten Haushalt; externe Kindergeldperson.

### Quelle
`SRC-DA-KIZ-2026-02-20` B.2, B.3, C.3.1.2, C.4.1 und Seiten 60 bis 64; `SRC-PRODUCT-SPEC-2026`.

### Stand
Am 11.07.2026 in `calculation-rules.js` implementiert und mit dem Kind-B2-Fall sowie Unveränderlichkeitstests in `tests/structural-rules-tests.js` getestet.

### Testfälle
- Normalfall: Wechselmodell A/extern.
- Grenzfall: Wechselmodell B/extern ohne Kindergeld in B.
- Sonderfall: Kind B2 als B/externes Wechselmodell-Kind.

## Regel-ID: KIZ-RESIDENCE-001

### Bezeichnung
Dauerhaft oder überwiegend in einem Haushalt lebende Kinder

### Status
GETESTET

### Zweck
Bestimmt die spätere Behandlung dauerhaft oder überwiegend zugeordneter Kinder.

### Eingaben
`careSituation = dauerhaft-a/b` oder `ueberwiegend-a/b`, Kindergeld- und Einkommensdaten.

### Fachliche Regel
1. `dauerhaft-a/b` und `ueberwiegend-a/b` sind ausschließlich dem bezeichneten Haushalt zugeordnet.
2. Bei dauerhaftem oder überwiegendem Aufenthalt und Kindergeldbezug im bezeichneten Haushalt gelten strukturell `FULL/FULL/FULL` und die Faktoren `1/1/1` für Regelbedarf, kindbezogene Mehrbedarfe und Unterkunft/Heizung.
3. Ein alleinstehender Elternteil erhält die Kennzeichnung `singleParentAdditionalNeedMode = FULL`, ein Paar `NOT_APPLICABLE`. Konkrete Prozentsätze und Eurobeträge bleiben offen.
4. Bei überwiegendem Aufenthalt im bezeichneten Haushalt und Kindergeldbezug in einem anderen Haushalt werden keine positiven Bedarfsfaktoren unterstellt. Die Regel erzeugt `PREDOMINANT_RESIDENCE_CHILD_BENEFIT_MISMATCH` als Warnung und offenen Prüfpunkt.
5. Auch ein widersprüchlicher dauerhafter Aufenthalt/Kindergeldort bleibt mit `PERMANENT_RESIDENCE_CHILD_BENEFIT_MISMATCH` offen, statt eine unbestätigte Standardwirkung anzunehmen.

### Ergebnis
Gemeinsames Klassifikationsobjekt mit `ruleId = KIZ-RESIDENCE-001`, Relevanz, Tagesklasse, Modi, Faktoren oder defensiv `null` bei offenem Widerspruch.

### Sonderfälle
Patchwork-Kind, andere kindergeldberechtigte Person, eigenes Einkommen.

### Quelle
`SRC-DA-KIZ-2026-02-20` B.2, B.3, C.3.1.2 und C.4.1; `SRC-PRODUCT-SPEC-2026`.

### Stand
Am 11.07.2026 in `calculation-rules.js` implementiert und mit dauerhaftem, überwiegendem sowie widersprüchlichem Aufenthalt in `tests/structural-rules-tests.js` getestet.

### Testfälle
- Normalfall: dauerhaft in A lebendes Kind.
- Grenzfall: überwiegend in B lebendes Kind.
- Sonderfall: Kind B1 als dauerhaft in B lebendes Patchwork-Kind.

## Regel-ID: KIZ-CONTACT-001

### Bezeichnung
Umgangsmodell und Aufenthaltstage

### Status
GETESTET

### Zweck
Bereitet Kinder mit 1 bis 12 Aufenthaltstagen in einem Haushalt vor.

### Eingaben
`careSituation = umgang-a/b`, `stayDays`.

### Fachliche Regel
1. `umgang-a/b` bezeichnet 1 bis 12 Tage im jeweiligen nicht kindergeldberechtigten Elternhaushalt. Die exakte ganze Tageszahl ist erforderlich.
2. Das Kind kann dort kein eigenes KiZ-Kind sein, bleibt aber für andere KiZ-Kinder bedarfsrelevant.
3. `regularNeedFactor` und `childAdditionalNeedFactor` sind ohne Rundung `stayDays / 30`; `housingNeedFactor = 1`.
4. `singleParentAdditionalNeedMode = NONE`, weil dieses Umgangskind allein keinen Alleinerziehenden-Mehrbedarf auslöst.
5. Liegt der Kindergeldbezug entgegen der bestätigten Fallbeschreibung im Umgangshaushalt oder sind die Tage ungültig, bleiben die Faktoren defensiv `null` und Warnung/offener Prüfpunkt werden ausgegeben.

### Ergebnis
Gemeinsames Klassifikationsobjekt mit `ruleId = KIZ-CONTACT-001`, `requiresExactStayDays = true`, Tagesklasse, Modi und Faktoren.

### Sonderfälle
Grenzwerte 1 und 12, widersprüchliche alte Aufenthaltstage.

### Quelle
`SRC-DA-KIZ-2026-02-20`, insbesondere temporäre BG auf Seiten 60 bis 64 sowie C.3.1.2 und C.4.1; `SRC-PRODUCT-SPEC-2026`.

### Stand
Am 11.07.2026 in `calculation-rules.js` implementiert und für 1, 8 und 12 Tage sowie Unterkunft und Alleinerziehenden-Modus in `tests/structural-rules-tests.js` getestet.

### Testfälle
- Normalfall: 8 Aufenthaltstage in A.
- Grenzfall: 1 beziehungsweise 12 Tage.
- Sonderfall: Aufenthaltstage fehlen; Validierung blockiert.

## Regel-ID: KIZ-SICK-PAY-INPUT-001

### Bezeichnung
Krankengeld-Bescheidbetrag und monatliche Umrechnung

### Status
IMPLEMENTIERT

### Fachliche Regel
1. Eine Krankengeldquelle kann `grossAmount` und `netAmount` als zwei getrennte Betragsserien derselben Leistung enthalten. Die Serien werden niemals addiert; für KiZ ist ausschließlich der Netto-/Zahlbetrag maßgeblich.
2. `period = monthly` bezeichnet Monatswerte. `period = calendar-day` bezeichnet einen kalendertäglichen Bescheidbetrag; für die KiZ-Monatsaufbereitung wird nach § 47 Absatz 1 SGB V ein voller Kalendermonat mit 30 Tagen multipliziert. Die Umrechnung gilt gleichermaßen für Brutto- und Netto-Serie und erzeugt keine zusätzliche Quelle.
3. Für Wohngeld wird bei ausdrücklicher Bestätigung nur ein bereits eindeutig monatlich erfasster Netto-/Zahlbetrag als gleichbleibende Prognose übernommen. Ein reiner Tagesbetrag wird nicht automatisch in einen Wohngeld-Monatswert umgerechnet; der Fall bleibt für eine eigene Prognose offen. Ein vorhandener monatlicher Bruttobetrag bleibt als Bescheidinformation sichtbar, wird aber nicht zusätzlich gezählt.
4. Bei einer Wohngeld-Prognose, deren sämtliche Quellen Krankengeld mit ausdrücklich modelliertem Netto-/Zahlbetrag sind (`amountType = net` oder `notice`, beziehungsweise `details.transferBasis = net`), werden keine zusätzlichen §-16-Prozentabzüge abgefragt oder angewandt. Das gilt sowohl für die ausdrücklich bestätigte Übernahme als auch für `basis = custom`; der Prognosebetrag wird genau einmal als Netto-/Zahlbetrag verwendet. Gespeicherte allgemeine Statusfelder bleiben unverändert und werden für diesen Pfad nicht ausgewertet. Mischquellen, andere Einkommensarten und nicht ausdrücklich als Netto-/Zahlbetrag modellierte Quellen bleiben von dieser Sonderbehandlung ausgenommen.
5. Beiträge aus dem Krankengeldbescheid (RV, AV und PV) bleiben getrennt speicherbar. Der bereits ausgewiesene Netto-/Zahlbetrag wird nicht nochmals um diese SV-Beiträge gemindert; ein fiktiver KV-Beitrag wird nicht erzeugt.

### Ergebnis
Die Rechenpipeline erhält je Krankengeldquelle höchstens eine monatliche Einnahmeserie für KiZ. Wohngeld erhält bei bestätigter Übernahme genau eine getrennte Prognosequelle mit dem bereits monatlich erfassten Netto-/Zahlbetrag; Brutto bleibt reine Bescheidinformation. Ohne eindeutigen monatlichen Netto-/Zahlbetrag wird keine Wohngeld-Prognose geschätzt.

### Quelle
`SRC-SGBV-47-1`, `SRC-WOGG-2026`, `SRC-PRODUCT-SPEC-2026`.

§ 47 Absatz 1 SGB V (`SRC-SGBV-47-1`) belegt die 30-Tage-Aufbereitung eines vollen Krankengeldmonats. Die ausdrückliche Übernahme des bereits monatlich erfassten Netto-/Zahlbetrags ist eine dokumentierte Produktentscheidung ohne Brutto-Netto-Schätzung; die allgemeine Wohngeld-Prognose bleibt `WG-INCOME-001` zugeordnet.

### Testfälle
Brutto/Netto getrennt, keine Addition, kalendertägliche Umrechnung mit Faktor 30, getrennte SV-Felder ohne Doppelabzug, bestätigte Wohngeld-Übernahme und getrennte eigene Prognose.

## Regel-ID: KIZ-INCOME-ADULT-001

### Bezeichnung
Einkommen erwachsener Personen

### Status
GETESTET

### Zweck
Bereitet Einkommensquellen jeder relevanten erwachsenen Person monatsbezogen und transparent für spätere Minderungsregeln auf, ohne diese Minderung zu berechnen.

### Eingaben
Erwachsenen-`incomeSources` einschließlich `id`, `personRole`, `incomeType`, `customLabel`, `amountType`, `entryMethod`, `monthlyAverage`, sechs `monthlyValues` und `deductions`; Haushaltsform für die Partnerzuordnung.

### Fachliche Regel
1. Einkommen wird getrennt je Person und Quelle über den festen Sechsmonatszeitraum aufbereitet. Vollständige Monatswerte werden addiert und durch sechs geteilt; explizite 0 ist gültig, leere oder negative Werte sind unvollständig.
2. `entryMethod = average` darf den eingegebenen Durchschnitt technisch auf sechs Monate replizieren. Eingaben werden nicht verändert.
3. `employment`, `minijob` und `training` werden nur mit `amountType = gross` als `SUPPORTED_RAW_GROSS` vorbereitet. Eine Brutto-Netto-Schätzung findet nicht statt; tatsächliche Abzüge und Freibeträge werden seit D5 ausschließlich in der nachstehenden Personen-Monatsengine angewandt.
4. `sick-pay` und `unemployment-1` werden mit `amountType = net` oder `notice` als laufende Geldleistung vor bestätigten Abzügen vorbereitet. Arbeitslosengeld I wird nicht als SGB-II-Leistung behandelt.
5. `adult-maintenance` wird bei `net` oder `notice` als laufender Zufluss der erwachsenen Person vorbereitet; keine Kindeseinkommensregel wird angewendet.
6. `parental-allowance` wird als Rohbetrag vorbereitet; seit D5 kann die Personen-Monatsengine ihn mit Elterngeldart und bestätigtem Freibetrag laut Bescheid bereinigen.
7. `pension` bleibt wegen nicht unterscheidbarer Rentenart, Nachzahlung und Erstattungswirkung `OPEN_CHECK`. `self-employed` bleibt mangels Gewinnermittlungsdaten, `rental` mangels Kosten-/Untervermietungsabgrenzung und `education-support` mangels Leistungs-/Zweckanteilsdaten `UNRESOLVED`.
8. `voluntary-service`, `state-benefit` und `other` bleiben ohne konkretere fachliche Merkmale `UNRESOLVED`; `customLabel` wird ausgegeben, aber nicht heuristisch ausgewertet.
9. Kindeseinkommen wird niemals als Elterneinkommen einbezogen. Bei Paaren werden Antragsteller- und Partnerquellen getrennt ausgewertet.
10. `maternity-benefit` und `sgb2-benefit` sind als eigene Kategorien eindeutig auswählbar und werden als dokumentierte Nicht-Einkommen ausgeschlossen. Wohngeld und Kinderzuschlag werden nicht als Einkommensquellen erfasst. Freitext wird weiterhin nicht automatisch als Rechtskategorie interpretiert.
11. Pflegegeld, rückwirkende Sozialleistungen, Nachzahlungen und Erstattungen bleiben mangels der erforderlichen Detailfelder `UNSUPPORTED_SPECIAL_CASE` beziehungsweise dokumentierte Datenlücke.
12. C2 führt eine monatliche Personenaufbereitung ein. Jede der sechs Monatspositionen enthält Zeitraum, getrennte Einkommensquellen, bekannte Rohsumme, direkte Abzugspositionen, personbezogene Ausgaben, `structurallySupportedDeductionTotal`, Warnungen und offene Prüfpunkte.
13. Bis C2 blieben `finalCountableIncome`, `sixMonthTotalAfterFinalCleansing` und `monthlyAverageAfterFinalCleansing` grundsätzlich `null`. Seit D5 werden sie für die nachstehend bestätigten Standardfälle ausgegeben; bei einer relevanten offenen Quelle oder Abzugsregel bleiben sie weiterhin `null`.
14. `maternity-benefit` wird als bestätigtes Nicht-Einkommen klassifiziert. `sgb2-benefit` wird ebenfalls ausgeschlossen, zugleich aber als für andere KiZ-Prüfschritte möglicherweise relevant gekennzeichnet. Keine Anspruchsentscheidung wird daraus abgeleitet.

### Ergebnis
`evaluateAdultIncomeSource(source, context)` liefert Rohmonate, Summe, Durchschnitt, Klassifikation, Status, Quellen-IDs, Gründe, Warnungen und offene Prüfpunkte. `calculateAdultIncomeForMonth(person, monthIndex, context)` führt alle Quellen derselben Person zusammen. `evaluateAdultIncomeForHousehold(state, householdId)` gruppiert nach `applicant` und bei Paaren `partner`, enthält je Person sechs Monatsresultate und gibt unterstützte Endwerte sowie getrennte Erwerbs-/sonstige Durchschnittswerte aus. Relevante offene Fälle liefern weiterhin `null`.

### Sonderfälle
Elterngeldfreibetrag, Rentenart/Nachzahlung, Selbstständigengewinn, Vermietungskosten, Ausbildungsförderungsbestandteile, Pflegegeld, private Versicherung und Erstattungsfälle. Bei erfasstem SGB-II-Bezug bleibt dessen mögliche Wirkung auf andere KiZ-Prüfschritte offen.

### Quelle
`SRC-DA-KIZ-2026-02-20` C.3.2.1.1 und C.3.2.1.2, `SRC-SGBII-11-11B`, `SRC-SGBII-11A`, `SRC-BUERGERGELDV-1`, `SRC-BKGG-6A`.

### Stand
Am 11.07.2026 implementiert, am 12.07.2026 strukturell erweitert und am 14.08.2026 in Phase D5 um die getestete Personen-Monatsbereinigung für Standardfälle ergänzt. Diese Regel selbst führt keine Elternminderung aus; ihr Ergebnis wird seit D6 von `KIZ-REDUCE-PARENT-001` konsumiert.

### Testfälle
- Normalfälle: Beschäftigungsbrutto, Krankengeld/Arbeitslosengeld I laut Bescheid, laufender Erwachsenenunterhalt.
- Grenzfälle: sechs Monatswerte mit 0, fehlender Monat, ungeeigneter Betragstyp.
- Sonderfälle: Elterngeld, Selbstständigkeit, Vermietung, staatliche Leistung und sonstiges Einkommen bleiben transparent offen.

### Fachliche Erweiterung Phase D5 — Status `GETESTET`

1. `KIZ-ADULT-MONTH-001`: Die abschließende Erwachsenenaufbereitung erfolgt streng je Person und je der sechs Kalendermonate vor dem Antragsmonat. Erst nach der Monatsbereinigung werden die sechs Endwerte addiert und stets durch sechs geteilt. Ein Durchschnittswert bedeutet ausschließlich „in allen sechs Monaten gleicher Monatsbetrag“. Ein ungelöster relevanter Monat verhindert den abschließenden Sechsmonatswert dieser Person.
2. `KIZ-ADULT-BINDING-001`: Quellen, direkte Abzüge und Ausgaben bleiben bei Antragsteller/in beziehungsweise Partner/in. Mehrere Quellen einer Person werden vor personenbezogenen Pauschalen und Freibeträgen je Monat zusammengeführt. Kinderbeträge und Beträge der anderen erwachsenen Person werden nicht übertragen.
3. `KIZ-ADULT-CLASS-001`: `employment`, `minijob` und bestätigte `training` sind `EARNED`; `sick-pay`, `unemployment-1`, `adult-maintenance` und bestätigtes `parental-allowance` sind `OTHER`; `maternity-benefit` und `sgb2-benefit` sind `NON_INCOME`; Renten, Selbstständigkeit, Vermietung, Ausbildungsförderung, Freiwilligendienst, generische staatliche Leistung und sonstiges Einkommen bleiben `UNRESOLVED`.
4. `KIZ-ADULT-DIRECT-001`: Erwerbsquellen beginnen beim Brutto. Tatsächlich gezahlte Steuern werden nur im eingegebenen Betrag abgezogen. Kranken-, Pflege-, Renten- und Arbeitslosenversicherungsbeiträge werden nur bei aktiviertem Eintrag, vollständiger Betragsserie und `mandatoryStatus = yes` abgezogen. `unknown` blockiert; `no` wird nicht als Pflichtbeitrag abgezogen. Es erfolgt keine Brutto-Netto-Schätzung.
5. `KIZ-ADULT-TRAINING-001`: `training` verwendet den Grundabsetzbetrag nach § 11b Absatz 2b nur bei `u25SpecialAllowanceStatus = yes`; `no` verwendet Absatz 2, `unknown` blockiert. Der für Monate 2026 bestätigte Grenzbetrag ist 603 EUR.
6. `KIZ-ADULT-PARENTAL-001`: Elterngeld ist nur mit dem ausdrücklich als `confirmedExemptionMonthly` erfassten monatlichen Freibetrag laut Bescheid/Elterngeldstelle automatisierbar; explizite 0 ist gültig, leer blockiert. Angesetzt wird höchstens der kleinere Betrag aus Zufluss, bestätigtem Freibetrag und 300 EUR bei `basis` beziehungsweise 150 EUR bei `plus`; der Rest ist `OTHER`. Eine unbekannte Leistungsart blockiert. Eine eigene vorgeburtliche BEEG-Einkommensberechnung findet nicht statt.
7. `KIZ-ADULT-EMPTY-001`: Eine relevante Person erhält sechs Endwerte 0 und Status `SUPPORTED` nur bei `incomeStatus = none` und leerer Quellenliste. `unknown` beziehungsweise `present` ohne Quelle bleibt `UNRESOLVED` mit `null`-Endwerten; Quellen bei `none` sind widersprüchlich.
8. Die Regel erzeugt `regularIncome` je Einkommensklasse und den bereinigten Sechsmonatsdurchschnitt. Sie führt weder `KIZ-REDUCE-PARENT-001` noch eine 45-/100-Prozent-Minderung, Vermögensprüfung, Wohngeldrechnung, Bedarfsdeckungsprüfung, Schlussrundung oder Anspruchsentscheidung aus.

Die Erweiterung verwendet `KIZ-ADULT-DEDUCTION-001`. `evaluateAdultIncomeForHousehold` liefert zusätzlich je Person `monthlyCountableIncome`, `sixMonthTotalAfterFinalCleansing`, `monthlyAverageAfterFinalCleansing`, einen Monats-Ledger und einen haushaltsbezogenen Zwischenwert `regularIncome`. Die bisherigen Roh- und Strukturfelder bleiben aus Kompatibilitätsgründen erhalten.

Quelle: `SRC-BKGG-6A` Absatz 8; `SRC-DA-KIZ-2026-02-20` C.3.2.1.1 und C.3.2.1.2; `SRC-SGBII-11-11B`; `SRC-FW-SGBII-11-11B-2024-10-24`; `SRC-BEEG-10`. Fachlich bestätigt am 14.08.2026 vor Implementierung der Phase D5.

Umgesetzt am 14.08.2026 mit 86 neuen Erwachsenen-, Abzugs-, Migrations- und Validierungstests sowie 16 neuen Kindergeldüberschuss-Tests. Der vollständige Regressionslauf umfasst 544 bestandene Tests.

### Statusvertrag `KIZ-ADULT-EMPTY-001`

Die explizite Statusfrage verhindert, dass eine noch nicht beantwortete Einkommensangabe allein wegen einer leeren Quellenliste als 0 EUR behandelt wird. Sie gilt getrennt für `applicantIncomeStatus` und bei einem Paar für `partnerIncomeStatus`.

| Status | Einkommensquellen | Semantik und Rechenergebnis |
|---|---|---|
| `present` | mindestens eine Quelle | Einkommen ist bestätigt vorhanden. Die Quellen werden regulär ausgewertet; offene Quellen- oder Abzugsdaten lassen den Personenwert `UNRESOLVED`. |
| `present` | leer | Widersprüchlich unvollständig; kein 0-EUR-Wert, sondern `UNRESOLVED`. |
| `none` | leer | Explizit bestätigt kein Einkommen; sechs Monatswerte 0 und Personenstatus `SUPPORTED`. |
| `none` | mindestens eine Quelle | Widerspruch zwischen Status und Daten; die Quellen werden nicht als bestätigte Nullangabe verdrängt und das Ergebnis bleibt `UNRESOLVED`. |
| `unknown` | beliebig | Die Statusfrage ist unbeantwortet; es wird weder `none` noch 0 EUR abgeleitet und die Berechnung bleibt `UNRESOLVED`. |

Eine leere Einkommensquellenliste besitzt damit keine eigenständige Nullsemantik. Nur die Kombination `none` plus leere Liste ist ein bestätigter Nullfall. Migration, Rendering und Navigation dürfen `unknown` nicht konkretisieren; ein fehlendes Altfeld mit bereits vorhandenen Quellen wird lediglich defensiv als `present` eingeordnet.

Die Formalvalidierung verwendet `ADULT_INCOME_STATUS_REQUIRED` für `unknown`, `ADULT_INCOME_SOURCE_MISSING` für `present` ohne Quelle und `ADULT_INCOME_STATUS_SOURCE_CONTRADICTION` für `none` mit Quellen. D5 reicht dieselben fachlichen Open Checks weiter; die Mindesteinkommensstufe adressiert statusbedingt offene Personen zusätzlich rollenbezogen, zum Beispiel `ADULT_INCOME_STATUS_REQUIRED:applicant`. Solange ein solcher Widerspruch oder eine offene relevante Quelle besteht, bleiben `monthlyAverageAfterFinalCleansing`, `regularIncome`, `preparedForParentReduction` und nachfolgende Stufen `null` beziehungsweise `UNRESOLVED`.

Regressionen: `tests/income-rules-tests.js` prüft `unknown` und den bestätigten Nullfall; `tests/validation-tests.js` prüft die Formalfehler; `tests/parent-need-tests.js` prüft die defensive Migration; `tests/adult-income-cleansing-tests.js` und `tests/income-wizard-bug-tests.js` sichern Statuspropagation, Widerspruch und Nichtmutation.

## Regel-ID: KIZ-ADULT-DEDUCTION-001

### Bezeichnung
Abschließende Abzüge beim Einkommen erwachsener Personen

### Status
GETESTET

### Zweck
Berechnet die in Phase D5 sicher automatisierbaren Abzüge genau einmal je Person und Monat und hält offene Abzugsarten von abschließenden Werten fern.

### Eingaben
Je Person und Monat aggregiertes Erwerbsbrutto und sonstiges Einkommen; direkte Abzüge; personbezogene Ausgaben mit ihren Bestätigungsfeldern; bekannte minderjährige SGB-II-BG-Mitglieder des Haushalts.

### Fachliche Regel
1. `KIZ-ADULT-BASIC-001`: Bei positivem Erwerbsbrutto wird grundsätzlich ein Grundabsetzbetrag von höchstens 100 EUR auf das Erwerbseinkommen angewandt. Beträge nach § 11b Absatz 1 Nummer 3 bis 5 sind darin enthalten und werden nicht zusätzlich verdoppelt.
2. `KIZ-ADULT-INSURANCE-FLAT-001`: Bei ausschließlich positivem sonstigem Einkommen wird die Versicherungspauschale von höchstens 30 EUR einmal je Person und Monat abgezogen. Bei gleichzeitigem Erwerbseinkommen ist sie durch den Grundabsetzbetrag beziehungsweise die tatsächlichen Aufwendungen abgedeckt und wird nicht zusätzlich angesetzt.
3. `KIZ-ADULT-ACTUAL-001`: Übersteigt Erwerbsbrutto 400 EUR und übersteigen die bestätigten tatsächlichen Beträge nach § 11b Absatz 1 Nummer 3 bis 5 insgesamt 100 EUR, treten diese tatsächlichen Beträge an die Stelle des 100-EUR-Grundabsetzbetrags. Abzüge werden auf das jeweils vorhandene Einkommen begrenzt.
4. `KIZ-ADULT-TRANSFER-001`: Nicht auf Erwerbseinkommen verbrauchte bestätigte Beträge nach Nummer 3 und 4 dürfen auf sonstiges Einkommen derselben Person und desselben Monats übertragen werden. Der nicht verbrauchte Teil des pauschalen 100-EUR-Grundabsetzbetrags wird nicht übertragen. Beträge nach Nummer 5 werden nie übertragen. Damit ergeben 40 EUR Erwerb, 150 EUR sonstiges Einkommen und 65 EUR Nummer-3/4-Aufwand einen Übertrag von 25 EUR; bei 150 EUR Erwerb und 105 EUR Nummer-3/4-Aufwand beträgt er 5 EUR.
5. `KIZ-ADULT-EARNED-TIER-001`: Der Erwerbstätigenfreibetrag wird auf das monatlich aggregierte Brutto berechnet: 20 Prozent des Teils über 100 bis 520 EUR, 30 Prozent über 520 bis 1.000 EUR und 10 Prozent über 1.000 bis 1.200 EUR. Die Obergrenze beträgt 1.500 EUR, wenn mindestens ein minderjähriges Kind als SGB-II-BG-Mitglied dieses Haushalts bestätigt ist. Bei Brutto über 1.200 EUR ohne geklärten Status eines möglicherweise außerhalb der BG lebenden minderjährigen Kindes bleibt dieser Teil offen.
6. `KIZ-ADULT-COMMUTE-001`: Bei Detailerfassung werden 0,20 EUR je vollem Entfernungskilometer der kürzesten Straßenverbindung und Arbeitstag angesetzt. Ist zumutbarer öffentlicher Verkehr mit `reasonablePublicTransport = yes` bestätigt, gilt der niedrigere Betrag aus Kraftfahrzeugpauschale und `monthlyPublicTransportAlternativeCost`; bei `no` die Kraftfahrzeugpauschale, bei `unknown` bleibt die Position offen. Ein direkt eingegebener Fahrtbetrag ist nur bei `legalDeductibleAmountConfirmed = yes` abschließend abzugsfähig. Doppelte Fahrtkostenpositionen für denselben Weg bleiben offen.
7. `KIZ-ADULT-CAR-001`: Kfz-Haftpflicht ist nur mit `liabilityOnlyConfirmed = yes` und `proofStatus = complete` als Betrag nach Nummer 3 abzugsfähig. Schutzbrief- oder Kaskobestandteile werden nicht geschätzt.
8. `KIZ-ADULT-CHILDCARE-001`: Kinderbetreuung ist nur bei `pureCareCostsConfirmed = yes` und `incomeConnectionConfirmed = yes` als Betrag nach Nummer 5 abzugsfähig. Essens- und sonstige Mischbestandteile sowie eine erforderliche Übertragung auf den anderen Elternteil bleiben offen.
9. `KIZ-ADULT-MAINTENANCE-001`: Tatsächlich gezahlter Unterhalt wird nur bei `legalObligationConfirmed = yes` und ausdrücklichem `titleOrNotarialMonthlyMaximum` berücksichtigt, höchstens mit dem kleineren Betrag. Eine zwischen Erwerbs- und sonstigem Einkommen entscheidungserhebliche Zuordnung bleibt offen.
10. Altersvorsorge, Gewerkschaft, sonstige Arbeitsmittel, doppelte Haushaltsführung, Verpflegungsmehraufwand, `otherRegular` und generische sonstige Ausgaben bleiben mit positionsbezogenem offenen Prüfpunkt ungelöst. Kein Freitext wird rechtlich interpretiert.
11. Jeder angewandte Abzug enthält Regel-ID, Person-Monatsschlüssel, Eingabebetrag, begrenzten Betrag, Einkommensbucket und Begründung. IDs werden nicht doppelt gezählt; das Eingabeobjekt wird nicht verändert.

### Ergebnis
Monatliche Abzugs-Ledger mit `basicAllowance`, tatsächlichen Nummer-3/4- und Nummer-5-Beträgen, `insuranceFlat`, `transferredNr3And4`, `earnedIncomeAllowance`, begrenzten Einzelpositionen, Endwert oder `null`, Status, Warnungen und offenen Prüfpunkten.

### Quelle
`SRC-SGBII-11-11B` § 11b Absatz 1 bis 3; `SRC-FW-SGBII-11-11B-2024-10-24` Rz. 11.150 bis 11.155; `SRC-BUERGERGELDV-1` § 6 Absatz 1 Nummer 1 und Absatz 2; `SRC-DA-KIZ-2026-02-20` C.3.2.1.1 Absätze 11 bis 13.

### Stand
Fachlich bestätigt am 14.08.2026 vor Implementierung, anschließend in `calculator.js` umgesetzt und mit `tests/adult-income-cleansing-tests.js` geprüft. Die getrennte Elternminderung gehört nicht zu dieser D5-Regel und ist seit D6 unter `KIZ-REDUCE-PARENT-001` getestet.

### Testfälle
100-EUR-Grundbetrag, 30-EUR-Pauschale, tatsächliche Aufwendungen über 100 EUR, beide Übertragungsbeispiele, sämtliche Erwerbstätigenstufen und die 1.200-/1.500-EUR-Grenze, Fahrtkosten mit/ohne ÖPNV, Kfz-Haftpflicht, reine Kinderbetreuung, titulierter Unterhalt, offene Sonderfälle und Nicht-Mutation.

## Regel-ID: KIZ-CHILD-BENEFIT-SURPLUS-001

### Bezeichnung
Kindergeldüberschuss als vorbereitetes Einkommen der kindergeldberechtigten erwachsenen Person

### Status
GETESTET

### Zweck
Ermittelt einen Kindergeldanteil, der nach Deckung des Kindesbedarfs verbleibt, und ordnet ihn ausschließlich als vorbereiteten Sonderbetrag für eine spätere Elternminderung zu.

### Eingaben
Ergebnisse aus `KIZ-CHILD-SGBII-NEED-001`, `KIZ-REDUCE-CHILD-001` und `KIZ-SGBII-BG-MEMBERSHIP-001`, Kindergeldbetrag 259 EUR, `childBenefitAt`, `childBenefitPerson`, `halfForwarded`, Haushalts- und Personenzuordnung.

### Fachliche Regel
1. `remainingChildNeed = max(0, totalChildNeed - childIncomeReduction)`. Ohne bestätigte Weiterleitung ist der zur Bedarfsdeckung verwendete Kindergeldanteil `min(259, remainingChildNeed)` und `childBenefitSurplus = max(0, 259 - remainingChildNeed)`.
2. Der Überschuss gehört nicht zum Kindeseinkommen und wird nicht noch einmal durch `KIZ-REDUCE-CHILD-001` gemindert. Er wird der in `childBenefitPerson` ausdrücklich benannten Antragsteller- oder Partnerrolle nur dann zugeordnet, wenn `childBenefitAt` dem betrachteten Haushalt entspricht.
3. Unbekannter oder widersprüchlicher Kindergeldort beziehungsweise eine nicht zum Haushalt passende Personenzuordnung blockiert. Bei dem im Datenmodell ausdrücklich als nachgewiesene hälftige Weiterleitung definierten `halfForwarded = true` werden im Haushalt der kindergeldberechtigten Person 129,50 EUR als tatsächlich verbliebener Kindergeldanteil angesetzt; 129,50 EUR gelten als weitergeleitet. Verwendeter Anteil und Überschuss ergeben dann nachvollziehbar 129,50 EUR. Für D5 verweist § 6a Abs. 5 und 6 BKGG auf die Einkommenssystematik des SGB II; § 6a Abs. 3 BKGG grenzt die Kindeseinkommensminderung ab und schließt Kindergeld bei der direkten Kind-KiZ-Minderung aus. Die Zuordnung von Kindergeld als Einkommen des Kindes folgt ergänzend § 11 Abs. 1 SGB II. Die BA-Fachlichen Weisungen zur temporären Bedarfsgemeinschaft belegen hierzu die Verwaltungspraxis für tatsächlich weitergeleitete Teilbeträge (TBG.20/TBG.21, Beispiel 2: 259 EUR, davon 86,33 EUR weitergeleitet und 172,67 EUR verbleibend) sowie die hälftige Bedarfsberücksichtigung im echten Wechselmodell (TBG.14). Die 129,50-EUR-Behandlung ist daraus eine eng begrenzte Projektableitung/Analogie für den bereits ausdrücklich modellierten bestätigten 50/50-Boolean, keine ausdrückliche KiZ-Weisungsformel. Sie wird nicht auf freie Quoten, bloße Behauptungen, vollständige Weiterleitung oder Abzweigungen erweitert.
4. Besteht nach der SGB-II-BG-Prüfung kein weiteres mögliches eigenes KiZ-Kind im Haushalt, wird kein fiktiver Elternminderungsbetrag erzeugt. Der rechnerische Überschuss bleibt sichtbar, `amountForParentReduction` ist 0 und der Status lautet `NO_REMAINING_KIZ_CHILD`.
5. Kindesvermögen wird in D5 nicht geprüft. Daher kennzeichnet jedes Ergebnis `assetImpactStatus = NOT_EVALUATED`; auch bei rechnerisch 0 EUR wird daraus kein endgültig gesicherter Nullbetrag für die Gesamtentscheidung abgeleitet.
6. Der Haushaltszwischenwert enthält getrennt `regularIncome`, `specialOtherIncome` und `preparedForParentReduction = regularIncome + specialOtherIncome`. Er führt `KIZ-REDUCE-PARENT-001`, 45-/100-Prozent-Minderung, Vermögen, Wohngeld, Bedarfsdeckung, Schlussrundung und Endanspruch nicht aus.

### Ergebnis
Je Kind: Restbedarf, verwendeter Kindergeldanteil, Überschuss, zugeordnete Person, für die spätere Elternminderung vorbereiteter Betrag, Status, Vermögenshinweis, Warnungen und offene Prüfpunkte. Je Haushalt und Person: `regularIncome`, `specialOtherIncome`, `preparedForParentReduction`.

### Quelle
`SRC-DA-KIZ-2026-02-20` C.2.2.1 Absätze 1 bis 4 und C.3.2.1.1 zur Zuordnung eines nicht zur Bedarfsdeckung benötigten Kindergeldanteils; `SRC-BKGG-6A` Absätze 3, 5 und 6; `SRC-SGBII-11`; `SRC-FW-TBG-2026-01-12` (TBG.14, TBG.20/TBG.21, Beispiel 2). Die TBG-Weisung beschreibt Verwaltungspraxis für SGB-II-Bedarfsgemeinschaften; die konkrete 129,50-EUR-Projektableitung für `halfForwarded = true` ist keine wörtliche KiZ-Weisungsformel.

### Stand
Fachlich bestätigt am 14.08.2026 vor Implementierung der Phase D5, anschließend in `calculator.js` umgesetzt und mit `tests/child-benefit-surplus-tests.js` geprüft. Kindesvermögen und Elternminderung bleiben ausdrücklich außerhalb dieser Regel.

### Testfälle
Restbedarf oberhalb, gleich und unterhalb von 259 EUR; amtliches Zahlenbeispiel; richtige Antragsteller-/Partnerzuordnung; falscher/äußerer/unbekannter Bezug; Halbweiterleitung; kein verbleibendes KiZ-Kind; mehrere Kinder; Null- und Dezimalgrenzen; Vermögenshinweis und Nicht-Mutation.

## Regel-ID: KIZ-INCOME-CHILD-001

### Bezeichnung
Einkommen von Kindern

### Status
GETESTET

### Zweck
Ermittelt das nach §§ 11 bis 11b SGB II zu berücksichtigende Einkommen eines Kindes für jeden der sechs Bemessungsmonate und daraus den Sechsmonatsdurchschnitt, soweit die Eingaben und die Rechtslage eine sichere Automatisierung erlauben. Die spätere Minderung um 45 Prozent gehört nicht zu dieser Regel.

### Eingaben
`hasOwnIncome`, Alter, `eligiblePrivateInsuranceStatus`, Kinder-`incomeSources`, Einkommensart, Unterart, Betragstyp, Monatswerte sowie bei Erwerbseinkommen die tatsächlich entrichteten Steuern und Pflichtbeiträge zur Sozialversicherung als Durchschnitt oder sechs Monatswerte.

### Fachliche Regel
1. `KIZ-CHILD-MONTH-001`: Die sechs Kalendermonate vor dem Antragsmonat werden einzeln bereinigt. `average` repliziert einen ausdrücklich eingegebenen nicht negativen Betrag auf sechs Monate; `monthly` verlangt genau sechs Werte. Explizite 0 ist gültig. Fehlende oder negative Pflichtwerte bleiben unvollständig. Erst nach der monatlichen Bereinigung werden die sechs Endwerte addiert und immer durch sechs geteilt. Ist ein relevanter Monat ungelöst, sind `countableSixMonthTotal` und `countableChildIncomeAverage` `null`.
2. `KIZ-CHILD-BINDING-001`: Sämtliche Quellen und Abzüge bleiben an genau das Kind gebunden. Einkommen wird weder einem Geschwister noch einer erwachsenen Person zugerechnet und fließt nicht in `KIZ-MIN-INCOME-001` ein. Mehrere Quellen desselben Kindes werden erst in derselben Personen-Monatsposition zusammengeführt.
3. `KIZ-CHILD-NON-EARNED-001`: Tatsächlich zugeflossener laufender Unterhalt und Unterhaltsvorschuss mit Auszahlungs-/Bescheidbetrag sowie eine ausdrücklich als laufend gekennzeichnete Waisenrente werden als nicht erwerbsbezogenes Einkommen angesetzt. Fiktive, titulierte aber nicht gezahlte Ansprüche werden nicht erzeugt. `orphan-pension` mit `backpay` oder `unknown` bleibt ungelöst; eine Nachzahlung wird nicht auf den KiZ-Bemessungszeitraum verteilt.
4. `KIZ-CHILD-INSURANCE-001`: Die 30-Euro-Pauschale nach § 6 Absatz 1 Nummer 1 oder 2 GrusiGV ist ein Personenabzug und wird höchstens einmal je Kind und Monat angesetzt. Bei Minderjährigen gilt sie nur bei `eligiblePrivateInsuranceStatus = yes`; `no` ergibt keinen Abzug, `unknown` blockiert einen sonst berechenbaren positiven Nicht-Erwerbsbetrag. Bei Volljährigen wird Nummer 1 angewandt. Die Pauschale ist im Grundabsetzbetrag nach § 11b Absatz 2 oder 2b enthalten und wird deshalb nicht zusätzlich angesetzt, wenn in demselben Monat ein solcher Erwerbs-Grundabsetzbetrag verbraucht wird. Kein Abzug erzeugt einen negativen Betrag.
5. `KIZ-CHILD-EXCLUSION-001`: Kindergeld, Kinderzuschlag, Wohngeld, SGB-II-Leistungen sowie Bildungs- und Teilhabeleistungen gehören nicht zu den acht erfassbaren Kindeseinkommensarten. Der bereits eng bestätigte `side-job/school-holiday-only` einer unter 25-jährigen Schülerin oder eines Schülers bleibt nach § 11a Absatz 7 SGB II vollständig ausgeschlossen. Ausbildungsvergütung fällt nie unter diese Ausnahme. Unklare Ferienabgrenzungen bleiben ungelöst.
6. `KIZ-CHILD-EARNED-001`: Ausbildungsvergütung, normaler Nebenjob, bestätigter Schülerjob außerhalb der Ferien und bestätigtes reines Taschengeld aus Jugend-/Bundesfreiwilligendienst beginnen beim Monatsbrutto. Tatsächlich entrichtete Steuern und Pflichtbeiträge zur Sozialversicherung werden nur in ausdrücklich erfasster Höhe abgezogen; 0 ist zulässig, leer bleibt ungelöst. Eine Brutto-Netto-Schätzung findet nicht statt. Erwerbseinkommen mehrerer Quellen desselben bestätigten Regimes wird pro Person und Monat gemeinsam bereinigt.
7. `KIZ-CHILD-BASIC-001`: Für ein erwerbsfähiges Kind ab 15 Jahren gilt beim bestätigten normalen Erwerbsfall § 11b Absatz 2 mit 100 Euro anstelle der Beträge nach Absatz 1 Nummer 3 bis 5. Bei mehr als 400 Euro bleibt ohne Nachweis höherer Beträge der gesetzliche Grundbetrag von 100 Euro maßgeblich; es werden keine höheren tatsächlichen Aufwendungen erfunden.
8. `KIZ-CHILD-BASIC-2B-001`: Bei einem 15- bis 24-jährigen Kind wird § 11b Absatz 2b nur bei sicher bestätigter Förderfähigkeit der Ausbildung, `side-job/student-regular` oder `voluntary-service/pocket-money-only` angewandt. Der Grenzbetrag beträgt in Monaten 2026 603 Euro (in Monaten 2025: 556 Euro gemäß DA-KiZ). Er mindert ausschließlich das Erwerbseinkommen und wird nicht auf Unterhalt, UVG, Waisenrente oder Ausbildungsförderung übertragen. Widersprüchliche Erwerbsregime im selben Monat bleiben ungelöst.
9. `KIZ-CHILD-EARNED-TIER-001`: Zusätzlich wird § 11b Absatz 3 anhand des Monatsbruttos berechnet: 20 Prozent über 100 bis 520 Euro, 30 Prozent über 520 bis 1.000 Euro und 10 Prozent über 1.000 bis 1.200 Euro. Im Fall des Absatzes 2b entfällt ausschließlich die erste 20-Prozent-Stufe. Weil das Datenmodell die Voraussetzung für die erhöhte Obergrenze 1.500 Euro nicht erfasst, bleibt Erwerbsbrutto über 1.200 Euro ungelöst. Die tatsächlich angesetzten Gesamtabzüge werden auf das vorhandene Erwerbseinkommen begrenzt.
10. `KIZ-CHILD-EDUCATION-001`: BAföG, BAB und Ausbildungsgeld bleiben getrennte Unterarten. Wegen möglicher ausgeschlossener Bescheidbestandteile und nicht erfasster höherer Ausbildungskosten wird der Gesamtbetrag weiterhin nicht pauschal voll angerechnet. Die Monatsengine dokumentiert, dass der mindestens 100 Euro betragende Abzug nach § 11b Absatz 2b Satz 4 nicht nochmals verwendet werden darf, wenn der Bereich bereits durch einen Erwerbs-Grundabsetzbetrag verbraucht ist. Generische Stipendien, unbekannte Förderbestandteile und sonstige Förderungen bleiben ungelöst.
11. `KIZ-CHILD-DEDUCTION-ONCE-001`: Jeder personenbezogene Grund- oder Versicherungsabzug erhält Metadaten mit Betrag, Rechtsgrundlage, `appliedTo` und `personMonthlyKey`. Die Monatsengine führt einen gemeinsamen Abzugs-Ledger und verhindert damit eine quellenweise Vervielfachung.
12. `other`, Freiwilligendienst mit Mischbestandteilen, unbekannte Unterarten, Nachzahlungen und sonstige nicht sicher klassifizierbare Einnahmen bleiben mit konkretem `openCheck` ungelöst. Eigene Bezeichnungen und Eingaben bleiben unverändert.
13. Bei ausdrücklich keinem Kindeseinkommen liefert die Regel sechs Monatswerte 0, `countableSixMonthTotal = 0`, `countableChildIncomeAverage = 0` und `status = SUPPORTED`.
14. Keine 45-Prozent-Minderung, keine Regel `KIZ-REDUCE-CHILD-001`, keine Elternminderung und kein KiZ-Endbetrag werden ausgeführt.

### Ergebnis
`calculateChildIncomeForMonth(child, monthIndex, context)` liefert Quellenpositionen, Rohsumme, ausgeschlossene Summe, bekannte Abzüge mit Regel-ID und Personen-Monatsschlüssel, den Monats-Endwert oder `null`, Status, Warnungen und offene Prüfpunkte. `evaluateChildIncome(child, context)` liefert sechs solche Monatspositionen, `monthlyCountableChildIncome`, `rawSixMonthTotal`, `countableSixMonthTotal`, `countableChildIncomeAverage` und aus Kompatibilitätsgründen `countableAfterConfirmedDeductions` mit demselben Durchschnittswert.

### Sonderfälle
Unterhalts-/Renten-/Fördernachzahlungen, unbekannter Rentencharakter, Erwerbseinkommen ohne explizite Steuer-/SV-Werte, Alter unter 15 bei Erwerbseinkommen, widersprüchliche Erwerbsregime, Brutto über 1.200 Euro ohne Information zur gesetzlichen 1.500-Euro-Grenze, Nebenjob mit unbekannter Situation, Ferien-Schülerjob ohne sämtliche Voraussetzungen, Förderbescheidbestandteile, Stipendien und Freiwilligendienst mit weiteren Leistungsbestandteilen.

### Quelle
`SRC-BKGG-6A` Absatz 3 und 8; `SRC-SGBII-11-11B` § 11b Absatz 1, 2, 2b und 3; `SRC-SGBII-11A` Absatz 3 und 7; `SRC-BUERGERGELDV-1` § 6 Absatz 1 Nummer 1 und 2; `SRC-DA-KIZ-2026-02-20` C.2.2 und C.2.2.1, insbesondere Absätze 1 bis 4. Ergänzend Fachliche Weisungen §§ 11 bis 11b SGB II, Stand 24.10.2024, Rz. 11.150 bis 11.153; für den Wert 603 Euro und die KiZ-Anwendung ist die jüngere DA-KiZ vom 20.02.2026 maßgeblich.

### Stand
Phase D1.5 wurde am 13.08.2026 vor der Implementierung anhand der amtlichen Fassungen und der DA-KiZ 20.02.2026 fachlich bestätigt, anschließend implementiert und mit 50 neuen D1.5-Tests sowie allen 207 damaligen Tests geprüft. Die Einkommensaufbereitung bleibt von der nachgelagerten, nun unter eigener Regel-ID getesteten Minderung `KIZ-REDUCE-CHILD-001` getrennt.

### Testfälle
- Normalfälle: sechs monatliche Endwerte/Divisor sechs; Unterhalt, UVG und laufende Waisenrente; normale und nach Absatz 2b privilegierte Erwerbsfälle; Ausbildungsvergütung mit expliziten Steuern/SV; kein Einkommen.
- Grenzfälle: explizite 0, leerer Monat, 30-Euro-Pauschale nur einmal und höchstens bis 0, 100-/603-Euro-Grenze, alle Stufen des Absatzes 3, kein Übertrag auf Nicht-Erwerbseinkommen.
- Sonderfälle: Quellenkombinationen, keine doppelten Grundabzüge, ungelöste Nachzahlungen/Förderbestandteile/Stipendien/Mischleistungen, defensive Migration, Validierung und unveränderte Eingabeobjekte.

## Regel-ID: KIZ-DEDUCTION-001

### Bezeichnung
Abzüge und weitere Ausgaben

### Status
GETESTET

### Zweck
Bereitet vorhandene direkte Abzüge und weitere Ausgaben je Person einzeln auf, ohne nicht bestätigte Pauschalen oder endgültiges bereinigtes Einkommen zu berechnen.

### Eingaben
`deductions`, `applicantExpenses`, `partnerExpenses`, Fahrtkostendetails.

### Fachliche Regel
1. Jeder aktivierte direkte Abzug und jede Ausgabe erhält `SUPPORTED`, `EXCLUDED`, `UNRESOLVED` oder `MISSING_REQUIRED_DATA`. Ein Häkchen ohne Betrag erzeugt niemals einen Betrag.
2. Tatsächlich eingegebene, nicht negative Beträge für `tax`, `pensionInsurance` und `unemploymentInsurance` werden als direkte Steuern beziehungsweise Pflichtbeiträge strukturell `SUPPORTED`; es wird kein Beitrag berechnet.
3. `healthInsurance` und `careInsurance` bleiben wegen fehlender Unterscheidung zwischen gesetzlich/privat, Erst-/Folgeantrag und Basistarif `UNRESOLVED_INSURANCE_TYPE`.
4. `otherRegular` bleibt ohne bestätigte Einzelregel `UNRESOLVED`.
5. `public-transport` mit tatsächlichem Monatsbetrag wird als notwendige Ausgabe strukturell vorbereitet. `commute` mit direkt eingegebenem tatsächlichem Betrag kann strukturell vorbereitet werden; bei Entfernung/Arbeitstagen ohne bestätigten Satz gilt `UNRESOLVED_RATE_REQUIRED`.
6. `car-liability` bleibt ohne Trennung von Haftpflicht, Schutzbrief und sonstigen Bestandteilen `UNRESOLVED`. Es wird keine Kürzung geschätzt.
7. `childcare` bleibt ohne Trennung reiner Betreuungskosten von Essen/sonstigen Kosten und ohne Wahlrechtsdaten `UNRESOLVED`.
8. `paid-maintenance` bleibt ohne Titel oder notarielle Verpflichtung `UNRESOLVED`.
9. `retirement`, `union`, `work-expenses`, `double-household`, `meal-extra` und `other` bleiben ohne bestätigte Detailregel `UNRESOLVED`.
10. Die 100-EUR-Pauschale, Erwerbstätigenfreibeträge und sonstige automatisch berechnete Abzüge sind nicht Bestandteil dieser Phase.
11. Direkte Abzüge verwenden ab Datenversion 5 je Position `enabled`, `entryMethod`, `monthlyAverage` und sechs `monthlyValues`. Alte Felder wie `tax: true` und `taxAmount` werden verlustfrei als `average` migriert; leer bleibt leer und explizite 0 bleibt 0.
12. Personbezogene Ausgaben mit direkter Betragseingabe verwenden ebenfalls `entryMethod`, `monthlyAverage` und sechs `monthlyValues`. `commuteMode = details` bleibt ohne Euroberechnung.
13. Jede strukturell unterstützte Position enthält Monatswerte und `isFinalDeductibleAmount = false`. `structurallySupportedTotal` bezeichnet nur die Summe strukturell verstandener Durchschnittspositionen; `supportedTotal` bleibt ausschließlich als dokumentierter Rückwärtskompatibilitätsalias erhalten. `finalDeductibleTotal` bleibt ausdrücklich `null`, solange die endgültige rechtliche Abzugsprüfung nicht implementiert ist.
14. Offensichtlich doppelte technische Positions-IDs erzeugen `DUPLICATE_DEDUCTION_POSITION_ID`; es erfolgt keine stille Doppelzählung.

### Ergebnis
`evaluateDirectDeductions(deductions, context)`, `evaluateExpense(expense, context)` und `evaluateDeductionsForPerson(incomeSources, expenses, context)` liefern Einzelpositionen mit sechs Monatswerten, Durchschnitt, Sechsmonatssumme, Status, Quellen, Gründen, Warnungen und offenen Prüfpunkten. Nur eindeutig strukturell unterstützte Beträge werden als solche summiert; ein endgültiger gesetzlicher Gesamtabzug bleibt ausdrücklich unaufgelöst.

### Sonderfälle
Private Kranken-/Pflegeversicherung, Kfz-Schutzbrief, gemischte Betreuungskosten, Entfernungspauschale, freiwilliger Unterhalt und unbestimmte sonstige Ausgaben.

### Quelle
`SRC-DA-KIZ-2026-02-20` C.3.2.1.1 Absätze 11 bis 13, `SRC-SGBII-11-11B`, `SRC-PRODUCT-SPEC-2026`.

### Stand
Am 11.07.2026 implementiert und am 12.07.2026 um Monatsserien, Migration, eindeutige Summenbezeichnungen und Dublettenwarnung erweitert. Getestet in `tests/income-rules-tests.js` und `tests/income-precision-tests.js`. Vollständige §-11b-Bereinigung bleibt offen.

### Testfälle
- Normalfall: tatsächlicher Steuerabzug mit Betrag.
- Grenzfälle: ausdrücklich 0 EUR und aktivierter Abzug ohne Betrag.
- Sonderfälle: private Versicherung, Kfz-Haftpflicht, Kinderbetreuung, Fahrtkostendetails und geleisteter Unterhalt bleiben mit konkretem offenen Prüfpunkt nachvollziehbar.

## Regel-ID: KIZ-MIN-INCOME-001

### Bezeichnung
Mindesteinkommensgrenze

### Status
GETESTET

### Zweck
Prüft die Mindesteinkommensgrenze eines Haushalts ausschließlich mit den im aktuellen Datenmodell eindeutig bewertbaren Erwachsenen-Einkommensquellen.

### Eingaben
Haushalts-ID, `households.A/B.adults`, `applicantIncomeSources`, bei Paaren `partnerIncomeSources`, jeweils `incomeType`, `amountType`, `entryMethod`, `monthlyAverage` und sechs `monthlyValues`.

### Fachliche Regel
1. Die Grenze beträgt bei `adults = single` 600 EUR und bei `adults = couple` 900 EUR monatlich. Exakte Gleichheit erreicht die Grenze.
2. Maßgeblich ist der Durchschnitt des festen Sechsmonatszeitraums. Sechs Monatswerte einschließlich 0 werden addiert und durch sechs geteilt. Bei `entryMethod = average` repräsentiert der vorhandene Durchschnitt jeden der sechs Monate.
3. Eine leere Quellenliste entspricht nur bei ausdrücklich bestätigtem `incomeStatus = none` 0 EUR. Bei `unknown` oder `present` ohne Quelle bleibt die Prüfung `UNRESOLVED`; eine angelegte unvollständige Quelle entspricht niemals 0 EUR.
4. Beschäftigung, Minijob und Ausbildungsvergütung werden nur mit `amountType = gross` berücksichtigt. Es erfolgt keine Brutto-Netto-Umrechnung.
5. Krankengeld, Arbeitslosengeld I und laufender Erwachsenenunterhalt werden mit vollständigem `net`- oder `notice`-Betrag berücksichtigt. Elterngeld wird mit `gross`, `net` oder `notice` in voller eingegebener Höhe berücksichtigt.
6. `maternity-benefit` und `sgb2-benefit` sind bestätigte ausgeschlossene Kategorien und werden mit Betrag und Begründung in `excludedIncomeSources` dokumentiert, aber nicht addiert.
7. `pension` bleibt wegen fehlender Rentenart, Brutto-/Nettobasis, Nachzahlungs- und Erstattungsangaben `PENSION_MINIMUM_INCOME_BASIS_NOT_CAPTURED`. `self-employed` bleibt ohne eindeutige Kennzeichnung als Betriebseinnahmen `SELF_EMPLOYMENT_AMOUNT_BASIS_NOT_CAPTURED`.
8. `education-support` bleibt ohne Unterscheidung von BAföG, BAB, Stipendium, Ausbildungsgeld und AFBG-Unterhalt `EDUCATION_SUPPORT_TYPE_NOT_CAPTURED`. `rental` bleibt ohne Einnahmen-/Kosten- und Vermietungsartabgrenzung offen. `voluntary-service`, `state-benefit` und `other` bleiben ohne konkrete Leistungsart unaufgelöst.
9. Wohngeld, Kindergeld, Kinderzuschlag und sämtliche Kindeseinkommensquellen werden nicht als Elterneinkommen einbezogen. Direkte Abzüge, Werbungskosten, Versicherungen und weitere Ausgaben reduzieren diese Mindesteinkommensprüfung nicht.
10. Mindesteinkommensprüfung und allgemeine Einkommensbereinigung sind getrennte Rechensysteme. `evaluateMinimumIncome` verwendet keine später bereinigten Werte aus `KIZ-INCOME-ADULT-001`.
11. Sobald mindestens eine Quelle unaufgelöst ist, werden `averageRelevantIncome`, `differenceToThreshold` und `isThresholdMet` nicht abschließend ausgegeben; sicher einbezogene und ausgeschlossene Quellen bleiben transparent dokumentiert.

### Ergebnis
`evaluateMinimumIncome(state, householdId)` liefert Regel- und Haushalts-ID, Haushaltsform, Grenze, Durchschnitt, Differenz, Prüfergebnis, Status sowie einbezogene, ausgeschlossene und unaufgelöste Quellen, Warnungen und offene Prüfpunkte.

### Sonderfälle
Paarhaushalt, exakt erreichte Grenze, sechs Monate mit Nullwerten, fehlende Quelle, unvollständige Quelle, ungeeigneter Betragstyp und nicht bestätigte Einkommensart. Partnerquellen werden nur bei `couple` einbezogen.

### Quelle
`SRC-BKGG-6A`, `SRC-DA-KIZ-2026-02-20`; bestätigte Betrags-, Durchschnitts- und Abgrenzungsvorgaben dieses Implementierungsschritts vom 11.07.2026. Die vollständige Einkommensaufbereitung nach §§ 11 bis 11b SGB II bleibt unter eigenen Regel-IDs offen.

### Stand
Am 11.07.2026 implementiert und am 12.07.2026 kontrolliert um Krankengeld, Arbeitslosengeld I, Erwachsenenunterhalt und die bestätigten Ausschlusskategorien erweitert. Getestet in `tests/monetary-foundation-tests.js` und `tests/income-precision-tests.js`; unterstützter Rechtsstand 2026.

### Testfälle
- Normalfälle: allein 600 EUR und Paar 900 EUR erreichen die Grenze.
- Grenzfälle: 599,99 EUR beziehungsweise 899,99 EUR verfehlen sie; Nullmonate bleiben im Divisor sechs.
- Sonderfälle: `incomeStatus = none` ohne Quelle ergibt 0 EUR; eine bloß leere Quellenliste sowie eine unvollständige oder nicht sicher klassifizierbare Quelle ergeben `UNRESOLVED`; Abzüge bleiben wirkungslos.
- C2: Krankengeld, Arbeitslosengeld I und Erwachsenenunterhalt werden mit geeigneter Betragsart berücksichtigt; Mutterschaftsgeld und SGB-II-Leistung werden eindeutig ausgeschlossen; Rente, Selbstständigkeit, Ausbildungsförderung, Vermietung und unbestimmte Leistungen bleiben mit stabilen offenen Prüfpunkten unaufgelöst.

## Regel-ID: KIZ-PARENT-NEED-001

### Bezeichnung
Gesamtbedarf der Eltern für die Kinderzuschlagsberechnung

### Status
GETESTET

### Zweck
Ermittelt je KiZ-Haushalt ausschließlich den für die spätere Eltern-Einkommensminderung benötigten Elternbedarf. Dieser Zwischenwert ist weder der gesamte SGB-II-Bedarf der Familie noch eine Aussage über einen Leistungsanspruch.

### Eingaben
`applicationYear`, `household.adults`, Ergebnis von `KIZ-PARENT-ADDITIONAL-NEED-001` und Ergebnis von `KIZ-PARENT-HOUSING-SHARE-001`.

### Fachliche Regel
1. Unterstützt wird ausschließlich der Rechtsstand 2026. Für eine alleinstehende/alleinerziehende antragstellende Person beträgt der Elternregelbedarf 563 EUR. Bei einem Paar werden 506 EUR je erwachsener Person, zusammen 1.012 EUR, angesetzt.
2. Die Rechenformel lautet `parentTotalNeed = parentRuleNeed + parentAdditionalNeedsTotal + parentHousingShareForKiZ`.
3. Nur vollständig unterstützte Teilresultate ergeben einen numerischen Gesamtbedarf. `UNRESOLVED` oder `NOT_APPLICABLE` eines notwendigen Teilresultats erzeugt keinen fiktiven Wert.
4. Ohne eigenes mögliches KiZ-Kind im Haushalt ist der KiZ-Wohnkostenanteil und damit der Eltern-Gesamtbedarf `NOT_APPLICABLE`.
5. Das Ergebnis wird strikt unter `parentNeed` geführt. Es darf nicht als `familySgbIINeed`, Familiengesamtbedarf, Eltern-Einkommensminderung, Wohngeldprüfung oder End-KiZ ausgegeben oder dafür wiederverwendet werden.

### Ergebnis
`parentRuleNeed`, Regelbedarfspositionen je Elternteil, `parentAdditionalNeedsTotal`, `parentHousingShareForKiZ`, `parentTotalNeed`, Status, Regel- und Quellen-IDs, Warnungen, offene Prüfpunkte und nachvollziehbare Formelbestandteile.

### Sonderfälle
Nicht unterstütztes Jahr, ungültige Haushaltsform, kein eigenes KiZ-Kind, ungelöster Mehrbedarf oder ungelöste Wohnkosten.

### Quelle
`SRC-SGBII-20`, `SRC-RBSFV-2026`, `SRC-DA-KIZ-2026-02-20`, insbesondere C.3.

### Stand
Am 13.08.2026 vor Implementierung fachlich geprüft, anschließend implementiert und automatisiert getestet; Rechtsstand 2026.

### Testfälle
Alleinerziehend 563 EUR, Paar 2 × 506 EUR, vollständige Summenformel, strikte Trennung vom Familienbedarf, `NOT_APPLICABLE` ohne eigenes KiZ-Kind und `UNRESOLVED` bei offenen Teilwerten.

## Regel-ID: KIZ-PARENT-ADDITIONAL-NEED-001

### Bezeichnung
Mehrbedarfe der Eltern

### Status
GETESTET

### Zweck
Ermittelt bestätigte monatliche Mehrbedarfe je erwachsener Person und trennt sie transparent nach Rechtsgrund, Prozentsatz, Rohbetrag, Kappung und anerkanntem Betrag.

### Eingaben
Haushaltsform, relevante minderjährige Kinder und ihre Betreuung, `additionalNeedOverride`, `specialSituations`, `hotWaterType`, `decentralHotWaterAdults` sowie der Regelbedarf der jeweiligen erwachsenen Person.

### Fachliche Regel
1. Alle Prozentsätze beziehen sich auf den individuellen Erwachsenenregelbedarf: 563 EUR bei Alleinstehenden, 506 EUR je Person bei Paaren. Geldbeträge werden auf Cent gerundet.
2. Alleinerziehung nach § 21 Absatz 3 SGB II: 36 Prozent gelten bei einem Kind unter sieben Jahren oder bei zwei oder drei Kindern unter 16 Jahren. Sonst gelten 12 Prozent je minderjährigem Kind, höchstens 60 Prozent. Es wird der höhere anwendbare Satz verwendet.
3. Bei echtem Wechselmodell wird der Prozentsatz aus dem Satz für alle berücksichtigungsfähigen minderjährigen Kinder und dem Satz nur für dauerhaft/überwiegend im Haushalt lebende minderjährige Kinder arithmetisch gemittelt. Ein einziges sechsjähriges Wechselmodell-Kind ergibt `(36 + 0) / 2 = 18 Prozent`; das amtliche Beispiel mit 48 und 36 Prozent ergibt 42 Prozent. Umgangskinder mit 1 bis 12 Aufenthaltstagen im Haushalt ohne Kindergeld lösen keinen Alleinerziehendenmehrbedarf aus. Bei 13 bis 17 Tagen greift die Wechselmodell-Halbierung auch im Haushalt ohne Kindergeld. Ein positiver manueller Override ersetzt ausschließlich diesen automatisch ermittelten Eurobetrag und bleibt Teil der Kappungsgruppe.
4. Schwangerschaft wird erst bei bestätigter 13. Schwangerschaftswoche mit 17 Prozent für die zugeordnete Person anerkannt.
5. § 21 Absatz 4 wird nur bei ausdrücklich bestätigter qualifizierender Teilhabeleistung oder sonstiger Hilfe zur Erlangung eines geeigneten Arbeitsplatzes mit 35 Prozent anerkannt. Behinderung oder GdB allein genügt nicht.
6. Kostenaufwändige Ernährung wird nur mit bestätigtem monatlichem Betrag anerkannt. Ein fehlender oder unbestätigter Betrag bleibt `UNRESOLVED`; es gibt keine Pauschalschätzung.
7. Ein unabweisbarer besonderer Bedarf wird nur bei bestätigtem laufendem, nicht nur einmaligem Bedarf und bestätigtem Monatsbetrag anerkannt. Einmalige Bedarfe werden nicht in diesen Monatsbedarf übernommen.
8. Bei zentraler Warmwassererzeugung entsteht kein Warmwassermehrbedarf. Bei bestätigter dezentraler Erzeugung werden für jede ausdrücklich als betroffen bestätigte erwachsene Person 2,3 Prozent ihres Regelbedarfs angesetzt. Gemischte oder unbekannte Erzeugung und unbekannte Personenzuordnung bleiben offen.
9. Die Summe der Mehrbedarfe nach § 21 Absätze 2 bis 5 wird pro Person auf deren Regelbedarf begrenzt. Laufender besonderer Bedarf nach Absatz 6 und Warmwasser nach Absatz 7 gehören nicht in diese Kappung. Die Kappung erfolgt erst nach transparenter Ermittlung der Einzelpositionen.
10. Doppelte Schwangerschafts- oder Teilhabeeinträge derselben Person, unbekannte Bestätigungen, unbekannte Personenzuordnung oder sonstige nicht klassifizierte Einträge werden nicht still summiert, sondern bleiben offen. `confirmationStatus = no` ergibt keinen Mehrbedarf.

### Ergebnis
Einzelpositionen je Person mit `ruleId`, Art, Prozentsatz, Rohbetrag, Kappungsgruppe, anerkanntem Betrag und Begründung; außerdem Rohsummen, Kappung je Person, `parentAdditionalNeedsTotal`, Status, Warnungen und offene Prüfpunkte.

### Sonderfälle
Gemischte Dauer- und Wechselmodellkinder, Kindergeld im anderen Haushalt, mehrere Mehrbedarfe bis über die Höchstgrenze, zentrale/dezentrale/gemischte Warmwasserbereitung, Paar mit Zuordnung je Person und alte unvollständige Eingaben.

### Quelle
`SRC-SGBII-21`, `SRC-RBSFV-2026`, `SRC-DA-KIZ-2026-02-20`, insbesondere C.3.1.2.

### Stand
Am 13.08.2026 vor Implementierung fachlich geprüft, anschließend implementiert und automatisiert getestet; Rechtsstand 2026.

### Testfälle
Alle Prozentvarianten, beide amtlichen Wechselmodellbeispiele, 1–12/13–17 Tage, Schwangerschaftswoche, bestätigte Teilhabe, bestätigte/unbestätigte Beträge, Warmwasser je Person, personenbezogene Kappung und Mehrbedarfe außerhalb der Kappung.

## Regel-ID: KIZ-HOUSING-RECOGNITION-001

### Bezeichnung
Anerkannte Wohnkosten für den KiZ-Elternbedarf

### Status
GETESTET

### Zweck
Ermittelt die tatsächliche monatliche Belastung des Haushalts, von der anschließend ausschließlich der KiZ-Elternanteil bestimmt wird.

### Eingaben
Antragsmonat/-jahr, Wohnform, Miet- oder Eigentümerkosten, Zahlungsrhythmen, Untervermietung, untrennbarer Stellplatz, `otherResidents` und die strukturell relevanten Haushaltsmitglieder.

### Fachliche Regel
1. Bei Miete gelten die tatsächlichen Kosten im ersten Monat des Bewilligungszeitraums: Kaltmiete, kalte Betriebskosten und Heizkosten. Zentral erzeugtes Warmwasser ist in den Wohnkosten enthalten; ein zusätzlicher Warmwassermehrbedarf entsteht dann nicht. Es gibt keinen Sechsmonatsdurchschnitt und keine Angemessenheitskappung.
2. Gutschriften oder Rückzahlungen mindern die angesetzten Kosten in diesem Schritt nicht. Stellplatzkosten werden nur bei bestätigter Untrennbarkeit anerkannt. Bestätigte Untervermietungseinnahmen mindern die Wohnkosten direkt und werden nicht zusätzlich als Einkommen erfasst. Das Ergebnis wird nicht negativ.
3. Bei selbstgenutztem Eigentum werden die berücksichtigungsfähigen tatsächlichen Aufwendungen des vor dem Antragsjahr liegenden Kalenderjahres durch zwölf geteilt. Unterstützt sind Schuldzinsen ohne Tilgung, Grundsteuer, Gebäudeversicherung, Heizkosten und ausdrücklich beschriebene sonstige laufende Kosten. Monats-, Quartals-, Jahres- und Einmalzahlungen werden anhand ihres erfassten Rhythmus auf die Jahressumme gebracht. Tilgung und nicht klassifizierte Kosten werden nicht anerkannt.
4. Liegt für neu erworbenes Eigentum kein vollständiges Vorjahr vor, wird der Durchschnitt aus den tatsächlich erfassten letzten höchstens zwölf Monatsgesamtwerten vor Beginn des Bewilligungszeitraums gebildet. Mindestens ein bestätigter Monat ist erforderlich; zukünftige oder mehr als zwölf Werte sind unzulässig.
5. Vor Anwendung des KiZ-Prozentsatzes wird bei dauerhaft im Kernhaushalt lebenden Personen außerhalb der Bedarfsgemeinschaft deren Kopfanteil abgezogen: `recognizedHousingCosts = adjustedActualCosts × bgCorePersons / allCoreResidents`. `otherResidents` bildet ausschließlich diese Personen ab. Ein nur zeitweise anwesendes Kind mit Kindergeld im anderen Haushalt wird nicht wie ein solcher Mitbewohner abgezogen. Umgangs- und Wechselmodellkinder bleiben für die Zahl der tatsächlich wohnenden Kernpersonen nachvollziehbar, erzeugen aber keinen pauschalen Fremdbewohnerabzug.
6. Fehlende Pflichtangaben, falscher Bezugsmonat/-jahr, unklare Untervermietung oder Stellplatztrennbarkeit bei erfasstem Betrag sowie unvollständige Eigentumszeiträume führen zu `UNRESOLVED` statt zu einer Schätzung.

### Ergebnis
Kostenpositionen, Jahressumme und Divisor bei Eigentum, tatsächliche Monatskosten, direkte Minderungen, Kopfteilabzug, `recognizedHousingCosts`, Status, Regel-/Quellen-IDs, Warnungen und offene Prüfpunkte.

### Sonderfälle
Untervermietung, untrennbarer Stellplatz, weitere Nicht-BG-Bewohner, temporäres Kind, Eigentum mit verschiedenen Zahlungsrhythmen, kein vollständiges Vorjahr und unzulässige Tilgung.

### Quelle
`SRC-DA-KIZ-2026-02-20`, insbesondere C.3.2.1.1 und C.3.2.1.2.

### Stand
Am 13.08.2026 vor Implementierung fachlich geprüft, anschließend implementiert und automatisiert getestet; Rechtsstand 2026.

### Testfälle
Mietsumme im ersten Bewilligungsmonat, zentrale Warmwasserbereitung, Untervermietung ohne Doppelzählung, Kopfteilung, Stellplatz, Eigentumsjahressumme/12, Zahlungsrhythmen, Monatsersatzzeitraum und offene Eingaben.

## Regel-ID: KIZ-PARENT-HOUSING-SHARE-001

### Bezeichnung
Prozentualer Wohnkostenanteil der Eltern für KiZ

### Status
GETESTET

### Zweck
Wendet auf die anerkannten Wohnkosten ausschließlich den Tabellenanteil der Eltern an.

### Eingaben
Haushaltsform, `recognizedHousingCosts` und Anzahl der eigenen möglichen KiZ-Kinder im jeweiligen Haushalt nach den bestehenden Kinder-/Kindergeldregeln.

### Fachliche Regel
1. Bei Alleinerziehenden gelten für 1 bis 10 eigene KiZ-Kinder die Prozentsätze `77, 63, 53, 46, 40, 36, 33, 30, 27, 25`.
2. Bei Paaren gelten für 1 bis 10 eigene KiZ-Kinder die Prozentsätze `83, 71, 62, 55, 50, 45, 41, 38, 35, 33`.
3. Gezählt werden nur Kinder, die nach den bestehenden Regeln im konkreten Haushalt ein mögliches eigenes KiZ-Kind sind. Ein echtes Wechselmodellkind mit Kindergeld in diesem Haushalt zählt als ein Kind, nicht als ein halbes. Ein zeitweise anwesendes Kind mit Kindergeld im anderen oder externen Haushalt zählt nicht für die Tabelle.
4. Bei null eigenen KiZ-Kindern lautet der Status `NOT_APPLICABLE`; es wird kein fiktiver Prozentsatz und kein Betrag ausgegeben. Mehr als zehn Kinder oder eine ungelöste Kinderklassifikation ergeben `UNRESOLVED`.
5. Die Berechnung lautet `parentHousingShareForKiZ = recognizedHousingCosts × percentage / 100`, kaufmännisch auf Cent gerundet. Haushalt A und B werden vollständig unabhängig ausgewertet.

### Ergebnis
Kinderanzahl, Tabellenzeile, Prozentsatz, anerkannte Wohnkosten, `parentHousingShareForKiZ`, Status, Regel-/Quellen-IDs, Warnungen und offene Prüfpunkte.

### Sonderfälle
Kein eigenes KiZ-Kind, mehr als zehn Kinder, echtes Wechselmodell, fremder Kindergeldhaushalt, ungelöste Kindzuordnung und beide Haushalte mit verschiedenen Ergebnissen.

### Quelle
`SRC-DA-KIZ-2026-02-20`, insbesondere C.3.2 und Tabelle C.3.2 Absatz 2.

### Stand
Am 13.08.2026 vor Implementierung fachlich geprüft, anschließend implementiert und automatisiert getestet; Rechtsstand 2026.

### Testfälle
Alle 20 Tabellenwerte, Beispiel `800 EUR × 71 Prozent = 568 EUR`, Rundung, Wechselmodellzählung, Ausschluss fremder Kindergeldkinder, `NOT_APPLICABLE` und haushaltsweise Unabhängigkeit.

## Regel-ID: KIZ-CHILD-SGBII-NEED-001

### Bezeichnung
Individueller laufender SGB-II-Bedarf eines Kindes für die KiZ-Prüfung

### Status
GETESTET

### Zweck
Ermittelt ausschließlich den laufenden Bedarf eines strukturell relevanten Kindes vor jeder Einkommensanrechnung. Das Ergebnis dient sowohl der getrennten KiZ-BG- als auch der SGB-II-BG-Prüfung.

### Eingaben
Rechtsstand, Alter am ersten Tag des BWZ, Betreuungssituation, Aufenthaltstage, Haushaltsrelevanz, `u25RuleStageStatus`, kindbezogene Mehrbedarfsfelder und der nach `KIZ-FAMILY-SGBII-NEED-001` gebildete volle Unterkunftskopfteil.

### Fachliche Regel
1. Unterstützt wird ausschließlich 2026. Die vollen Regelbedarfe lauten: 0–5 Jahre 357 EUR, 6–13 Jahre 390 EUR, 14–17 Jahre 471 EUR und bei ausdrücklich bestätigter einschlägiger U25-Regelbedarfsstufe für 18–24 Jahre 451 EUR. `age` bezeichnet das Alter am ersten Tag des BWZ; Änderungen später im Antragsmonat werden nicht taggenau eingerechnet.
2. Dauerhafter oder überwiegender Aufenthalt (`FULL`) ergibt den vollen Regelbedarf und volle laufende kindbezogene Mehrbedarfe. Echtes Wechselmodell mit 13–17 Tagen (`HALF`) ergibt jeweils die Hälfte. Umgang mit 1–12 bestätigten Tagen im nicht kindergeldberechtigten Haushalt ergibt `fullNeed / 30 × stayDays`. Eine KG-/Aufenthaltskonstellation außerhalb der bestätigten Struktur bleibt offen.
3. Unterkunft und Heizung werden bei dauerhaftem, überwiegendem, hälftigem oder 1–12-tägigem Aufenthalt stets mit dem vollen SGB-II-Kopfteil angesetzt. Der Unterkunftsanteil wird weder halbiert noch nach Tagen gekürzt.
4. Bei zentraler Warmwassererzeugung entsteht kein Zusatz. Bei für das Kind bestätigter dezentraler Erzeugung gelten vom vollen Regelbedarf 0,8 Prozent für 0–5, 1,2 Prozent für 6–13, 1,4 Prozent für 14–17 und 2,3 Prozent im bestätigten U25-Fall. Dieser volle Mehrbedarf wird mit demselben Aufenthaltsfaktor wie der Regelbedarf gewichtet.
5. Ein weiterer anerkannter laufender Mehrbedarf wird nur bei `additionalNeedStatus = yes` mit ausdrücklich bestätigtem nicht negativen Monatsbetrag übernommen und ebenfalls mit dem Aufenthaltsfaktor gewichtet. `no` ergibt 0; `unknown` oder `yes` ohne Betrag bleibt offen. Einmalige Bedarfe, Bildung und Teilhabe sowie aus Freitext abgeleitete Diagnosen werden nicht berücksichtigt.
6. Die Funktion zieht weder Kindeseinkommen noch Kindergeld, KiZ, Eltern- oder sonstiges Einkommen ab.
7. Alter ab 25, verheiratete/verpartnerte Kinder, unbestätigte U25-Regelstufe, unvollständige Aufenthaltstage und nicht unterstützte Internats-, Jugendhilfe-, eigene Wohnungs- oder Ausbildungskonstellationen ergeben `NOT_APPLICABLE` oder `UNRESOLVED` statt einer Schätzung.

### Ergebnis
`ruleNeedFull`, `ruleNeedFactor`, `recognizedRuleNeed`, Mehrbedarfspositionen mit Vollbetrag/Faktor/anerkannter Höhe, `housingHeadShare`, `totalChildNeed`, Status, Warnungen, offene Prüfpunkte, Regel- und Quellen-IDs.

### Quelle
`SRC-SGBII-20`, `SRC-SGBII-21`, `SRC-SGBII-23`, `SRC-RBSFV-2026`, `SRC-DA-KIZ-2026-02-20`, besonders C.4.1 Absätze 2 und 3.

### Stand
Am 14.08.2026 vor Implementierung anhand der amtlichen Fassungen und DA-KiZ 20.02.2026 bestätigt, anschließend implementiert und automatisiert getestet.

### Testfälle
Alle vier Altersstufen, voller/halber/tagesanteiliger Regelbedarf, voller Unterkunftskopfteil, vier Warmwasserprozentsätze, bestätigter weiterer Mehrbedarf, zentrale Versorgung, fehlender Betrag, Rechtsstand und Nicht-Mutation.

## Regel-ID: KIZ-CHILD-BG-INCOME-001

### Bezeichnung
Einkommensabhängige KiZ-BG-Zugehörigkeit eines Kindes

### Status
GETESTET

### Zweck
Entscheidet nach der strukturellen KiZ-Kind-Zuordnung, ob das Kind mit dem für KiZ anrechenbaren Anteil seines eigenen Einkommens und Kindergeld seinen Bedarf deckt und deshalb keinen eigenen KiZ erhalten kann.

### Eingaben
Strukturelles Ergebnis von `KIZ-CHILD-001`, `totalChildNeed`, unterstützter `countableChildIncomeAverage`, D2-Minderungsbetrag `childIncomeReduction = 45 Prozent × countableChildIncomeAverage`, Kindergeldort und Kindergeldbetrag 259 EUR.

### Fachliche Regel
1. Die Regel gilt nur für ein strukturell mögliches eigenes KiZ-Kind im konkreten kindergeldberechtigten Haushalt. Ein temporäres Kind mit Kindergeld im anderen oder externen Haushalt ist hier `NOT_APPLICABLE` und bleibt ausschließlich für den SGB-II-Bedarf separat relevant.
2. `incomeForKiZMembership = childIncomeReduction + relevantChildBenefit`. Der D2-Wert wird wiederverwendet; das Einkommen wird nicht erneut bereinigt oder nochmals mit 45 Prozent multipliziert. Für diese KiZ-BG-Prüfung wird das dem Kind zugeordnete Kindergeld mit 259 EUR angesetzt.
3. Ist `incomeForKiZMembership >= totalChildNeed`, lautet `kizBgMember = false`; das Kind erhält keinen eigenen KiZ und zählt nicht für die D3-Eltern-Wohnkostentabelle. Andernfalls lautet `kizBgMember = true`.
4. Fehlender unterstützter Kindeseinkommensdurchschnitt, ungelöster Kinderbedarf, unbekannter Kindergeldort oder fehlende strukturelle Zuordnung führen zu `UNRESOLVED`. Einkommen eines Kindes beeinflusst kein Geschwisterkind.
5. Das amtliche Beispiel: Bedarf 507 EUR, Einkommen 400 EUR, davon 45 Prozent = 180 EUR, plus 259 EUR Kindergeld = 439 EUR; das Kind bleibt KiZ-BG-Mitglied.

### Ergebnis
`kizBgMember`, `childIncomeReduction`, `relevantChildBenefit`, `incomeForKiZMembership`, `totalChildNeed`, Differenz, Status und nachvollziehbare Quellen-/Regel-IDs.

### Quelle
`SRC-BKGG-6A`, `SRC-DA-KIZ-2026-02-20`, besonders B.3 Absatz 2 Sätze 5 bis 13 und C.2.2.1 Absatz 5.

### Stand
Am 14.08.2026 vor Implementierung fachlich bestätigt, anschließend implementiert und automatisiert getestet.

### Testfälle
Amtlicher 400-EUR-Fall, bedarfsdeckender 600-EUR-Fall, Null-/Grenzeinkommen, fremder Kindergeldhaushalt, offene Einkommensaufbereitung, Geschwistertrennung und D3-Kinderzahl.

## Regel-ID: KIZ-SGBII-BG-MEMBERSHIP-001

### Bezeichnung
Einkommensabhängige SGB-II-BG-Zugehörigkeit eines Kindes

### Status
GETESTET

### Zweck
Entscheidet unabhängig von der KiZ-BG, ob ein relevantes unverheiratetes U25-Kind seinen eigenen Bedarf mit vollem bereinigtem Einkommen und dem in diesem Haushalt anzurechnenden Kindergeld decken kann.

### Eingaben
Strukturelle Haushaltsrelevanz, `totalChildNeed`, `countableChildIncomeAverage`, Kindergeldort, `halfForwarded` und Kindergeldbetrag 259 EUR.

### Fachliche Regel
1. `sgbIIChildAvailableIncome = countableChildIncomeAverage + childBenefitCountedInThisHousehold`.
2. Im kindergeldberechtigten Haushalt werden grundsätzlich 259 EUR berücksichtigt. Bei ausdrücklich nachgewiesener hälftiger Weiterleitung werden dort 129,50 EUR berücksichtigt. Ohne Nachweis wird im Wechselmodell nicht automatisch halbiert. Im nicht kindergeldberechtigten Haushalt wird keine unbelegte Gegenbuchung oder fiktive Kindergeldposition erzeugt.
3. Ist das verfügbare Einkommen mindestens so hoch wie `totalChildNeed`, lautet `sgbIIBgMember = false`; das Kind bleibt bei fortbestehendem Wohnen als Wohn-/Haushaltskopf im Nenner, sein Kopfteil und seine übrigen Bedarfe werden aber nicht zum Familienbedarf addiert. Andernfalls lautet `sgbIIBgMember = true`.
4. KiZ-BG- und SGB-II-BG-Ergebnis werden getrennt ausgegeben. Ein Kind kann `kizBgMember = true` und zugleich `sgbIIBgMember = false` sein.
5. Das amtliche Beispiel: Bedarf 507 EUR, 400 EUR volles Kindeseinkommen plus 259 EUR Kindergeld = 659 EUR; das Kind ist kein SGB-II-BG-Mitglied, obwohl es wegen 439 EUR in der KiZ-BG bleibt.
6. Unbekannte zwingende Einkommens-/Kindergeldangaben sowie nicht sicher unterstützte U25-/Sonderkonstellationen bleiben offen. Es wird kein Kindergeldüberhang als Elterneinkommen gebucht.

### Ergebnis
`sgbIIBgMember`, volles Kindeseinkommen, angerechnetes Kindergeld und Faktor, verfügbares Einkommen, Bedarf, Differenz, Status, Warnungen und offene Prüfpunkte.

### Quelle
`SRC-SGBII-7`, `SRC-SGBII-11`, `SRC-DA-KIZ-2026-02-20`, besonders B.3 Absatz 2 und C.4.1 Absätze 2 und 3.

### Stand
Am 14.08.2026 vor Implementierung fachlich bestätigt, anschließend implementiert und automatisiert getestet.

### Testfälle
Amtlicher 400-EUR-Fall, identische Bedarfsschwelle, volle/halb weitergeleitete/auswärtige Kindergeldposition, Kind bleibt Wohnkopf, Geschwister- und Haushaltstrennung.

## Regel-ID: KIZ-FAMILY-SGBII-NEED-001

### Bezeichnung
Laufender SGB-II-Familienbedarf für die spätere KiZ-Hilfebedürftigkeitsprüfung

### Status
GETESTET

### Zweck
Ermittelt die Bedarfsseite der tatsächlichen SGB-II-BG und hält sie strikt vom D3-Elternbedarf und von der späteren Hilfebedürftigkeitsentscheidung getrennt.

### Eingaben
D3-Erwachsenenregelbedarfe und laufende Erwachsenenmehrbedarfe, D3-zeitlich korrekte tatsächliche Wohnkostenbasis vor Prozentverteilung, `otherResidents`, individuelle D4-Kinderbedarfe und SGB-II-BG-Mitgliedschaften.

### Fachliche Regel
1. Die D3-Wohnkosten-Prozenttabelle und `parentHousingShareForKiZ` werden nicht verwendet. Aus der nach Untervermietung verbleibenden tatsächlichen Wohnkostenbasis wird `housingCostPerHead = adjustedActualCosts / totalHousingHeads` gebildet.
2. Wohnköpfe sind die erwachsenen Haushaltsmitglieder, alle strukturell in diesem Haushalt lebenden dauerhaften oder temporären Kinder sowie `otherResidents`. Ein wegen Einkommen nicht mehr zur SGB-II-BG gehörendes Kind bleibt bei fortbestehendem Wohnen im Nenner. Fremde Nicht-BG-Personen und solche Kinder erhalten keinen zum Familienbedarf addierten Kopfteil.
3. `familyHousingNeedForSgbII = housingCostPerHead × sgbIIBgHousingHeads`. Temporäre Kinder mit 13–17 oder 1–12 Tagen erhalten als SGB-II-BG-Mitglieder einen vollen Kopfteil.
4. `familySgbIINeed = adultRuleNeeds + adultAdditionalNeeds + recognizedChildRuleNeedsOfSgbIIBgMembers + recognizedChildAdditionalNeedsOfSgbIIBgMembers + familyHousingNeedForSgbII`.
5. Erwachsenenregel- und Mehrbedarfsformeln werden unverändert aus D3 wiederverwendet. Der D3-Eltern-Wohnanteil wird nicht addiert. Kindergeld, Kinder-/Elterneinkommen, KiZ und Wohngeld werden vom Bedarf weder abgezogen noch hinzugerechnet.
6. Das Ergebnis ist nur die Bedarfsseite. Es ist keine Hilfebedürftigkeits-, Wohngeld-, Vermögens-, Elternminderungs- oder End-KiZ-Entscheidung.
7. Ein zwingend ungelöster Kinderbedarf, eine ungelöste Mitgliedschaft, unvollständige Wohnkostenbasis oder ungelöste Erwachsenenbedarfe ergibt `familySgbIINeed = null`; bekannte Teilwerte bleiben sichtbar.

### Ergebnis
Personenpositionen mit Rolle, KiZ-/SGB-II-BG-Status, Regelbedarf, Mehrbedarf, Wohnkopfteil und Gesamtbedarf; Wohnkostenbasis, Kopfzahlen, Kopfteil, `familyHousingNeedForSgbII`, `familySgbIINeed`, Status, Warnungen, offene Prüfpunkte, Regel- und Quellen-IDs.

### Quelle
`SRC-BKGG-6A`, `SRC-SGBII-7`, `SRC-SGBII-20`, `SRC-SGBII-21`, `SRC-SGBII-22`, `SRC-SGBII-23`, `SRC-RBSFV-2026`, `SRC-DA-KIZ-2026-02-20`, besonders C.4.1.

### Stand
Am 14.08.2026 vor Implementierung fachlich bestätigt, anschließend implementiert und automatisiert getestet.

### Testfälle
Miete/Eigentum, Paar mit zwei Kindern, weitere Mitbewohner, temporäre Kinder, bedarfsdeckendes Wohnkopf-Kind, Untervermietung, Erwachsenen-/Kinderpositionen, zwei Haushalte, Statuspropagation, Nicht-Mutation und strikte Abgrenzung von D3.

## Regel-ID: KIZ-NEED-001

### Bezeichnung
Weitere Regelbedarfe von Kindern und Familienbedarf

### Status
ABGELÖST DURCH D4

### Zweck
Historischer Platzhalter. Individuelle Kinderbedarfe und der davon strikt getrennte Familien-SGB-II-Bedarf sind nun ausschließlich unter `KIZ-CHILD-SGBII-NEED-001` und `KIZ-FAMILY-SGBII-NEED-001` geregelt.

### Eingaben
Antragszeitraum, Haushaltsform, Alter und Betreuungssituation der Kinder.

### Fachliche Regel
Keine eigenständige Berechnung mehr. Die getesteten D4-Regeln haben diesen Platzhalter abgelöst; `parentTotalNeed` bleibt weiterhin ausschließlich der getrennte D3-Elternbedarf.

### Ergebnis
Geplante Bedarfspositionen je erwachsener Person und Kind.

### Sonderfälle
Wechselmodell, Paar, mehrere Kinder, Alterswechsel.

### Quelle
Siehe Quellenketten der vier getesteten D4-Regel-IDs.

### Stand
Am 14.08.2026 durch die dokumentierten D4-Regeln abgelöst.

### Testfälle
- Normalfall: ein Elternteil und ein Kind.
- Grenzfall: Alterswechsel im Antragszeitraum.
- Sonderfall: Wechselmodell-Kind; Werte offen.

## Regel-ID: KIZ-HOUSING-001

### Bezeichnung
Wohnkosten und Unterkunft mit Heizung

### Status
TEILWEISE ABGELÖST DURCH D3/D4

### Zweck
Historischer Platzhalter. Tatsächliche Kosten und KiZ-Elternanteil folgen den D3-Wohnkostenregeln; SGB-II-Kopfteil und Familien-Unterkunftsbedarf folgen `KIZ-FAMILY-SGBII-NEED-001`.

### Eingaben
`housingType`, `housingCosts.rent`, `housingCosts.owner`, `otherResidents`, Warmwasserangaben.

### Fachliche Regel
Die Anerkennung der tatsächlichen Kosten folgt `KIZ-HOUSING-RECOGNITION-001`; der D3-Elternanteil folgt `KIZ-PARENT-HOUSING-SHARE-001`. Kinder-Unterkunftsbedarfe, temporäre volle Kopfteile und `familyHousingNeedForSgbII` folgen getestet `KIZ-FAMILY-SGBII-NEED-001`. Offen bleibt die spätere vollständige Bedarfsdeckungsentscheidung.

### Ergebnis
Geplante Wohnkostenpositionen, Zuordnung und fachlich berücksichtigter Gesamtbetrag je Haushalt.

### Sonderfälle
Weitere Mitbewohner, Eigentum, sonstige Kosten, Wechselmodell.

### Quelle
`SRC-PRODUCT-SPEC-2026`, vorgesehen `SRC-DA-KIZ-2026-02-20`.

### Stand
Produktstand 2026; Detailprüfung offen.

### Testfälle
- Normalfall: Mietwohnung mit drei Kostenarten.
- Grenzfall: ausdrücklich 0 € in einer Kostenart.
- Sonderfall: selbstgenutztes Wohneigentum mit sonstigen Kosten.

## Regel-ID: KIZ-WOHNGELD-001

### Bezeichnung
Wohngeld im Bedarfsdeckungscheck

### Status
GETESTET (D8A/D8B3)

### Zweck
Ordnet bewilligtes, extern geschätztes, ausdrücklich verneintes oder im automatischen Standardfall berechnetes Wohngeld dem Bedarfsdeckungscheck zu.

### Eingaben
`housingBenefit`, `housingBenefitStatus`, `coverageAssetStatus` sowie bei automatischer Berechnung das getrennte `wohngeldData` und das Ergebnis von `WG-AMOUNT-001`.

### Fachliche Regel
`SPEC.md` bestimmt als Produktanforderung: Wohngeld wird für den Bedarfsdeckungscheck berücksichtigt, nicht als Eltern-Einkommen zur KiZ-Minderung. Bewilligtes Wohngeld und die getrennte automatische Standardfallberechnung werden unterstützt. D8B1 bereitet Haushalts-, Einkommens- und Mietwerte vor, D8B2 berechnet daraus den mathematischen Wohngeldbetrag und D8B3 prüft die hierfür relevanten Statusvorbedingungen. Der Betrag ist eine nachvollziehbare Standardfallberechnung und kein rechtsverbindlicher Bescheid; ausdrücklich offene Ausschluss- und Sonderprüfungen bleiben im Ergebnis sichtbar.

### Ergebnis
`evaluateCoverage(...)` liefert `housingBenefit` mit Status, Basis, Betrag, Zuverlässigkeit und gegebenenfalls dem getrennten automatischen Wohngeldergebnis. `calculateCoverageAmounts(...)` addiert den freigegebenen Betrag genau einmal zu `resourcesWithWohngeld`; Wohngeld wird nicht als D5-Elterneinkommen oder KiZ-Minderungsbetrag behandelt.

### Sonderfälle
`approved` bleibt `APPROVED`, `estimated` bleibt `EXTERNAL_ESTIMATE`, `none` bleibt `CONFIRMED_ZERO`. Bei bereits geschlossener Coverage-Lücke gilt `NOT_NEEDED`. `unknown` und `not-received` können im Modus `automatic` nur nach den dokumentierten D8B3-Voraussetzungen einen Wert mit `AUTOMATIC_FICTIVE` liefern. Offene Ausschluss-, Vermögens- oder Wohngeld-Sonderprüfungen bleiben mit konkreten `WG_*`-Codes sichtbar.

### Quelle
`SRC-PRODUCT-SPEC-2026`, `SRC-DA-KIZ-2026-02-20`; die mathematische Wohngeldberechnung verwendet die bei `WG-AMOUNT-001` dokumentierten Quellen.

### Stand
Für die dokumentierten Standardfälle in D8A/D8B3 implementiert und getestet. Noch offene Wohngeld-Sonderfälle gehören zu ihren konkreten `WG_*`-Regeln und machen die Integration von Wohngeld in den Bedarfsdeckungscheck nicht erneut offen.

### Testfälle
- Normalfall: bewilligtes Wohngeld (`tests/coverage-tests.js`).
- Grenzfall: bestätigter Nullwert und `NOT_NEEDED` (`tests/coverage-tests.js`, `tests/result-view-model-tests.js`).
- Sonderfall: externe Schätzung sowie automatisch berechnetes fiktives Miet- oder Lastenzuschussergebnis (`tests/coverage-tests.js`, `tests/wohngeld-coverage-integration-tests.js`, `tests/end-to-end-tests.js`).

## Regel-ID: KIZ-ADD-NEED-001

### Bezeichnung
Mehrbedarfe und besondere Situationen

### Status
OFFEN

### Technischer Teilstatus
Die Kinder-Warmwasser-Alterswerte sind implementiert und getestet. Ein bestätigter laufender manueller Mehrbedarf wird mit dem ausdrücklich eingegebenen Betrag verarbeitet und getestet; ein bestätigtes `yes` ohne Betrag bleibt als `UNRESOLVED` offen. Damit ist der dokumentierte Teil technisch/regressiv umgesetzt. Offen bleibt die vollständige Quellenzuordnung und fachliche Prüfung für den `KIZ-ADD-NEED-001`-Kinderregelblock, insbesondere die Anwendbarkeit des bereits allgemein abgeglichenen § 21 SGB II auf diesen Regelblock. `KIZ-SCENARIO-001` bleibt offen; `KIZ-PATCHWORK-001` wird durch diesen Teilstatus nicht verändert.

### Zweck
Bestimmt später noch offene kinderbezogene oder sonstige Mehrbedarfe außerhalb des abgegrenzten D3-Elternbedarfs.

### Eingaben
`specialSituations`, `hotWaterType`, `additionalNeedOverride`, Haushaltsform.

### Fachliche Regel
Die Elternmehrbedarfe sind ausschließlich unter `KIZ-PARENT-ADDITIONAL-NEED-001` bestätigt. OFFEN bleiben weitere kinderbezogene oder außerhalb dieser Regel liegende Mehrbedarfe; sie dürfen nicht aus Freitext oder unbestätigten Beträgen abgeleitet werden.

### Ergebnis
Geplante Mehrbedarfspositionen je Haushalt und Person mit Quelle und Regel-ID.

### Sonderfälle
Paar mit altem Alleinerziehenden-Override, dezentrale Warmwassererzeugung, mehrere besondere Situationen.

### Quelle
`SRC-PRODUCT-SPEC-2026`; `SRC-SGBII-21` erst nach Quellenprüfung.

### Stand
OFFEN.

### Testfälle
- Normalfall: keine besondere Situation.
- Grenzfall: manueller Wert 0 €.
- Sonderfall: positiver manueller Wert oder mehrere besondere Situationen.

## Regel-ID: KIZ-MAX-001

### Bezeichnung
Maximaler Kinderzuschlag je Kind

### Status
GETESTET

### Zweck
Bestimmt den theoretischen maximalen Ausgangsbetrag je durch `KIZ-CHILD-001` als mögliches eigenes KiZ-Kind klassifiziertem Kind.

### Eingaben
`applicationMonth`, `applicationYear`, `centralChildren` und Haushalts-ID; Klassifikation über `evaluateChildRelevanceForHousehold` aus `KIZ-CHILD-001`.

### Fachliche Regel
1. Ausschließlich für Antragsmonate im Kalenderjahr 2026 beträgt der theoretische maximale Ausgangsbetrag 297 EUR monatlich je möglichem eigenen KiZ-Kind.
2. Verwendet werden nur Kinder, die `KIZ-CHILD-001` für den betrachteten Haushalt positiv als `isPotentialOwnKizChildForThisHousehold` klassifiziert.
3. Externer oder anderer Kindergeldbezug, Alter ab 25, verheiratet/verpartnert sowie fehlende positive Haushaltsrelevanz ergeben keinen Betrag.
4. Für andere Jahre gilt `UNSUPPORTED_LEGAL_PERIOD`; `maximumKizAmount` und Haushaltssumme bleiben `null`. Der Betrag wird nicht auf andere Jahre übertragen.
5. Die Haushaltssumme ist nur die theoretische Summe vor Kindeseinkommens-, Elterneinkommens- und Bedarfsdeckungsregeln und kein Anspruch oder Endbetrag.

### Ergebnis
`evaluateMaximumKizForChild(child, householdId, applicationMonth, applicationYear)` liefert die verlangten Einzelangaben. `evaluateMaximumKizForHousehold(state, householdId)` liefert Kindresultate, Anzahl möglicher eigener KiZ-Kinder und theoretische Summe.

### Sonderfälle
Nicht unterstütztes Jahr, ungültiger Antragsmonat, Kind ohne möglichen eigenen KiZ-Status und offene Prüfpunkte aus `KIZ-CHILD-001`.

### Quelle
`SRC-PRODUCT-SPEC-2026`, `SRC-BKGG-6A`, `SRC-DA-KIZ-2026-02-20`; bestätigte Betragshöhe und zeitliche Begrenzung dieses Implementierungsschritts vom 11.07.2026.

### Stand
Am 11.07.2026 in `calculator.js` implementiert und mit Einzelkind, Haushaltssumme, Ausschlussfällen, Zeitraumgrenze und Nicht-Mutation in `tests/monetary-foundation-tests.js` getestet; unterstützter Rechts-/Quellenstand 2026.

### Testfälle
- Normalfall: ein mögliches eigenes KiZ-Kind ergibt 297 EUR, zwei ergeben theoretisch 594 EUR.
- Grenzfälle: anderes Jahr ergibt `UNSUPPORTED_LEGAL_PERIOD`; Alter 25 oder Familienstand `yes` ergibt keinen Einzelbetrag.
- Sonderfälle: B-only- oder externes Kind wird nicht einem unzuständigen Haushalt zugerechnet; Eingaben bleiben unverändert.

## Regel-ID: KIZ-REDUCE-CHILD-001

### Bezeichnung
Minderung durch Kindeseinkommen

### Status
GETESTET

### Zweck
Mindert den individuellen maximalen Kinderzuschlag eines möglichen eigenen KiZ-Kindes um 45 Prozent seines bereits nach `KIZ-INCOME-CHILD-001` ermittelten monatlichen Durchschnittseinkommens. Die Regel erzeugt ausschließlich einen kindbezogenen Zwischenwert vor Kindesvermögen, Elternminderung, Bedarfsdeckungsprüfung und Schlussrundung.

### Eingaben
1. Das Einzelkind-Ergebnis aus `KIZ-MAX-001` mit `childId`, `householdId`, `isPotentialOwnKizChild`, `maximumKizAmount`, Zeitraumstatus, Warnungen und offenen Prüfpunkten.
2. Das demselben Kind zugeordnete Ergebnis aus `KIZ-INCOME-CHILD-001` mit `childId`, `countableChildIncomeAverage`, `status`, Warnungen und offenen Prüfpunkten.
3. Die Regel verarbeitet keine Einkommensquellen oder Monatswerte erneut und erzeugt keine neue Anspruchs- oder Haushaltszuordnung.

### Fachliche Regel
1. Die Minderung wird nur für ein Kind berechnet, das `KIZ-CHILD-001` und `KIZ-KG-001` im betrachteten Haushalt als mögliches eigenes KiZ-Kind klassifiziert und für das `KIZ-MAX-001` einen numerischen individuellen Höchstbetrag liefert.
2. `KIZ-INCOME-CHILD-001` muss für genau dieselbe `childId` einen numerischen, nicht negativen `countableChildIncomeAverage` mit `status = SUPPORTED` liefern. Der D2-Schritt übernimmt diesen Wert unverändert und bereinigt, klassifiziert oder verteilt Einkommen nicht erneut.
3. Der Minderungsbetrag lautet ohne Zwischenrundung:
   `childIncomeReduction = countableChildIncomeAverage * 0.45`.
4. Der kindbezogene Zwischenbetrag lautet ohne Zwischenrundung:
   `individualKiZAfterChildIncome = max(0, maximumKizAmount - childIncomeReduction)`.
5. Ein Durchschnitt von 0 EUR ergibt eine Minderung von 0 EUR und lässt den individuellen Höchstbetrag unverändert.
6. Übersteigt die rechnerische Minderung den Höchstbetrag oder entspricht sie ihm, ist der Zwischenbetrag 0 EUR. Ein negativer Kinderzuschlag wird nicht erzeugt; ein übersteigender Minderungsrest wird weder auf Geschwister noch auf Eltern oder andere Haushalte übertragen.
7. Nicht ganzzahlige Zwischenwerte bleiben erhalten. Insbesondere ergibt 123,45 EUR Einkommen eine Minderung von 55,5525 EUR. Es wird weder auf volle Euro noch auf Cent gerundet. Die Schlussrundung nach § 11 Absatz 2 BKGG gehört nicht zu D2.
8. Ist `countableChildIncomeAverage = null`, der Einkommensstatus nicht `SUPPORTED`, eine Eingabe nicht numerisch/nicht negativ, die `childId` widersprüchlich oder der maximale Ausgangsbetrag nicht berechenbar, bleiben `childIncomeReduction` und `individualKiZAfterChildIncome` `null`; der Status lautet `UNRESOLVED`. Warnungen und offene Prüfpunkte der vorgelagerten Ergebnisse werden nachvollziehbar übernommen.
9. Für ein nicht als mögliches eigenes KiZ-Kind klassifiziertes Kind wird keine Einkommensminderung berechnet. Der technische Datensatz weist `status = NOT_POTENTIAL_OWN_KIZ_CHILD`, `childIncomeReduction = null` und `individualKiZAfterChildIncome = null` aus; Einkommen wird keinem anderen Kind zugeordnet.
10. Kindesvermögen nach § 6a Absatz 3 Sätze 5 bis 7 BKGG ist nicht Bestandteil dieser Regel. Ebenso ausgeschlossen sind Elternminderung, Bedarfe, Wohnkosten, Wohngeld, Patchwork-Verteilung, Bedarfsdeckungscheck, endgültiger Gesamtkinderzuschlag und Auszahlungsrundung.

### Ergebnis
`evaluateChildIncomeReduction(maximumKizResult, childIncomeResult)` liefert mindestens `ruleId`, `childId`, `householdId`, `maximumKiZ`, `countableChildIncomeAverage`, `reductionRate`, `childIncomeReduction`, `individualKiZAfterChildIncome`, `status`, `warnings`, `openChecks`, verwendete Regel-IDs und einen ausdrücklichen Hinweis auf die noch nicht berücksichtigten Folgeschritte. `evaluateChildIncomeReductionsForHousehold(state, householdId)` verbindet für jedes zentrale Kind ausschließlich die bestehenden Ergebnisse aus `KIZ-MAX-001` und `KIZ-INCOME-CHILD-001`; die Kinderresultate bleiben getrennt. Eine technische Summe darf nur als vorläufiger Zwischenwert mit entsprechendem Hinweis ausgegeben werden.

### Sonderfälle
0 EUR Einkommen, Dezimalbeträge, Minderung exakt in Höhe des Höchstbetrags, Minderung oberhalb des Höchstbetrags, ungelöste oder unvollständige Kindeseinkommensaufbereitung, Kind ohne eigenen KiZ-Status, Kindergeld im anderen oder externen Haushalt, mehrere Kinder mit unterschiedlichen Einkommen, widersprüchliche `childId` und nicht unterstützter Rechtszeitraum.

### Quelle
`SRC-BKGG-6A`, insbesondere § 6a Absatz 3 Satz 3 und Absatz 4 BKGG; `SRC-DA-KIZ-2026-02-20`, C.2, C.2.2 und C.2.2.1 Absätze 1, 4 und 5, einschließlich des Beispiels 280 EUR × 45 Prozent = 126 EUR und 297 EUR - 126 EUR = 171 EUR. Die Ermittlung des Eingabewerts bleibt vollständig den bereits dokumentierten Quellen von `KIZ-INCOME-CHILD-001` zugeordnet.

### Stand
Am 13.08.2026 anhand der amtlichen Fassung des § 6a BKGG und der DA-KiZ vom 20.02.2026 fachlich bestätigt, anschließend in `calculator.js` implementiert und mit 29 eigenen D2-Tests sowie allen 257 bisherigen Tests geprüft. Alle 286 Tests sind erfolgreich.

### Testfälle
- Normalfälle: 0, 100, 200 und 300 EUR Durchschnitt; amtliches Beispiel mit 280 EUR; dezimaler Durchschnitt 123,45 EUR ohne frühe Rundung.
- Grenzfälle: Minderung exakt 297 EUR; Minderung oberhalb 297 EUR; niemals negativer Zwischenbetrag; `null`, `INCOMPLETE` und `UNRESOLVED` aus D1.5.
- Sonderfälle: Warnungen und offene Prüfpunkte werden übernommen; zwei oder mehr Kinder bleiben vollständig getrennt; A/B- und externer Kindergeldbezug erzeugen im unzuständigen Haushalt keinen individuellen KiZ-Zwischenbetrag; Eingaben bleiben unverändert.

### Partner-/Minijob-Golden-Paths (D3/D5/D6/D8B1-D8B2)

Die Produktionsregression `tests/partner-minijob-golden-path-tests.js` verwendet den vorhandenen Krankengeld-/Wechselmodell-Testdatensatz als Kontrollfall und ergänzt ausschließlich einen echten Paarhaushalt. Für `adults = "couple"` werden zwei Erwachsenenregelbedarfe angesetzt, der D3-Alleinerziehendenmehrbedarf entfällt und `KIZ-PARENT-HOUSING-SHARE-001` verwendet die Paar-Tabelle. Die Wohngeld-Foundation führt den Partner als fünftes Haushaltsmitglied; der Wohngeld-Alleinerziehendenfreibetrag wird nicht aus dem KiZ-Status abgeleitet.

Der D5-/D6-Golden-Path prüft die Trennung von Krankengeld als sonstigem Einkommen und Partner-Minijob als Erwerbseinkommen. Ein 603-EUR-Minijob wird nur als ausdrücklich eingegebenes Brutto verarbeitet; Grundabzug, Erwerbstätigenfreibetrag und ein konkret eingegebener Pflichtbeitrag bleiben im D5-Ledger sichtbar. D6 verwendet anschließend die getrennte Mischreihenfolge `100 %` sonstiges Einkommen und `45 %` verbleibendes Erwerbseinkommen. D8B1/D8B2 verwendet stattdessen seine Forecastquelle, bestätigte Minijob-Aufwendungen, seine §-16-Prozentabzüge sowie Y, M, Rohwert und Schlussrundung. Keine KiZ-Bereinigungsposition wird in Wohngeld übertragen.

Die Tests decken den Kontrollfall ohne Partner, Partner ohne Einkommen, Partner-Minijob mit expliziter RV-Pflicht und die separate RV-Befreiungsvariante ab. Die RV-Varianten sind nur eine belastbare Datenmodellprüfung: `mandatoryStatus`/Pflichtbeitrag im KiZ-Datensatz und `pensionContributionExpected` im Wohngeld-Forecast sind getrennte Eingaben. Die 21,71 EUR der RV-Pflicht-Regression sind eine konkrete Testeingabe; sie sind keine im Produkt hinterlegte Quote und werden nicht aus 603 EUR berechnet. Fehlt eine dieser Angaben, wird nicht geschätzt; der Pfad bleibt entsprechend offen.

## Regel-ID: KIZ-REDUCE-PARENT-001

### Bezeichnung
Minderung durch Elterneinkommen

### Status
GETESTET

### Zweck
Bildet aus den nach Kindeseinkommen verbleibenden Beträgen der tatsächlichen KiZ-BG-Kinder den Gesamtkinderzuschlag und mindert diesen haushaltsbezogen um den Einkommensüberschuss der Eltern. Die Regel liefert ausschließlich den Zwischenwert nach Elterneinkommen und vor Kindes-/Elternvermögen, Wohngeld, Bedarfsdeckungsprüfung und Schlussrundung.

### Eingaben
1. Je möglichem eigenen KiZ-Kind das D2-Ergebnis aus `KIZ-REDUCE-CHILD-001` mit `individualKiZAfterChildIncome` und das D4-Ergebnis der KiZ-BG-Mitgliedschaft mit `isKizBgMember`.
2. Ausschließlich `evaluateParentNeedForHousehold(...).parentTotalNeed` aus `KIZ-PARENT-NEED-001`; `familySgbIINeed` ist keine Eingabe dieser Regel.
3. Ausschließlich `evaluateAdultIncomeForHousehold(...).preparedForParentReduction` mit `earnedIncome`, `otherIncome` und `totalIncome`. Der durch D5 vorbereitete Kindergeldüberschuss ist darin bereits enthalten und wird nicht erneut addiert.
4. Für den Patchwork-Sonderfall `centralChildren[].childBenefitPerson`, auf die Antragsteller- oder Partnerrolle des konkreten Haushalts abgebildet.

### Fachliche Regel
1. Die vorläufige D2-Haushaltssumme wird nicht übernommen. Für jedes mögliche eigene KiZ-Kind müssen D2 und D4 unterstützt sein. Nur ein Kind mit `isKizBgMember === true` trägt seinen individuellen D2-Betrag bei; ein von D4 ausgeschlossenes Kind trägt 0 EUR bei. Eine ungelöste D2- oder D4-Vorstufe macht D6 ungelöst.
2. Die Summe dieser verbleibenden Kinderbeträge ist `preParentReductionKiZ`. Bleibt kein tatsächliches KiZ-BG-Kind, lautet der Status `NOT_APPLICABLE`; Ausgangsbetrag, Minderung und Ergebnis sind 0 EUR.
3. Die Einkommensminderung wird ohne Zwischenrundung zentral berechnet:
   `otherIncomeExcess = max(0, otherIncome - parentTotalNeed)`;
   `remainingNeedForEarnedIncome = max(0, parentTotalNeed - otherIncome)`;
   `earnedIncomeExcess = max(0, earnedIncome - remainingNeedForEarnedIncome)`;
   `otherIncomeReduction = otherIncomeExcess`;
   `earnedIncomeReduction = earnedIncomeExcess * 0.45`;
   `parentIncomeReductionBeforeCap = otherIncomeReduction + earnedIncomeReduction`.
4. Damit mindert anderes Einkommen den übersteigenden Teil zu 100 Prozent. Übersteigt anderes Einkommen allein den Bedarf nicht, gilt der nach Anrechnung auf den Restbedarf verbleibende Überschuss als erwerbsbedingt und mindert zu 45 Prozent. Übersteigt anderes Einkommen allein bereits den Bedarf, wird dieser Überschuss voll und das gesamte zusätzliche Erwerbseinkommen zu 45 Prozent berücksichtigt.
5. Die angewandte Minderung wird auf den vorhandenen Gesamtkinderzuschlag begrenzt: `appliedParentIncomeReduction = min(preParentReductionKiZ, parentIncomeReductionBeforeCap)`, `kizAfterParentIncomeBeforeAssets = max(0, preParentReductionKiZ - appliedParentIncomeReduction)` und `unappliedExcessReduction = max(0, parentIncomeReductionBeforeCap - preParentReductionKiZ)`. Ein Rest wird weder zwischen Haushalten noch auf andere Monate oder Kinder außerhalb der KiZ-BG übertragen.
6. Bei mehreren Kindern bleibt D6 grundsätzlich haushaltsbezogen; es werden keine künstlichen individuellen Nach-Elterneinkommen-Beträge erzeugt.
7. Nur wenn mindestens zwei verschiedene Kindergeldpersonen positive Anteile am selben Gesamtkinderzuschlag besitzen, wird die angewandte Minderung nach dem exakten Verhältnis `recipientPreParentKiZ / preParentReductionKiZ` auf Empfängerrollen verteilt. Empfänger-Minderungsanteil und Empfänger-Zwischenbetrag werden ohne frühe Prozent-, Cent- oder Voll-Euro-Rundung berechnet. Bei nur einer Kindergeldperson ist kein Split erforderlich und ihr Anteil ist 1. Ist bei mehreren positiven Kinderanteilen eine Kindergeldperson unbekannt, bleibt allein die Patchwork-Verteilung `UNRESOLVED`; der sichere haushaltsbezogene D6-Zwischenwert darf numerisch bleiben.
8. Haushalte A und B werden unabhängig ausgewertet. Einkommen, Bedarf und Minderungsrest eines Haushalts beeinflussen den anderen nicht.
9. `stabilizeArithmeticPrecision` entfernt ausschließlich technische IEEE-754-Artefakte und negative Null. Die Voll-Euro-Rundung nach § 11 Absatz 2 BKGG wird erst auf einen späteren Auszahlungsbetrag angewandt und gehört nicht zu D6.
10. Kindesvermögen, Elternvermögen, Wohngeld, Hilfebedürftigkeits-/Bedarfsdeckungsprüfung, erweiterter Zugang und endgültiger Anspruch werden nicht berechnet. Die offenen Folgeschritte werden im Ergebnis ausdrücklich weitergereicht.

### Ergebnis
`evaluateParentIncomeReduction(state, householdId)` liefert `ruleId`, `householdId`, die einbezogenen und D4-ausgeschlossenen Kinder, `preParentReductionKiZ`, `parentNeed`, die unverändert übernommenen D5-Einkommensklassen, Überschuss- und Minderungspositionen, `kizAfterParentIncomeBeforeAssets`, eine getrennte `patchworkAllocation`, Status, Warnungen, offene Prüfpunkte, verwendete Regel-IDs, Quellen-IDs und verbleibende Schritte. Zwingende ungelöste Vorstufen liefern keinen numerischen Ergebnisbetrag.

### Sonderfälle
Nur Erwerbseinkommen, nur anderes Einkommen, gemischtes Einkommen beider Reihenfolgen, Elternbedarf exakt erreicht, Minderung oberhalb des vorhandenen KiZ, kein tatsächliches KiZ-BG-Kind, D4-Ausschluss, Kindergeldüberschuss aus D5, mehrere Kinder derselben Kindergeldperson, Patchwork mit verschiedenen Kindergeldpersonen, unbekannte Kindergeldperson und vollständig getrennte Haushalte.

### Quelle
`SRC-BKGG-6A`, § 6a Absätze 4 bis 6 und 8 BKGG; `SRC-BKGG-11`, § 11 Absatz 2 BKGG; `SRC-SGBII-11-11B`; `SRC-DA-KIZ-2026-02-20`, insbesondere C.3.2, C.3.2.1 und C.3.2.1.3 Absätze 1, 4 bis 6. Gesetzliche Regelungen haben Vorrang vor der Verwaltungsauslegung.

### Stand
Am 14.08.2026 anhand der amtlichen Fassungen und der DA-KiZ vom 20.02.2026 fachlich bestätigt, danach in `calculator.js` implementiert und mit 72 eigenen D6-Tests geprüft. Der vollständige Regressionslauf umfasst 616 bestandene Tests; alle 544 vor D6 vorhandenen Tests bleiben erfolgreich.

### Testfälle
- Normalfälle: kein Überschuss; nur Erwerb 1.200 EUR bei 1.000 EUR Bedarf ergibt 90 EUR; nur anderes Einkommen 1.100 EUR ergibt 100 EUR.
- Mischfälle: anderes Einkommen 900 EUR plus Erwerb 300 EUR bei 1.000 EUR Bedarf ergibt 90 EUR; anderes Einkommen 1.100 EUR plus Erwerb 300 EUR ergibt 235 EUR.
- Amtliche Beispiele: 450 EUR anderes Einkommen plus 600 EUR Erwerb bei 1.017,68 EUR Bedarf ergibt intern 32,32 EUR Erwerbsüberschuss und 14,544 EUR Minderung; 1.450 EUR anderes Einkommen plus 300 EUR Erwerb bei 1.412 EUR Bedarf ergibt 38 EUR plus 135 EUR, insgesamt 173 EUR.
- Cap/Präzision: Ergebnis nie negativ, transparenter nicht angewandter Rest, keine Voll-Euro-Rundung, keine negative Null und keine Gleitkommaartefakte.
- Patchwork: 252 EUR und 297 EUR ergeben 549 EUR; eine Minderung von 45 EUR wird anhand der exakten Anteile proportional verteilt und summiert wieder zum Haushaltswert. Unbekannte Kindergeldperson blockiert keine ansonsten sichere Haushaltssumme, aber die Zuordnung.
- Vorstufen/Trennung: D2-, D4-, D3- und D5-UNRESOLVED werden weitergereicht; D4-ausgeschlossene Kinder zählen 0; Kindergeldüberschuss wird genau einmal über D5 übernommen; A und B bleiben unabhängig.

## Regel-ID: KIZ-ASSET-001

### Bezeichnung
Vermögensbewertung, Schutzpositionen und persönliche KiZ-Freibeträge

### Status
GETESTET

### Zweck und Stichtag
Bewertet die am ersten Tag des sechsmonatigen Bewilligungszeitraums vorhandenen Vermögenspositionen der tatsächlichen KiZ-Bedarfsgemeinschaft. `assetAssessmentDate` ist stets der erste Tag des Bewilligungszeitraums. Bis einschließlich 30.06.2026 gilt `PRE_JULY_2026`, ab 01.07.2026 `POST_JULY_2026`.

### Fachliche Regel
1. `assetsStatus=no` liefert unterstützte Nullwerte ohne Detailpflicht; `unknown` ist `UNRESOLVED`; `yes` verlangt personenbezogene Positionen.
2. BG-Mitglieder sind die antragstellende Person, bei Paaren der Partner und die von D4 bestätigten KiZ-BG-Kinder. Externe Bewohner erzeugen keinen Freibetrag. Der persönliche KiZ-Freibetrag beträgt unabhängig vom Alter 40.000 EUR für die antragstellende Person und 15.000 EUR für jedes weitere BG-Mitglied. Die altersabhängigen allgemeinen Freibeträge des § 12 SGB II werden nicht übernommen.
3. Unterstützt sind nicht negative, bestätigte und realisierbare Geld-/Marktwerte für Bargeld, Konto, Sparguthaben, Wertpapiere, Bausparen, Versicherungsrückkaufswert, Fahrzeug, selbst genutzte Immobilie, sonstige Immobilie, geschützte Altersvorsorge, Altersvorsorge Selbständiger, Wertgegenstände und Sonstiges. Schulden werden nicht pauschal saldiert. Unklare Belastung, Verwertbarkeit oder Marktwertermittlung bleibt offen; gewöhnlicher Hausrat wird nicht erfasst.
4. `protectedStatus=yes` schützt eine Position; `unknown` bleibt offen. Bei `no` ist die typabhängige Prüfung maßgeblich. Ab Juli schützt `appropriateVehicleDeclared=yes` ein Fahrzeug; `unknown` oder `no` löst eine offene Prüfung aus und führt nicht automatisch zu einem Zählwert. Bestätigte geschützte Altersvorsorge ist geschützt; unbekannte Bestätigung und nicht vollständig prüfbare Altersvorsorge Selbständiger bleiben offen.
5. Vor Juli wird eindeutig selbst genutztes Wohneigentum nach dem damaligen KiZ-Regime des erheblichen Vermögens unabhängig von der Wohnfläche geschützt. Ab Juli gelten bei Selbstnutzung 140 m² für ein Haus und 130 m² für eine Wohnung, erhöht um 20 m² für jede Person über vier Bewohner. Innerhalb der Grenze ist die Position geschützt. Bei Überschreitung schützt nur `hardshipProtection=yes`; sonst bleibt `PROPERTY_ASSET_VALUATION_REQUIRED` offen und es wird kein anteiliger Wert erfunden.
6. Andere Immobilien werden nur mit bestätigtem realisierbarem Marktwert gezählt. Einkommen und bereits als Zufluss erfasste Beträge dürfen nicht nochmals als Vermögen gezählt werden; eine unklare Abgrenzung erzeugt `ASSET_INCOME_DOUBLE_COUNT_CHECK`.
7. Je Person werden Bruttovermögen, geschützte Beträge und potenziell zählbares Vermögen geführt. Nicht genutzte persönliche Freibeträge bilden einen gemeinsamen Übertragungspool. Er deckt Überschüsse anderer Mitglieder, ohne denselben Euro zweimal zu verwenden. Reicht der Pool bei mehreren gleichzeitig überschreitenden Personen nicht und beeinflusst die Zuordnung Kindes- gegenüber Elternvermögen, lautet der Status `UNRESOLVED` mit `ASSET_ALLOWANCE_ALLOCATION_OPEN`.

### Quelle und Stand
`SRC-BKGG-6A`, `SRC-DA-KIZ-2026-02-20`, `SRC-SGBII-12-PRE-2026-07`, `SRC-SGBII-12-POST-2026-07`. Fachlich bestätigt und anschließend automatisiert umgesetzt am 15.08.2026; geprüft durch `tests/asset-rules-tests.js` und `tests/asset-integration-tests.js`.

## Regel-ID: KIZ-REDUCE-CHILD-ASSETS-001

### Bezeichnung
Minderung durch Kindesvermögen

### Status
GETESTET

### Fachliche Regel
Die Prüfung folgt für jedes Kind auf seinen individuellen D2-Betrag. Zählbares Kindesvermögen 0 ändert nichts. Ist es positiv und kleiner als der individuelle D2-Betrag, mindert es ausschließlich Monat 1 einmalig; Monate 2 bis 6 verwenden den unveränderten D2-Betrag. Ist es größer, entfällt der Anspruch für dieses Kind und der Antrag ist kindbezogen wegen Vermögens abzulehnen. `month1KiZ` beträgt 0; `months2To6KiZ` ist `null`, weil kein bewilligter sechsmonatiger Null-BWZ entsteht. `futurePeriodStatus=NEW_APPLICATION_REQUIRED` und `reapplicationPossibleFromFollowingMonth=true` bedeuten nur, dass nach Verbrauch des übersteigenden Vermögens grundsätzlich ab dem Folgemonat neu beantragt werden kann. Ein Folgeanspruch wird nicht berechnet oder zugesagt. Die gesetzlich nicht eindeutig geregelte exakte Gleichheit bleibt `UNRESOLVED` mit `ASSET_EXACT_EQUALITY_OPEN`. Beispiel: Bei D2 = 117 EUR führen 1.500 EUR zur kindbezogenen Ablehnung; 100 EUR ergeben Monat 1 = 17 EUR und Monate 2 bis 6 = 117 EUR.

### Quelle und Stand
`SRC-BKGG-6A`, `SRC-DA-KIZ-2026-02-20`. Fachlich bestätigt am 15.08.2026.

## Regel-ID: KIZ-REDUCE-PARENT-ASSETS-001

### Bezeichnung
Minderung durch Elternvermögen

### Status
GETESTET

### Fachliche Regel
Nach der Kindesvermögens- und Elterneinkommensprüfung wird ausschließlich das zählbare Vermögen der antragstellenden Person und gegebenenfalls des Partners verwendet; Kindesvermögen wird kein zweites Mal einbezogen. Ein positiver Betrag unter dem nach Elterneinkommen verbleibenden KiZ des ersten Monats wird einmalig nur in Monat 1 abgezogen. Ein höherer Betrag führt zur Ablehnung des Antrags grundsätzlich nur für den Antragsmonat: `month1KiZ=0`, `months2To6KiZ=null`, `futurePeriodStatus=NEW_APPLICATION_REQUIRED` und `reapplicationPossibleFromFollowingMonth=true`. Es wird weder ein sechsmonatiger Null-BWZ noch ein Folgeanspruch berechnet. Exakte Gleichheit bleibt `UNRESOLVED` mit `ASSET_EXACT_EQUALITY_OPEN`.

### Quelle und Stand
`SRC-BKGG-6A`, `SRC-DA-KIZ-2026-02-20`. Fachlich bestätigt am 15.08.2026.

## Regel-ID: KIZ-ASSET-INTEGRATION-001

### Bezeichnung
Monatspipeline für Kindes- und Elternvermögen

### Status
GETESTET

### Fachliche Regel
1. Reihenfolge: maximaler KiZ → Kindeseinkommen → Kindesvermögen → Gesamtkinderzuschlag → Elterneinkommen → Elternvermögen.
2. Die D6-Rechenformel wird wiederverwendet, aber getrennt auf die tatsächliche Kindersumme für Monat 1 und die reguläre Summe für Monate 2 bis 6 angewandt. `parentIncomeReductionBeforeCap` bleibt in beiden Gruppen identisch; nur der angewandte Cap richtet sich nach der jeweiligen Ausgangssumme.
3. Das Ergebnis enthält `assetAssessmentDate`, `assetRuleVersion`, `assetAssessment`, `month1`, `months2To6`, `months2To6Count`, `rejectedDueToAssets`, Status, Warnungen, offene Prüfungen und Folgeschritte. Nur bei einem tatsächlich fortlaufenden BWZ enthält `months2To6` eine berechnete Monatsgruppe und `months2To6Count=5`. Bei vermögensbedingter Ablehnung ist `months2To6=null`; der Folgezeitraum benötigt einen neuen Antrag und eine neue Prüfung.
4. Wird ein Kind vermögensbedingt ausgeschlossen und könnte dies die D3-Kinderzahl und damit den Elternbedarf ändern, bleibt die nachgelagerte Elternminderung mit `PARENT_NEED_AFTER_CHILD_ASSET_REJECTION_OPEN` sichtbar offen, bis die Rechtsfolge bestätigt ist.
5. Bei mehreren Empfängern kann die sichere Haushaltssumme numerisch bleiben. Ist die Zuordnung einer positiven Vermögensminderung nicht bestätigt, bleibt allein die Verteilung mit `ASSET_PATCHWORK_ALLOCATION_OPEN` ungelöst. Es wird keine Verteilungsheuristik erfunden.
6. Das nach den besonderen KiZ-Grenzen von 40.000/15.000 EUR ermittelte Ergebnis heißt ausschließlich `countableAssetsForKizReduction` und enthält `children`, `parents` und `householdTotal`. Es ist kein Vermögenswert für die SGB-II-Hilfebedürftigkeitsprüfung.
7. Die eigenständige Vermögensprüfung für den späteren Coverage-Check wird als `coverageAssetAssessment.status=NOT_EVALUATED`, `countableAssets=null` und `SGBII_COVERAGE_ASSET_RULES_NOT_EVALUATED` ausgewiesen. KiZ-Vermögensminderung nach § 6a BKGG und SGB-II-Hilfebedürftigkeitsprüfung nach §§ 9 und 12 SGB II dürfen niemals dieselbe Ergebnisvariable verwenden. Auch `assetsStatus=no` bestätigt in D7 nur `countableAssetsForKizReduction=0`; ob diese Nutzerangabe für einen späteren SGB-II-Standardfall genügt, entscheidet erst die Coverage-Phase.
8. Wohngeld, eigenständige SGB-II-Coverage-Vermögensprüfung, abschließender Bedarfsdeckungscheck, erweiterter Zugang, Schlussrundung, Auszahlungszuordnung und endgültiger Anspruch gehören nicht zu D7/D7.1.
9. Ist der Gesamtkinderzuschlag bereits nach der vollständig unterstützten Eltern-Einkommensminderung D6 exakt 0 EUR, kann Vermögen den Zahlbetrag nicht weiter mindern. D9 darf deshalb ohne D7-Detailprüfung einen sicheren Zahlbetrag 0 EUR und `CALCULATED_NOT_ENTITLED` mit `FINAL_AMOUNT_ZERO` feststellen. Ein unbekannter Vermögensstatus wird in diesem eng begrenzten Nullfall nicht als entscheidungsblockierend behandelt; daraus wird weder ein Vermögenswert noch eine Aussage über vorhandenes oder nicht vorhandenes Vermögen abgeleitet.

### Korrekturstand D7.1
Am 15.08.2026 anhand von § 6a Absätze 3 und 6 BKGG sowie DA-KiZ C.2.2.2.3 und C.3.2.2.3 fachlich korrigiert: Eine Ablehnung wegen zu hohen Vermögens wird nicht mehr als automatisch sechsmonatiger Null-BWZ dargestellt. Die Korrektur betrifft ausschließlich Ergebnissemantik und Dokumentation; Datenversion 11 und sämtliche persistenten Eingaben bleiben unverändert.

## Regel-ID: KIZ-COVERAGE-INCOME-001

### Status
GETESTET

### Fachliche Regel
D8A übernimmt `familySgbIINeed` unverändert aus `KIZ-FAMILY-SGBII-NEED-001`. Erwachsenen-Coverage-Einkommen ist ausschließlich D5 `regularIncome.averageEarned + averageOther`; der KiZ-spezifische D5-Kindergeldüberhang in `preparedForParentReduction` wird nicht übernommen und Einkommen nicht nochmals bereinigt. Für SGB-II-BG-Kinder wird das volle `countableChildIncomeAverage`, nicht die 45-Prozent-KiZ-Minderung, berücksichtigt. Einkommen eines Nicht-BG-Kindes wird nicht heuristisch auf Eltern übertragen; ein entscheidungsrelevanter Überschuss bleibt `HOUSEHOLD_COMMUNITY_SUPPORT_NON_BG_CHILD_OPEN`.

## Regel-ID: KIZ-COVERAGE-CHILD-BENEFIT-001

### Status
GETESTET

### Fachliche Regel
Je Kind wird die bestehende D4-Zuordnung `childBenefitForSgbIIMembership` verwendet. `remainingNeedAfterOwnSgbIIIncome=max(0,totalChildNeed-countableChildIncomeAverage)`, der kindbezogene Anteil ist das Minimum aus zugeordnetem Kindergeld und Restbedarf, der Coverage-Überschuss für Eltern der positive Rest. Beide Teile ergeben stets wieder das in diesem Haushalt gezählte Kindergeld. Nicht-BG-Kindereinkommen wird nicht übertragen. Ist ein positives KiZ-Kind kein SGB-II-BG-Mitglied und lässt sich sein KiZ-Anteil nicht eindeutig bestimmen, bleibt `COVERAGE_KIZ_CHILD_ALLOCATION_OPEN`.

## Regel-ID: KIZ-COVERAGE-001

### Status
GETESTET

### Fachliche Regel
Coverage verwendet ausschließlich D7 `month1.kizAfterAssets`. Eine vorherige vollständige Vermögensablehnung ist `NOT_APPLICABLE_DUE_TO_PRIOR_ASSET_REJECTION` mit `coverageDecision=null`; eine offene D7-Teilablehnung bleibt `UNRESOLVED`. `resourcesWithoutWohngeld=adultCoverageIncome+childCoverageIncome+coverageKiZ`; Lücken und Überschüsse werden ohne Voll-Euro-Rundung bei 0 gedeckelt. Die Reihenfolge lautet: Einkommen und KiZ prüfen, entscheidungserhebliches Coverage-Vermögen prüfen, danach vorhandenes oder erforderlichenfalls fiktives Wohngeld berücksichtigen und erst dann den erweiterten Zugang prüfen. `approved` verwendet den bewilligten Wohngeldbetrag, `estimated` einen externen vorläufigen Wert, `none` bestätigte 0. `unknown` ist unschädlich, wenn der Bedarf bereits ohne Wohngeld gedeckt ist. Besteht ohne Wohngeld eine Lücke, darf `FICTIVE_HOUSING_BENEFIT_REQUIRED` nur bei `coverageAssetStatus=confirmed-none` ausgegeben werden; bei `present` oder `unknown` ist zuerst `SGBII_COVERAGE_ASSET_AMOUNT_NOT_EVALUATED` maßgeblich. Normaler Zugang ist erfüllt, wenn die Restlücke 0 ist.

Die Coverage-Vermögensangabe ist eigenständig: Nur `coverageAssetStatus=confirmed-none` erlaubt 0. `present` oder `unknown` erzeugen `SGBII_COVERAGE_ASSET_AMOUNT_NOT_EVALUATED`, soweit die Entscheidung davon abhängt. `assetsStatus` und die KiZ-Grenzen 40.000/15.000 EUR werden nicht übernommen. Eine vollständige §-12-SGB-II-Vermögensberechnung bleibt offen. Deuten vorhandene KV/PV-Abzugsdaten konkret auf einen nicht als Pflichtbeitrag bestätigten und damit möglicherweise zusätzlich zu prüfenden §-26-Zuschuss hin, bleibt D8A mit `COVERAGE_KV_PV_SUBSIDY_CHECK_REQUIRED` ungelöst; eine Beitragsberechnung wird nicht erfunden.

### Korrekturstand D8A.1
Bei unbekanntem Wohngeld und positiver Lücke wird zuerst geprüft, ob `coverageAssetStatus=confirmed-none` bestätigt ist. Nur dann ist `FICTIVE_HOUSING_BENEFIT_REQUIRED` bereits erforderlich. Bei `present` oder `unknown` bleibt die Prüfung mit `SGBII_COVERAGE_ASSET_AMOUNT_NOT_EVALUATED` offen, weil ohne vollständige Vermögensbewertung nicht feststeht, ob überhaupt noch eine Wohngeldlücke besteht. Bekannter Wohngeldwert oder bereits ohne Wohngeld gedeckter Bedarf können dagegen normalen Zugang weiterhin ohne unnötige Vermögensblockierung ergeben. Erweiterter Zugang wird erst nach geklärtem entscheidungserheblichem Vermögen geprüft. D8A.1 ergänzt keine Eingabefelder, Betragsformel oder Vermögensengine.

## Regel-ID: KIZ-EXTENDED-ACCESS-001

### Status
GETESTET

### Fachliche Regel
Bei `0 < gapAfterWohngeld <= 100` wird der erweiterte Zugang geprüft. Zusätzlich müssen die im D5-Monatsledger tatsächlich angewandten allgemeinen Absetzbeträge nach § 11b Absätze 2 und 3 im Sechsmonatsdurchschnitt mindestens 100 EUR betragen und `extendedAccessSgbBenefitStatus=none` sein. Maßgeblich sind der angewandte Grundabsetzbetrag oder – soweit er ersetzt wird – die tatsächlich angewandten Nummern-3-bis-5-Aufwendungen sowie der Erwerbstätigenfreibetrag. Steuern, Pflicht-SV, sonstige Abzüge, Unterhalt und Elterngeldfreibetrag zählen nicht in diese 100-EUR-Bedingung. Jeder der sechs Monate bleibt im Divisor; die Personenwerte von antragstellender Person und Partner werden addiert. Sonderregime nach § 11b Absatz 2b bleiben `EXTENDED_ACCESS_SPECIAL_ALLOWANCE_OPEN`. Bezug oder Antrag von SGB-II-/SGB-XII-Leistungen schließt nur den erweiterten, nicht den bereits erfüllten normalen Zugang aus; ein Leistungsverzicht wird nicht verlangt.

### Quelle und Abgrenzung D8A
§ 6a Absätze 1 Nummer 3, 1a, 7 und 8 BKGG; §§ 7, 9, 11 bis 12 und 20 bis 26 SGB II; DA-KiZ C.4 bis C.4.3, Stand 20.02.2026. Automatische Wohngeld-/Lastenzuschussberechnung, vollständiges Coverage-Vermögen, Endrundung und Endbetrag sind nicht Bestandteil von D8A.

### Quelle und Stand
`SRC-BKGG-6A`, `SRC-SGBII-7`, `SRC-SGBII-11-11B`, `SRC-SGBII-26`, `SRC-DA-KIZ-2026-02-20` und die drei vorstehenden D7-Regeln. Fachlich bestätigt, implementiert und am 15.08.2026 mit 121 D8A/D8A.1-Tests in `tests/coverage-tests.js` getestet.

## Regel-ID: KIZ-PATCHWORK-001

### Bezeichnung
Patchworkfamilien und unterschiedliche kindergeldberechtigte Personen

### Status
ZU PRÜFEN

### Zweck
Ordnet spätere Minderungen und Auszahlungsanteile in Patchworkhaushalten zu.

### Eingaben
Kinder je Haushalt, `childBenefitPerson`, Personenrollen, vorläufige Kinderbeträge und Elternminderung.

### Fachliche Regel
Die proportionale Verteilung der D6-Elterneinkommensminderung nach positiven KiZ-Anteilen verschiedener Kindergeldpersonen ist unter `KIZ-REDUCE-PARENT-001` bestätigt und getestet. Unter dieser weiter gefassten Regel-ID bleiben tatsächliche getrennte Auszahlung, Schlussrundung und weitere Patchwork-Endfälle ZU PRÜFEN; D6 erzeugt noch keinen Auszahlungsbetrag.

### Ergebnis
Geplante Aufteilung je Kind und kindergeldberechtigter Person.

### Sonderfälle
Gemeinsame und jeweils eigene Kinder, Kindergeld bei verschiedenen Personen, externe Person.

### Quelle
`SRC-PRODUCT-SPEC-2026`, vorgesehen `SRC-DA-KIZ-2026-02-20`.

### Stand
Produktstand 2026; Formel offen.

### Testfälle
- Normalfall: alle Kinder derselben Kindergeldperson zugeordnet.
- Grenzfall: zwei Personen mit jeweils einem Kind.
- Sonderfall: Paar mit gemeinsamen und jeweils eigenen Kindern.

## Regel-ID: KIZ-SINGLE-001

### Bezeichnung
Einzelhaushaltsmodus

### Status
BESTÄTIGT (strukturell)

### Zweck
Begrenzt die spätere Berechnung auf Haushalt A.

### Eingaben
`mode = "single"`, Haushalte und Kinderzuordnungen.

### Fachliche Regel
Nur Haushalt A wird berechnet. Daten von Haushalt B bleiben gespeichert. Ausschließlich B zugeordnete Kinder werden nicht A zugerechnet.

### Ergebnis
Geplanter Ergebniszweig nur für Haushalt A; B bleibt `not_calculated`.

### Sonderfälle
A/B-Wechselmodell-Kind bleibt strukturell als solches gespeichert; fachliche Einzelbetrachtung ist noch zu prüfen.

### Quelle
`SRC-PRODUCT-SPEC-2026`; strukturell in `validation.js` vorbereitet.

### Stand
Phase 2, Produktspezifikation 2026.

### Testfälle
- Normalfall: A-only-Kind.
- Grenzfall: gemeinsames A/B-Kind.
- Sonderfall: B-only-Kind wird ausgeschlossen, aber nicht gelöscht.

## Regel-ID: KIZ-COMPARE-001

### Bezeichnung
Vergleichsmodus

### Status
BESTÄTIGT (strukturell)

### Zweck
Bereitet getrennte Ergebnisse für A und B vor.

### Eingaben
`mode = "compare"`, beide Haushalte und zentrale Kinderliste.

### Fachliche Regel
Haushalt A und Haushalt B werden als getrennte relevante Haushalte verarbeitet. Gemeinsame Kinder bleiben einmal zentral gespeichert und werden strukturell beiden Haushalten zugeordnet.

### Ergebnis
Geplante getrennte Haushaltsresultate und ein Vergleichsobjekt.

### Sonderfälle
Externe Haushalte werden nicht als dritter Vergleichshaushalt berechnet.

### Quelle
`SRC-PRODUCT-SPEC-2026`; strukturell in `validation.js` vorbereitet.

### Stand
Phase 2, Produktspezifikation 2026.

### Testfälle
- Normalfall: je ein A- und B-only-Kind.
- Grenzfall: nur gemeinsame Kinder.
- Sonderfall: B/externes Wechselmodell-Kind.

## Regel-ID: KIZ-SCENARIO-001

### Bezeichnung
Szenariovergleich zur Kindergeldverteilung

### Status
OFFEN

### Zweck
Vergleicht später die aktuelle Kindergeldverteilung mit alternativen Zuordnungen gemeinsamer Wechselmodell-Kinder.

### Eingaben
Vergleichsmodus, gemeinsame Wechselmodell-Kinder, aktuelle Kindergeldzuordnung, `scenarioHalfForwarding`.

### Fachliche Regel
Die Oberfläche plant Szenarien „alle gemeinsamen Wechselmodell-Kinder bei A“ und „bei B“ sowie optional hälftige Weiterleitung. OFFEN – fachliche Prüfung erforderlich. Der Rechner entscheidet nicht über die rechtliche Möglichkeit eines Wechsels.

### Ergebnis
Geplante unveränderte Baseline und getrennte Szenarioergebnisse A/B.

### Sonderfälle
Kindergeld bei externer Person, B-only- oder A-only-Kinder, unterschiedliche Personen innerhalb eines Haushalts.

### Quelle
`SRC-PRODUCT-SPEC-2026`; fachliche Quellenzuordnung offen.

### Stand
OFFEN.

### Testfälle
- Normalfall: aktuelle Verteilung bleibt Baseline.
- Grenzfall: alle gemeinsamen Kinder bei A beziehungsweise B.
- Sonderfall: Szenario mit angenommener hälftiger Weiterleitung.

## Regel-ID: KIZ-PROTOCOL-001

### Bezeichnung
Rechenprotokoll und Transparenz

### Status
BESTÄTIGT (Strukturziel)

### Zweck
Macht jeden späteren Rechenschritt nachvollziehbar.

### Eingaben
Angewendete Regel-ID, Eingaben, Zwischenwerte, Formel, Ergebnis, Quelle und Warnungen.

### Fachliche Regel
Jeder implementierte Rechenschritt muss seine stabile Regel-ID und den verwendeten Quellenstand protokollieren. Offene Regeln dürfen keinen Formel- oder Ergebnisdatensatz erzeugen.

### Ergebnis
Geplante geordnete Protokollliste je Haushalt, Kind, Person und Szenario.

### Sonderfälle
Nicht angewendete Regeln, Warnungen, abgebrochene Berechnung nach Validierungsfehler.

### Quelle
Projektregel, `SRC-PRODUCT-SPEC-2026`.

### Stand
Phase 3.

### Testfälle
- Normalfall: jeder Schritt enthält eine bekannte Regel-ID.
- Grenzfall: Regel ohne Zwischenwert dokumentiert `null`, nicht erfundene 0.
- Sonderfall: offene Regel verhindert Berechnung und wird als offen protokolliert.

## Geplante Rückgabestruktur von calculator.js

Die folgende Struktur ist ein technischer Zielvertrag, keine berechnete Ausgabe. Unbestimmte Werte sind `null`; sie dürfen nicht als 0 ausgegeben werden. Feldnamen können nur mit dokumentierter Migration geändert werden.

```js
{
  calculationVersion: "CALCULATION_SPEC-version",
  calculationStatus: "not_calculated | blocked | calculated",
  calculationDate: "ISO-8601 oder null",
  applicationMonth: 7,
  applicationYear: 2026,
  mode: "single | compare",
  sourceVersions: [
    { sourceId: "SRC-...", stand: "..." }
  ],
  validation: {
    isValid: false,
    errorCount: 0,
    warningCount: 0,
    infoCount: 0
  },
  households: {
    A: {
      status: "not_calculated | blocked | calculated",
      relevantChildren: ["central-1"],
      eligibleChildren: [],
      childResults: [
        {
          childId: "central-1",
          childBenefitPerson: "applicant-a",
          maximumKiz: null,
          childIncomeReduction: null,
          parentIncomeReductionShare: null,
          estimatedKiz: null,
          appliedRuleIds: [],
          warnings: []
        }
      ],
      personResults: [
        {
          personId: "applicant-a",
          childIds: [],
          estimatedPaymentShare: null,
          appliedRuleIds: []
        }
      ],
      minimumIncomeCheck: {
        status: "not_calculated",
        threshold: null,
        relevantIncome: null,
        passed: null,
        appliedRuleIds: []
      },
      needsCheck: {
        status: "not_calculated",
        adultNeeds: null,
        childNeeds: null,
        additionalNeeds: null,
        totalNeeds: null,
        appliedRuleIds: []
      },
      housingCalculation: {
        status: "not_calculated",
        enteredCosts: {},
        consideredCosts: null,
        allocation: null,
        appliedRuleIds: []
      },
      incomeCalculation: {
        status: "not_calculated",
        adultIncome: [],
        childIncome: [],
        deductions: [],
        relevantIncome: null,
        appliedRuleIds: []
      },
      housingBenefitCalculation: {
        status: "not_calculated",
        enteredAmount: null,
        consideredAmount: null,
        appliedRuleIds: []
      },
      coverageCheck: {
        status: "not_calculated",
        needs: null,
        availableMeans: null,
        difference: null,
        passed: null,
        appliedRuleIds: []
      },
      estimatedKiz: null,
      warnings: []
    },
    B: {
      status: "not_calculated"
    }
  },
  comparison: {
    status: "not_calculated | not_applicable | calculated",
    householdA: null,
    householdB: null,
    total: null,
    appliedRuleIds: []
  },
  scenarios: {
    status: "not_calculated | not_applicable | calculated",
    baseline: null,
    allSharedChildrenBenefitAtA: null,
    allSharedChildrenBenefitAtB: null,
    halfForwardingAssumed: false,
    appliedRuleIds: []
  },
  protocol: [],
  warnings: []
}
```

Die endgültige Struktur wird vor Implementierung als eigener Datenvertrag bestätigt. Insbesondere dürfen `estimatedKiz`, Anspruchsstatus oder Prüfergebnisse erst bei vollständig bestätigten Regeln von `null` abweichen.

## Geplante Struktur des Rechenprotokolls

Jeder protokollierte Rechenschritt soll später mindestens folgendes Format verwenden:

```js
{
  sequence: 1,
  ruleId: "KIZ-WM-001",
  ruleStatus: "GETESTET",
  scope: {
    household: "A",
    childId: "central-1",
    personId: null,
    scenarioId: null
  },
  title: "Bedarf eines Wechselmodell-Kindes",
  description: "...",
  inputs: {},
  intermediateValues: {},
  formula: null,
  result: null,
  source: {
    sourceId: "SRC-...",
    stand: "..."
  },
  warnings: []
}
```

Für nicht bestätigte Regeln bleiben `formula` und `result` `null`. Das Protokoll darf keine Formel aus Freitext, UI-Hinweisen oder nicht bestätigten Quellen rekonstruieren.

## Verbindliche Berechnungstestfälle

Die folgende `CALC-TEST-*`-Tabelle ist ein historischer Planungsstand aus der frühen Projektphase. `OFFEN` beschreibt dort den damaligen Planungsstatus, nicht den heutigen Implementierungs- oder Teststatus. Der aktuelle Status wird durch die Phasenabschnitte, die Regel-IDs und den zentralen Testlauf beschrieben; für neue Regeln werden keine Zahlen aus dieser historischen Tabelle abgeleitet.

Die folgenden Testfälle sind Testpläne. Erwartete Zahlen bleiben `OFFEN`, solange die jeweils benötigten Regeln nicht mindestens `BESTÄTIGT` sind.

| Test-ID | Eingaben / Konstellation | Zu prüfende Regel-IDs | Erwartetes Ergebnis |
|---|---|---|---|
| `CALC-TEST-001` | Ein Haushalt, alleinerziehend, ein Kind, kein Einkommen, keine Sonderfälle | `KIZ-GEN-001`, `KIZ-SINGLE-001`, `KIZ-MIN-INCOME-001`, `KIZ-MAX-001` | OFFEN; keine Zahl festgelegt |
| `CALC-TEST-002` | Ein Haushalt, Paar, ein Kind | `KIZ-HH-001`, `KIZ-NEED-001`, `KIZ-INCOME-ADULT-001` | OFFEN |
| `CALC-TEST-003` | Ein Haushalt, mehrere Kinder | `KIZ-CHILD-001`, `KIZ-MAX-001`, `KIZ-REDUCE-PARENT-001` | OFFEN |
| `CALC-TEST-004` | Ein echtes 50/50-Wechselmodell-Kind | `KIZ-WM-001`, `KIZ-KG-001`, `KIZ-HOUSING-001` | OFFEN |
| `CALC-TEST-005` | Drei gemeinsame Wechselmodell-Kinder | `KIZ-WM-001`, `KIZ-REDUCE-PARENT-001` | OFFEN |
| `CALC-TEST-006` | Kind A1 Kindergeld A, Kind A2 B, Kind A3 B | `KIZ-KG-001`, `KIZ-PATCHWORK-001` | OFFEN |
| `CALC-TEST-007` | Nachgewiesene hälftige Kindergeldweiterleitung | `KIZ-KG-001`, `KIZ-COVERAGE-001` | OFFEN |
| `CALC-TEST-008` | Kind B1 dauerhaft in Haushalt B | `KIZ-RESIDENCE-001`, `KIZ-PATCHWORK-001` | OFFEN |
| `CALC-TEST-009` | Kind B2 im Wechselmodell B/extern | `KIZ-WM-EXT-001`, `KIZ-KG-001` | OFFEN |
| `CALC-TEST-010` | Paar mit jeweils eigenen Kindern und unterschiedlichen Kindergeldpersonen | `KIZ-PATCHWORK-001`, `KIZ-REDUCE-PARENT-001` | OFFEN |
| `CALC-TEST-011` | Kind mit eigenem Einkommen | `KIZ-INCOME-CHILD-001`, `KIZ-REDUCE-CHILD-001` | Für unterstützte D1.5-Fälle: 45 Prozent des Durchschnitts mindern den individuellen Höchstbetrag, mindestens 0 EUR; weitere Anspruchsschritte bleiben offen |
| `CALC-TEST-012` | Erwachsene Person mit mehreren Einkommensquellen | `KIZ-PERIOD-001`, `KIZ-INCOME-ADULT-001`, `KIZ-DEDUCTION-001` | OFFEN |
| `CALC-TEST-013` | Mietwohnung | `KIZ-HOUSING-001` | OFFEN |
| `CALC-TEST-014` | Selbstgenutztes Wohneigentum | `KIZ-HOUSING-001` | OFFEN |
| `CALC-TEST-015` | Wohngeld tatsächlich bewilligt | `KIZ-WOHNGELD-001`, `KIZ-COVERAGE-001` | GETESTET |
| `CALC-TEST-016` | Wohngeld fiktiv geschätzt oder automatisch berechnet | `KIZ-WOHNGELD-001`, `KIZ-COVERAGE-001`, `WG-AMOUNT-001` | GETESTET |
| `CALC-TEST-017` | Vergleichsmodus A gegen B | `KIZ-COMPARE-001`, `KIZ-HH-001` | Struktur getrennt; Beträge OFFEN |
| `CALC-TEST-018` | Szenario: gemeinsame Wechselmodell-Kinder mit Kindergeld bei A | `KIZ-SCENARIO-001`, `KIZ-KG-001` | OFFEN |
| `CALC-TEST-019` | Szenario: gemeinsame Wechselmodell-Kinder mit Kindergeld bei B | `KIZ-SCENARIO-001`, `KIZ-KG-001` | OFFEN |
| `CALC-TEST-020` | Kind A1, Kind A2, Kind A3, Kind B1 und Kind B2 im komplexen Patchworkfall | alle einschlägigen Regeln, besonders `KIZ-WM-001`, `KIZ-WM-EXT-001`, `KIZ-PATCHWORK-001`, `KIZ-COMPARE-001` | OFFEN; keine Zahlen erfunden |

Jeder Testfall wird vor Implementierung um vollständige Eingabefiksturen, bestätigte Quellenstände und exakte erwartete Zwischen- und Endwerte ergänzt. Ein Testfall darf erst dann als Berechnungstest implementiert werden, wenn alle für sein erwartetes Ergebnis notwendigen Regeln bestätigt sind.

## Empfohlene Implementierungsreihenfolge


Die Phasen A bis C sowie D1.5 bis D9 sind für die jeweils dokumentierten Standardfälle umgesetzt. Dazu gehören Kinder-/Familienbedarf, Erwachsenen-Einkommensbereinigung, Elterneinkommensminderung, bestätigte Vermögensfälle, Coverage, mathematischer Miet-/Lastenzuschuss, kontrolliertes fiktives Wohngeld, normaler und erweiterter Zugang sowie Endentscheidung und Schlussrundung. Die frühere Angabe von 1114 bestandenen Tests ist ein historischer Meilenstein; der aktuelle Stand umfasst 1311/1311 bestandene Tests einschließlich Ergebnis-ViewModel, Partner-/Minijob-Golden-Paths, Szenariovergleich-MVP und Public-/Private-Trennung sowie Scenario-UI-Events. Vollständiges SGB-II-Coverage-Vermögen, komplexe §-26-Beitragsberechnung, automatische §-20-/§-21-Nr.-3-Wohngeldprüfung, zukünftige 2027-Werte und die ausdrücklich dokumentierten Sonderfälle bleiben gesperrt.
### Phase A: Datenvertrag und reine Hilfsfunktionen
State-Eingang, Ergebnisvertrag, Regelregister und protokollierbare Hilfsstrukturen.

### Phase B: Relevante Haushalte und Kinder
Getestete strukturelle Regeln `KIZ-HH-001`, `KIZ-CHILD-001`, `KIZ-KG-001`, `KIZ-WM-001`, `KIZ-WM-EXT-001`, `KIZ-RESIDENCE-001` und `KIZ-CONTACT-001` sowie bestätigte Modusregeln `KIZ-SINGLE-001` und `KIZ-COMPARE-001`. Monetäre Anspruchs- und Bedarfsregeln bleiben gesperrt.

### Phase C: Zeitraum und Einkommensaufbereitung
Getestet umgesetzt: `KIZ-PERIOD-001`, `KIZ-INCOME-ADULT-001`, `KIZ-INCOME-CHILD-001` und `KIZ-DEDUCTION-001`. Nicht eindeutig abbildbare Arten und Sonderfälle bleiben positionsbezogen `UNRESOLVED` oder `OPEN_CHECK`.

### Phase D: Grundbedarfe und Wohnkosten
Getestet umgesetzt für den abgegrenzten Elternbedarf: `KIZ-PARENT-NEED-001`, `KIZ-PARENT-ADDITIONAL-NEED-001`, `KIZ-HOUSING-RECOGNITION-001` und `KIZ-PARENT-HOUSING-SHARE-001`. Kinderbedarfe und der Familien-SGB-II-Gesamtbedarf bleiben unter den allgemeinen Regelgruppen offen.

### Phase E: Maximaler Kinderzuschlag pro Kind
Erst nach Bestätigung von `KIZ-CHILD-001` und `KIZ-MAX-001`.

### Phase F: Minderung durch Kindeseinkommen
Getestet umgesetzt: `KIZ-REDUCE-CHILD-001` verwendet ausschließlich den unterstützten Durchschnitt aus `KIZ-INCOME-CHILD-001` und den individuellen Höchstbetrag aus `KIZ-MAX-001`. Kindesvermögen, Elternminderung und alle späteren Anspruchsschritte bleiben gesperrt.

### Phase G: Elterneinkommen
Getestet umgesetzt: `KIZ-REDUCE-PARENT-001` konsumiert ausschließlich `parentTotalNeed`, D5 `preparedForParentReduction` und die je Kind durch D4 gefilterten D2-Zwischenbeträge. Die 100-/45-Prozent-Mischreihenfolge, der Cap und die proportionale D6-Patchwork-Zuordnung sind getestet; Vermögen und alle Endschritte bleiben gesperrt.

### Phase H: Bedarfsdeckungscheck
D8A/D8B3 ist für dokumentierte Standardfälle mit `KIZ-COVERAGE-INCOME-001`, `KIZ-COVERAGE-CHILD-BENEFIT-001`, `KIZ-COVERAGE-001`, `KIZ-EXTENDED-ACCESS-001` und dem modular konsumierten `WG-AMOUNT-001` getestet. Bewilligte und externe Wohngeldwerte bleiben vorrangig; automatische fiktive Werte sind nur unter den dokumentierten D8B3-Voraussetzungen freigegeben.

### Phase I: Patchwork-Aufteilung
Erst nach Bestätigung von `KIZ-PATCHWORK-001` und aller verwendeten Minderungsregeln.

### Phase J: Vergleichsmodus und Szenarien
Vergleichsstruktur zuerst; Szenariorechnung erst nach Bestätigung von `KIZ-SCENARIO-001`.

### Phase K: Rechenprotokoll
`KIZ-PROTOCOL-001` parallel zu jeder implementierten Regel anwenden; kein nachträgliches Freitextprotokoll.

### Phase L: Oberflächenintegration
Ergebnisse erst anzeigen, wenn Ergebnisvertrag, fachliche Regeln und Tests bestätigt sind.

## Freigabecheck vor jeder Implementierung

Vor einer Änderung an `calculator.js` muss für jede betroffene Regel nachgewiesen sein:

1. stabile Regel-ID vorhanden,
2. Status mindestens `BESTÄTIGT`,
3. exakte Fachregel vollständig beschrieben,
4. benötigte Eingabefelder im Datenvertrag vorhanden,
5. Ergebnisfeld definiert,
6. Primärquelle und Stand dokumentiert,
7. Normal-, Grenz- und Sonderfall mit erwarteten Werten festgelegt,
8. Rechenprotokoll-Eintrag geplant.

Fehlt einer dieser Punkte, ist die Implementierung blockiert.

## Phase D8B1: Wohngeld-Bemessungsgrundlagen

D8B1 ist ein vom KiZ-Rechenkern unabhängiger, DOM-freier Wohngeld-Grundlagenkern. Er darf Rohdaten des Haushalts verwenden, aber insbesondere weder `familySgbIINeed`, `parentTotalNeed`, D5-Resultate, D3-Wohnkostenresultate noch D7-Vermögenswerte als fertige Wohngeldgröße übernehmen. Der Bewilligungszeitraum wird als zwölfmonatiger Prognosezeitraum abgebildet; bei abweichender Dauer bleibt die gesetzliche Hochrechnung nach § 15 Absatz 4 WoGG offen.

### Datenvertrag D8B1

Jeder Haushalt besitzt `wohngeldData` mit `calculationMode`, `mietstufe`, personenbezogenen Einträgen für antragstellende Person, Partner/in und Kinder, einem eigenen Anpassungsstatus für Nicht-Haushaltsmitglieder, Lastenzuschussfeldern, Alleinerziehendenstatus und Unterhaltsabzügen. Neue Statuswerte wurden mit Datenversion 13 als `unknown`, neue Beträge als leer migriert. D8B3 ergänzt mit Datenversion 14 die beiden Prechecks `section20Status` und `significantAssetsStatus`, ebenfalls defensiv als `unknown`; die nachfolgende UX1.1-Migration führt Datenversion 15 für Prognosebasis und Bewohnerauswahl, UX1.3 Datenversion 16 für den Erwachsenen-Einkommensstatus. Leere Beträge sind nicht 0.

Ein personenbezogener Eintrag enthält `wohngeldExclusionStatus`, optionalen Ausschlussgrund, gegebenenfalls genaue Betreuungstage im 30-Tage-Referenzmonat, eine Wohngeld-Prognose mit `incomeStatus`, `mode`, Quellen und den drei §-16-Statuswerten sowie bestätigungspflichtige §-17-/17a-Merkmale. Prognosemodi sind `same-monthly`, `custom-monthly`, `annual` und `unknown`; `incomeStatus=none` ist die ausdrückliche Nullbestätigung.

Unterstützte Prognosequellen sind Beschäftigung, Minijob, Krankengeld, Arbeitslosengeld I, Elterngeld, Kindes-/Erwachsenenunterhalt, UVG, bestätigter Selbständigengewinn sowie bestätigte positive steuerliche Einkünfte aus Vermietung, Kapital oder sonstigen Einkunftsarten. Kindergeld und Kinderzuschlag werden als ausdrücklich ausgeschlossene Typen erkannt, aber nicht zum Jahreseinkommen addiert. Andere oder nicht ausreichend bestimmte Quellen bleiben offen.

### `WG-HOUSEHOLD-001` – Wohngeld-Haushaltsmitglieder

**Status:** `GETESTET` nach erfolgreichem D8B1-Testlauf.

**Fachliche Regel:** Die wohngeldberechtigte Person, der im gemeinsamen Wohnraum lebende Ehe-/Lebenspartner beziehungsweise die bestätigte Verantwortungs- und Einstehensgemeinschaft sowie relevante Kinder werden eigenständig nach § 5 WoGG betrachtet. KiZ- oder SGB-II-BG-Ergebnisse werden nicht verwendet. Bei getrennt lebenden Eltern ist ein Kind in beiden Haushalten Mitglied, wenn es annähernd gleichteilig oder mindestens im Verhältnis 1/3 zu 2/3 betreut wird; im 30-Tage-Referenzmonat genügen mindestens 10 Tage. Eine ungenaue Kategorie ohne sicheren Schluss erzeugt `WG_CARE_RATIO_REQUIRED`.

Unterschreiten bei einem geringer betreuenden Elternteil mindestens zwei Kinder die Schwelle, wird dort nur das eindeutig jüngste dieser Kinder berücksichtigt. Bei nur einem Kind unter der Schwelle erfolgt keine automatische Mitgliedschaft. Ist das jüngste Kind nicht bestimmbar, bleibt der Fall offen. Ausschlüsse nach §§ 7 und 8 werden nicht aus SGB-Daten geraten, sondern durch `not-excluded`, `excluded` oder `unknown` erfasst. Gesamtmitglieder, berücksichtigte und ausgeschlossene Mitglieder bleiben getrennt; ein gemischter Haushalt wird nicht insgesamt abgelehnt.

**Ergebnis:** Mitgliederliste, `totalMembers`, `consideredMembers`, `excludedMembers`, Warnungen und offene Prüfungen. Ein unbekannter Ausschlussstatus lässt `consideredMembers` unbestimmt.

**Quelle:** §§ 3, 5, 7 und 8 WoGG; `SRC-WOGG-2026`.

### `WG-RENT-001` – rohe Mietzuschussbasis

**Status:** `GETESTET` nach erfolgreichem D8B1-Testlauf.

**Fachliche Regel:** Im unterstützten Standardmietfall ist `rawEligibleColdRent = coldRent + coldUtilities`. Tatsächliche Heiz- und Warmwasserkosten, Haushaltsenergie und Stellplatz-/Garagenentgelte werden nicht addiert und separat ausgewiesen. D3-Ergebniswerte werden nicht konsumiert. Bei einfachen dauerhaft mitwohnenden Nicht-Haushaltsmitgliedern kann nach ausdrücklicher Bestätigung die Bewohneranteilslogik des § 11 Absatz 2 WoGG angewandt werden. Der Anteil ausgeschlossener Haushaltsmitglieder wird anschließend nach § 11 Absatz 3 herausgerechnet. Untervermietung einzelner Räume, gewerbliche/gemischte Flächen, unklare Bewohneranteile, Mietwert und Pauschalabzüge mangels Vertragsaufschlüsselung bleiben offen.

**Ergebnis:** rohe Bruttokaltmiete, transparent ausgeschlossene Bestandteile und gegebenenfalls angepasste Mietbasis.

**Quelle:** §§ 9 und 11 WoGG sowie §§ 2 bis 7 WoGV; `SRC-WOGG-2026`, `SRC-WOGV-2026`.

### `WG-OWNER-BURDEN-001` – rohe Lastenzuschussbasis

**Status:** `GETESTET` nach erfolgreichem D8B1-Testlauf.

**Fachliche Regel:** Die erwartete Belastung wird unabhängig von D3 ermittelt. Im Standardfall ist der jährliche Kapitaldienst die Summe aus bestätigten Zinsen, Tilgung, laufenden Darlehensnebenleistungen, Bürgschaftskosten und Erbbauzinsen/wiederkehrenden Finanzierungsleistungen. Eine Gesamt-Kreditrate wird nicht automatisch aufgeteilt; ohne notwendige Aufschlüsselung gilt `WG_OWNER_LOAN_BREAKDOWN_REQUIRED`. Die jährliche Bewirtschaftungsbelastung ist `Wohnfläche * 36 EUR + Grundsteuer + tatsächlich an Dritte gezahlte Verwaltungskosten`. Gebäudeversicherung, Reparaturen, sonstige tatsächliche Betriebskosten und tatsächliche Heizkosten werden nicht zusätzlich addiert. `monthlyOwnerBurdenRaw = annualOwnerBurden / 12`.

Nutzungsentgelte, landwirtschaftliche/gemischt genutzte Objekte, nicht eindeutig selbst genutzte Flächen, unaufgeschlüsselte Wärmelieferungsverträge und weitere Lastenberechnungs-Sonderfälle bleiben offen.

**Quelle:** §§ 10 und 11 WoGG, §§ 8 bis 15 WoGV; `SRC-WOGG-2026`, `SRC-WOGV-2026`.

### `WG-INCOME-001` – Prognose-Jahreseinkommen

**Status:** `GETESTET` nach erfolgreichem D8B1-Testlauf.

**Fachliche Regel:** Maßgeblich ist das bei Antragstellung im Wohngeld-Bewilligungszeitraum erwartete Einkommen pro zu berücksichtigender Person, nicht der D5-Sechsmonatsdurchschnitt. Gleichbleibende Monatsbeträge werden mit zwölf multipliziert, zwölf explizite Monatswerte summiert und bestätigte Jahreswerte direkt verwendet.

Erwarteter Bruttoarbeitslohn wird um den Arbeitnehmer-Pauschbetrag von 1.230 EUR oder höhere bestätigte Werbungskosten gemindert, mindestens auf 0. Beim Minijob werden nur ausdrücklich bestätigte Erwerbsaufwendungen bis zur Einnahmenhöhe abgezogen; KiZ-/SGB-II-Freibeträge gelten nicht. Krankengeld, ALG I, Unterhalt und UVG verwenden den tatsächlich erwarteten Leistungsbetrag. Bei einer `basis = custom`-Prognose ohne Mischquellen gilt für ausschließlich ausdrücklich als Netto-/Zahlbetrag modellierte Krankengeldquellen dieselbe einmalige Verwendung ohne zusätzliche §-16-Prozentabzüge; gespeicherte Steuer-/Versicherungsstatuswerte bleiben unverändert und werden dabei nicht ausgewertet. Elterngeld setzt einen bestätigten wohngeldrechtlichen Freibetrag voraus. Selbständigkeit verwendet nur `confirmedExpectedAnnualTaxProfit`; Umsatz ist kein Gewinn. Vermietung, Kapital und sonstige steuerliche Einkünfte verwenden nur `confirmedExpectedAnnualPositiveTaxIncome`. Negative Einkünfte werden weder arten- noch personenübergreifend verrechnet.

Nach §§ 14 und 15 wird pro Person für jede ausdrücklich mit `yes` bestätigte Kategorie Steuer, Kranken-/Pflegeversicherung und Rentenversicherung ein Abzug von 10 Prozent angewandt. Tatsächliche Steuer-Eurobeträge werden nicht abgezogen. `unknown` blockiert bei positivem Einkommen; `no` ist die ausdrückliche Verneinung. Die UI fragt nur nach qualifizierenden Pflicht- oder gleichgestellten Beiträgen; komplexe Gleichstellungsfälle bleiben offen.

Sicher unterstützte Freibeträge nach § 17 sind 1.800 EUR bei bestätigtem GdB 100 oder GdB unter 100 mit den gesetzlichen Pflegevoraussetzungen, 750 EUR für bestätigte NS-Verfolgte/Gleichgestellte, 1.320 EUR bei ausdrücklich bestätigter Wohngeld-Alleinerziehendenkonstellation und höchstens 1.200 EUR eigene Erwerbseinnahmen eines berücksichtigten Kindes unter 25. Der Grundrentenfreibetrag wird bei `yes` nicht geschätzt, sondern mit `WG_GRUNDRENTE_ALLOWANCE_OPEN` markiert; `no` blockiert nicht.

Bestätigte Unterhaltsaufwendungen nach § 18 werden ohne Titel im Standardfall mit 3.000 EUR für ein Kind nach § 5 Absatz 4 beim anderen Elternteil, 6.000 EUR für frühere/dauernd getrennte Partner und 3.000 EUR für sonstige Personen gedeckelt. Bei Titel, notarieller Vereinbarung oder Bescheid gilt höchstens der ausdrücklich erfasste festgelegte Jahresbetrag. Andere Fälle bleiben offen.

**Ergebnis:** Personenergebnisse vor/nach § 16, Abzugskategorien, Freibeträge, Unterhaltsabzüge, `annualHouseholdIncome = max(0, Summe nach § 16 - §§ 17/17a - § 18)` und `monthlyTotalIncomeY = annualHouseholdIncome / 12`.

**Quelle:** §§ 13 bis 18 WoGG, §§ 2, 9 und 9a EStG; `SRC-WOGG-2026`, `SRC-ESTG-2-9-9A-2026`.

### `WG-FOUNDATION-001` – vorbereitete Wohngeldformelwerte

**Status:** `GETESTET` nach erfolgreichem D8B1-Testlauf.

**Fachliche Regel:** Führt ausschließlich die vier unabhängigen D8B1-Teilergebnisse zusammen. `preparedForWohngeldFormula` enthält die Zahl der zu berücksichtigenden Haushaltsmitglieder, die rohe angepasste Monatsmiete oder -belastung, `monthlyTotalIncomeY` und die explizite Mietstufe `I` bis `VII` oder `unknown`. Unbekannte Mietstufe verhindert nicht die anderen Grundlagen, aber eine spätere D8B2-Betragsberechnung.

Die Regel berechnet ausdrücklich keinen Wohngeldbetrag, keine §-19-Formel, keinen Miethöchstbetrag, keine Heizkosten- oder Klimakomponente, keine 10-EUR-Grenze und keinen fiktiven KiZ-Coverage-Wert. Die Eingabeobjekte werden nicht mutiert.

**Quelle:** Abgrenzung anhand §§ 12 und 19 WoGG; `SRC-WOGG-2026`, `SRC-PRODUCT-SPEC-2026`.

### Offene D8B1-Fälle

- nicht exakt bestimmbare 1/3-Betreuungsanteile und nicht eindeutig bestimmbares jüngstes Kind
- automatische Ausschlussentscheidung nach §§ 7 und 8 WoGG
- Untervermietung, Gewerbeflächen, gemischte Flächen, Mietwert und Pauschalabzüge
- besondere Lastenberechnungen, Nutzungsentgelte und nicht aufgeschlüsselte Darlehen
- nicht klassifizierte Einkommensarten, unbestätigter Gewinn/positive Steuer-Einkunft und Elterngeldfreibetrag
- Gleichstellungs-Sonderfälle nach § 16, Grundrentenfreibetrag nach § 17a und nicht standardisierte §-18-Fälle
- automatische Orts-/Mietstufenzuordnung sowie die in D8B2 ausdrücklich offen gebliebenen Anspruchsausschlüsse

### Verbindliche D8B1-Tests

Die drei Testdateien `wohngeld-household-tests.js`, `wohngeld-income-tests.js` und `wohngeld-housing-tests.js` decken mindestens die 56 im D8B1-Auftrag nummerierten Fälle ab: Mitgliedschaft und 1/3-/Mehrkinderregeln, Mietbestandteile, Lastenzuschuss, Prognoseeinkünfte, §-16-Kategorien, §§ 17/18, Foundation-Vertrag und Nicht-Mutation. Zusätzlich bleiben alle 830 vor D8B1 vorhandenen Regressionstests verbindlich.

## Phase D8B2: mathematischer Wohngeldbetrag 2025/2026

### `WG-AMOUNT-001` – Wohngeldbetrag für unterstützte Standardfälle

**Status:** `GETESTET` nach erfolgreichem D8B2-Gesamtlauf.

**Rule-Version:** `WG_RULESET_2025_2026`. Die Tabellen wurden durch die Zweite Verordnung zur Fortschreibung des Wohngeldes zum 01.01.2025 neu gefasst und werden ohne Extrapolation für Anträge 2025 und 2026 verwendet.

**Zweck:** Konsumiert unverändert `evaluateWohngeldFoundation(...)` und berechnet daraus den mathematischen Miet- oder Lastenzuschuss. D8A, ein fiktiver KiZ-Wohngeldwert und der KiZ-Endbetrag werden nicht verändert.

**Zentrale Regeldaten:** `wohngeld-data.js` enthält einmalig die Anlage-1-Höchstbeträge für ein bis fünf Mitglieder und die Mehrbeträge ab dem sechsten Mitglied, Klima- und Heizkostenkomponenten, die zwölf Koeffizientensätze aus Anlage 2, die zwölf Mindestwerte für M/Y aus Anlage 3, Rule-Version und Quellenmetadaten. Es findet keine Interpolation zwischen Mietstufen und keine Fortschreibung auf 2027 statt.

**Mischhaushalt nach § 11 Absatz 3:** `totalHouseholdMembers` und `consideredHouseholdMembers` bleiben getrennt. Höchstbetrag, Klimakomponente und Heizkostenentlastung werden zunächst mit der Gesamtzahl aus der Tabelle bestimmt und danach mit `consideredRatio = considered/total` multipliziert. Der von D8B1 gelieferte `rawMonthlyRentOrBurden` ist bereits nach § 11 Absätze 2 und 3 angepasst und wird nicht nochmals mit dem Anteil multipliziert. Koeffizienten und Anlage-3-Mindestwerte verwenden dagegen ausschließlich die Zahl der zu berücksichtigenden Mitglieder.

**Miete/Belastung M:**

```text
consideredHousingMaximum = fullHousingMaximum × consideredRatio
consideredClimateComponent = fullClimateComponent × consideredRatio
consideredHeatingRelief = fullHeatingRelief × consideredRatio
coldHousingUpperLimit = consideredHousingMaximum + consideredClimateComponent
recognizedColdRentOrBurden = min(rawMonthlyRentOrBurden, coldHousingUpperLimit)
actualFormulaM = recognizedColdRentOrBurden + consideredHeatingRelief
```

Tatsächliche Heizkosten werden nicht addiert. Miet- und Lastenzuschuss verwenden nach Herstellung des D8B1-Rohwerts dieselbe Betragsengine.

**Mindestwerte:** Für die Formel werden `formulaM=max(actualFormulaM, minimumM)` und `formulaY=max(monthlyTotalIncomeY, minimumY)` verwendet. Die tatsächlichen M-/Y-Werte bleiben separat und werden durch die Mindestwerte nicht verändert.

**Festkommarechnung:** Alle Formeldezimalzahlen werden intern als skalierte `BigInt`-Ganzzahlen mit `SCALE=10^10` geführt. Dezimalstrings werden exakt geparst; negative Koeffizienten sind zulässig. Multiplikationen reduzieren ausschließlich auf die gesetzliche Zehn-Nachkommastellen-Skala, ohne Cent- oder Voll-Euro-Zwischenrundung. Binäre IEEE-754-Multiplikation wird für `z1` bis `z4` nicht verwendet.

**Formelreihenfolge nach Anlage 3:**

```text
z1 = a + b × M + c × Y
z2 = z1 × Y
z3 = M - z2
z4 = 1,15 × z3
```

Erst `z4` wird gesetzlich auf volle Euro gerundet: Nachkommawert unter 0,50 EUR nach unten, ab 0,50 EUR nach oben. Ein negativer Formelwert erzeugt keine negative Auszahlung. Ein gerundeter positiver Betrag unter 10 EUR wird nach § 21 Nummer 1 auf einen Zahlbetrag von 0 gesetzt; genau 10 EUR wird nicht allein durch diese Grenze ausgeschlossen.

**Ausschlüsse und Grenzen:** Sind alle Mitglieder nach §§ 7/8 ausgeschlossen, wird ohne Null-Personen-Formel `NOT_ENTITLED` ausgegeben. Mehr als zwölf zu berücksichtigende Personen bleiben `WG_MORE_THAN_12_MEMBERS_NOT_SUPPORTED`. Unbekannte Mietstufe oder ungelöste Foundation-Pflichtwerte blockieren die Betragsberechnung. Die vollständige §-20-Ausbildungsförderungsprüfung sowie § 21 Nummer 3 bleiben als `WG_SECTION_20_CHECK_NOT_FULLY_EVALUATED` und `WG_SIGNIFICANT_ASSETS_CHECK_NOT_FULLY_EVALUATED` im Ergebnis offen. Der berechnete Betrag ist deshalb eine mathematische Standardfallberechnung, kein rechtsverbindlicher Bescheid.

**Ergebnis:** `evaluateWohngeldAmount(...)` liefert Rule-Version, Leistungsart, beide Mitgliederzahlen, Anteil, alle vollen und anteiligen §-12-Komponenten, tatsächliche und Formel-M/Y-Werte, exakte Koeffizienten und `z1` bis `z4`, ungerundeten und gerundeten Formelbetrag, nicht negativen Rechenbetrag, Zahlbetrag, Status, Begründung, Warnungen, offene Foundation-Prüfungen und verbleibende Anspruchsprüfungen. `evaluateWohngeld(...)` kann Foundation und Amount gemeinsam liefern; `WG-FOUNDATION-001` bleibt eigenständig und unverändert testbar.

**Quellen:** §§ 11, 12, 19 und 21 Nummern 1 bis 3 sowie Anlagen 1 bis 3 WoGG, amtliche Fassung; `SRC-WOGG-2026`. Tabellenfundstelle: BGBl. 2024 I Nr. 314.

**Tests:** 68 D8B2-Fälle prüfen Tabellenränder, Mehrbeträge, Klima/Heizung, M-Deckelung, Mischhaushalt, alle Koeffizientenbereiche, Mindestwerte, Zehnstellen-Festkomma, Rundungsgrenzen, 10-EUR-Grenze, Negativwert, Gesamtausschluss, Miet-/Lastenzuschuss, Foundation-Konsum, Ruleset-Grenzen und Nicht-Mutation. Alle 893 D8B1-und-früher-Tests bleiben Regression.

## Phase D8B3: automatisches/fiktives Wohngeld in der KiZ-Coverage

### Erweiterung `KIZ-COVERAGE-001` durch `WG-AMOUNT-001`

**Status:** `GETESTET` nach erfolgreichem D8B3-Gesamtlauf.

**Quelle und Zweck:** Nach § 6a Absatz 1 Nummer 3 BKGG wird für den Antragsmonat vorrangig bewilligtes Wohngeld berücksichtigt. Wird kein Wohngeld bezogen und kann Wohngeld zusammen mit KiZ Hilfebedürftigkeit vermeiden, ist der voraussichtlich zu bewilligende Betrag anzusetzen. D8B3 konsumiert dafür modular das Ergebnis von `WG-AMOUNT-001`; die Wohngeldformel wird nicht nach `calculator.js` kopiert.

**Modi:** `not-requested` führt keine automatische Berechnung aus. `foundation` bleibt ein reiner Diagnosemodus und liefert bei benötigtem fiktivem Wohngeld weiterhin `FICTIVE_HOUSING_BENEFIT_REQUIRED`. Nur `automatic` erlaubt die Coverage-Verwendung des D8B2-Ergebnisses. Bestehende Daten werden niemals still auf `automatic` migriert.

**Vorrang bestehender Werte:** `approved` verwendet immer ausschließlich den bewilligten Betrag mit Basis `APPROVED`; `estimated` behält den externen Wert mit `EXTERNAL_ESTIMATE` und `PROVISIONAL_EXTERNAL_WOHNGELD`; `none` bleibt `CONFIRMED_ZERO`. Der neue Status `not-received` bedeutet nur, dass aktuell kein Wohngeld bezogen wird. `unknown` benötigt bei bereits geschlossener Lücke keine Wohngeldberechnung.

**Reihenfolge:** Zunächst werden Ressourcen ohne Wohngeld und `gapBeforeWohngeld` bestimmt. Bei positiver Lücke bleibt die eigenständige SGB-II-Coverage-Vermögensprüfung vorrangig. Nur `coverageAssetStatus=confirmed-none` lässt eine automatische fiktive Wohngeldberechnung zu. KiZ-Vermögenswerte oder deren 40.000-/15.000-EUR-Grenzen werden nicht als Coverage-Vermögen verwendet.

**Kompakte Ausschluss-Prechecks:** `wohngeldData.section20Status` und `significantAssetsStatus` haben jeweils `not-excluded`, `excluded` oder `unknown`. Sie sind Bestätigungsfelder, keine automatische Rechtsprüfung. Bei positivem D8B2-Zahlbetrag verlangt `unknown` den konkreten Code `WG_SECTION_20_STATUS_REQUIRED_FOR_FICTIVE_AMOUNT` beziehungsweise `WG_SIGNIFICANT_ASSETS_STATUS_REQUIRED_FOR_FICTIVE_AMOUNT`; `excluded` setzt das fiktive Wohngeld auf 0. Nur zwei `not-excluded`-Werte und ein ansonsten unterstütztes Wohngeldergebnis erlauben einen positiven Coverage-Wert. Ein mathematischer Nullbetrag bleibt 0, auch wenn ein Precheck unbekannt ist.

**Automatisches Ergebnis:** Bei positiver zulässiger Berechnung gilt `housingBenefit.basis=AUTOMATIC_FICTIVE`, `amount=payableWohngeldAmount` und `reliability=CALCULATED_FICTIVE_WOHNGELD`. Der Betrag wird genau einmal als fünfte Eingabe von `calculateCoverageAmounts(...)` addiert. Schließt er die Lücke, gilt normaler Zugang; andernfalls läuft unverändert `KIZ-EXTENDED-ACCESS-001`. Unresolved Foundation-/Amount-Ergebnisse reichen ihre konkreten `WG_*`-Codes weiter und ergänzen nicht zusätzlich den generischen Fiktiv-Wohngeld-Code.

**Abgrenzung:** Automatisches Wohngeld verändert weder D5 noch D6 oder D7 und wird nicht zu Einkommen umgedeutet. `evaluateWohngeld(...)` bleibt ohne KiZ-Parameter eigenständig nutzbar. Haushalte A und B werden nur mit ihren eigenen Daten ausgewertet. Bis einschließlich D8B3 blieben `calculateKinderzuschlag()` und die KiZ-Schlussrundung gesperrt; aktiviert werden sie ausschließlich durch die nachfolgend dokumentierte D9-Regel.

**Ergebnisdetails:** Coverage übernimmt nur eine kompakte `automaticCalculation`-Zusammenfassung mit Anforderungsstatus, Foundation-/Amountstatus, Leistungsart, Zahlbetrag, Rule-Version und offenen Codes; der vollständige Wohngeldbaum bleibt separat über `evaluateWohngeld(...)` verfügbar.

**Tests:** 53 D8B3-Fälle prüfen Vorrang und Bestandsschutz externer Werte, automatische Positiv-/Nullfälle, beide Prechecks, konkrete Fehlerweitergabe, Coverage-Vermögensreihenfolge, Modi, A/B-Trennung, Modularität sowie vollständige D8B2-Regression.

**D8B3-Preflight vor D9:** Ein ausdrücklicher Ausschluss nach dem kompakten §-20- oder §-21-Nr.-3-Precheck setzt das fiktive Wohngeld auch dann auf null, wenn der jeweils andere Precheck noch `unknown` ist. Nach tatsächlichem Aufruf der Wohngeldengine entfällt `AUTOMATIC_HOUSING_BENEFIT_NOT_EVALUATED`. Liefert die Engine mindestens einen konkreten `WG_*`-Open-Code, wird `WG_AUTOMATIC_AMOUNT_UNRESOLVED` nicht zusätzlich ausgegeben. Diese Präzisierungen sind durch fünf zusätzliche D8B3-Regressionstests abgesichert.

## Phase D9: End-to-End-KiZ-Entscheidung

### Regel-ID `KIZ-FINAL-001`

**Status:** `GETESTET` nach Dokumentation, technischer Umsetzung und vollständigem Testlauf am 15.08.2026.

**Zweck:** `calculateKinderzuschlag(state, validationResult)` orchestriert die vorhandenen, eigenständig testbaren Rechenstufen zu einer abschließenden Entscheidung für jeden relevanten Haushalt. Im Vergleichsmodus werden A und B vollständig getrennt ausgewertet; eine haushaltsübergreifende Anspruchssumme oder Optimierung ist ausgeschlossen.

**Verbindliche Reihenfolge:** allgemeiner Validierungskontext; Antrags- und Bemessungszeitraum; kindbezogene Grundzuordnung; `KIZ-MIN-INCOME-001`; `KIZ-MAX-001`; `KIZ-INCOME-CHILD-001` und `KIZ-REDUCE-CHILD-001`; KiZ-/SGB-II-Mitgliedschaften und Bedarfe; `KIZ-PARENT-NEED-001`; `KIZ-INCOME-ADULT-001`; `KIZ-REDUCE-PARENT-001`; `KIZ-ASSET-INTEGRATION-001`; Familienbedarf; Wohngeld und `KIZ-COVERAGE-001`; Anspruchsentscheidung; Schlussrundung; Empfängerzuordnung; Rechenprotokoll. D2, D6, D7 und D8 werden konsumiert und nicht durch parallele Formeln ersetzt.

**Anspruchsgates:** Validierungsfehler ergeben `INVALID_INPUT`. Ist die Mindesteinkommensprüfung nicht `CALCULATED`, bleibt das Ergebnis `UNRESOLVED`; bei nicht erreichter Grenze gilt `CALCULATED_NOT_ENTITLED` mit `MINIMUM_INCOME_NOT_MET`. Ohne potenzielles eigenes KiZ-Kind gilt `CALCULATED_NOT_ENTITLED` mit `NO_POTENTIAL_OWN_KIZ_CHILD`. Ist der unterstützte D6-Betrag bereits exakt 0 EUR, steht der Zahlbetrag unabhängig von einer weiteren Vermögensminderung sicher mit 0 EUR fest; D9 liefert `CALCULATED_NOT_ENTITLED` mit `FINAL_AMOUNT_ZERO`, kennzeichnet D7 als `NOT_NEEDED` und übernimmt keinen Vermögenswert. Eine vollständige Vermögensablehnung mit `NEW_APPLICATION_REQUIRED` ergibt andernfalls `CALCULATED_NOT_ENTITLED` mit `REJECTED_DUE_TO_ASSETS` und keinen künstlichen Sechsmonatszeitraum. Nicht unterstützte D2-/D6-/D7-/Bedarfs-/Coverage-Ergebnisse bleiben `UNRESOLVED`. `COVERAGE_NOT_MET` ergibt `CALCULATED_NOT_ENTITLED`; normal oder erweitert gedeckte Fälle können positiv entschieden werden.

**Blocking und Information:** Nur offene Punkte, deren Auflösung Anspruch, BG-Mitgliedschaft, Bedarf, Höhe oder Auszahlung ändern kann, stehen in `blockingOpenChecks`. Die alten Hinweise `CHILD_OWN_CHILD_STATUS_NOT_CAPTURED`, `CHILD_OWN_PARTNER_HOUSEHOLD_STATUS_NOT_CAPTURED` und `CHILD_REMAINING_FAMILY_STATUS_NOT_CAPTURED` sind bei minderjährigen Kindern ohne konkreten gegenteiligen Anhaltspunkt informativ; bei 18- bis 24-Jährigen bleiben die beiden konkreten Familienstatus-Prüfungen entscheidungserheblich. Unbekannte Ehe-/Partnerschafts-, Kindergeld-, Bedarfs- oder BG-Zuordnungen bleiben blockierend. Ein potenzielles eigenes KiZ-Kind im Alter 24 erzeugt mangels Geburtsdatum `CHILD_25TH_BIRTHDAY_DURING_BWZ_REVIEW_REQUIRED` und damit `UNRESOLVED`.

**Beträge und Vermögen:** Der theoretische Höchstbetrag, die ungerundeten Kindeseinkommensminderungen, der ungerundete Gesamtkinderzuschlag nach Kindeseinkommen, D6 und D7 werden unverändert übernommen. Es findet keine volle Euro-Rundung je Kind, bei der Elternminderung oder bei der Vermögensminderung statt. Eine kleine D7-Vermögensminderung wirkt nur in Monat 1; Monate 2 bis 6 verwenden den bereits berechneten vermögensfreien D7-Wert. Partielle Kindesvermögensablehnung und `ASSET_PATCHWORK_ALLOCATION_OPEN` bleiben offen.

**Coverage und Wohngeld:** `NORMAL_ACCESS_COVERAGE_MET` setzt `accessType=NORMAL`, `EXTENDED_ACCESS_COVERAGE_MET` setzt `accessType=EXTENDED`. `housingBenefitUsed` enthält nur Status, Basis, Betrag, Zuverlässigkeit und bei Automatik die Leistungsart; ein automatischer fiktiver Wert wird nie als bewilligt bezeichnet. Wohngeld wird weder erneut berechnet noch doppelt addiert.

**Schlussrundung:** `roundFinalKizToEuro(value)` ist ausschließlich auf einen nicht negativen finalen Monatsbetrag nach allen Einkommens- und Vermögensminderungen anzuwenden. Nach § 11 Absatz 2 BKGG werden Centbeträge unter 0,50 EUR ab-, ab 0,50 EUR aufgerundet. Verbindliche Grenzen sind 0,00/0,01/0,49 → 0; 0,50 → 1; 1,49 → 1; 1,50 → 2; 503,49 → 503; 503,50 → 504. Ein einheitlicher Monatsanspruch von 0,01 bis 0,49 EUR ergibt `CALCULATED_NOT_ENTITLED` mit `FINAL_AMOUNT_ROUNDS_TO_ZERO`. Rundet nur Monat 1 wegen kleiner Vermögensminderung auf null, während Folgemonate positiv sind, bleibt mangels eindeutiger amtlicher Sonderregel `MONTH1_ZERO_AFTER_ROUNDING_WITH_LATER_ASSET_FREE_MONTHS_OPEN` blockierend.

**Bewilligungszeitraum:** Der BWZ umfasst grundsätzlich sechs volle Monate ab Antragsmonat. `assessmentPeriod` enthält Antragsmonat/-jahr, die sechs vorherigen Einkommensmonate und sechs Leistungsmonate. Jeder Leistungsmonat enthält Index, Jahr, Monat, ungerundeten Endbetrag, gerundeten Zahlbetrag und Betragsstatus. Ohne Vermögenseffekt sind alle Monatswerte gleich; bei kleiner Minderung ist Monat 1 abweichend und Monate 2 bis 6 identisch. Die Sechsmonatssumme ist die Summe der sechs einzeln gerundeten Monatsbeträge. Tatsächliche künftige Einkommens-, Miet-, Wohngeld- oder Lebensänderungen werden nicht simuliert.

**Jahreswechsel 2026/2027:** 2026-Monate sind nach dem bestätigten 2026-Regelstand final. Für in 2027 liegende Monate wird kein Höchstbetrag erfunden. Der aktuelle Rechenstand darf als `PROVISIONAL_CURRENT_LAW_BASELINE` ausgewiesen werden, verbunden mit `futureMaximumKizChangePossible=true` und `LEGAL_RATE_2027_NOT_YET_FINAL`. Die gegenwärtige Anspruchsentscheidung wird dadurch nicht automatisch offen; `sixMonthFinalPayableTotal` ist jedoch `null`, während `currentLawBaselineSixMonthTotal` die Summe der gerundeten Baseline-Monate enthalten darf.

**Kleine Zahlbeträge:** Ein positiver gerundeter monatlicher Zahlbetrag unter 5 EUR bleibt ein Anspruch. Bei einheitlichen Monatsbeträgen gilt `SMALL_AMOUNT_LUMP_SUM_AFTER_BWZ`, ansonsten ist die Zahlungszeitpunktprüfung mit `SMALL_AMOUNT_PAYMENT_TIMING_REVIEW` offen. Diese Kennzeichnung verändert die Anspruchshöhe nicht.

**Patchwork-Auszahlung:** Ein Kind wird genau einer Kindergeldperson zugeordnet und niemals auf mehrere Empfänger aufgeteilt. Bei einer Person erhält diese den gesamten Zahlbetrag. Bei mehreren Personen wird die vorhandene ungerundete D6-Gruppierung verwendet; Empfängerbeträge werden gruppenweise erst am Ende gerundet. Weicht deren gerundete Summe vom gerundeten Haushaltsbetrag ab, wird kein Euro heuristisch verteilt, sondern `PATCHWORK_PAYOUT_ROUNDING_RECONCILIATION_OPEN` ausgegeben. Bei `ASSET_PATCHWORK_ALLOCATION_OPEN` bleibt `recipientPayments` offen.

**Ergebnisvertrag:** Pro Haushalt werden `status`, `decisionReason`, `eligibility`, ungerundete und gerundete `amounts`, `assessmentPeriod`, `paymentPeriods`, `housingBenefitUsed`, kompakte `childResults`, `recipientPayments`, mindestens dreizehn `calculationTrace`-Schritte, `blockingOpenChecks`, `informationalWarnings`, deduplizierte `usedRuleIds` und `sourceIds` ausgegeben. `UNRESOLVED` hat stets `finalPayableAmount=null`; nur bestätigte negative Gates ergeben einen Nichtanspruch. Der Eingabestate und das Validierungsergebnis werden nicht verändert, Wiederholungsaufrufe sind deterministisch.

**Quellen:** `SRC-BKGG-6A`, amtliche Fassung von § 6a BKGG, abgerufen 15.08.2026; `SRC-BKGG-11`, amtliche Fassung von § 11 BKGG, abgerufen 15.08.2026; `SRC-DA-KIZ-2026-02-20`, DA-KiZ Stand 20.02.2026, insbesondere C.1, C.2, C.2.2, C.3, C.4, E.1, E.2 und E.5.

**Tests:** 100 D9-Tests in `tests/final-kiz-tests.js`, `tests/final-kiz-rounding-tests.js` und `tests/end-to-end-tests.js` decken Gates, Stufenkonsum, Coverage, Vermögen, Rundungsgrenzen, Nullrundung, sechs Monate, Jahreswechsel, Patchwork, Wohngelddarstellung, offene Fälle, echte End-to-End-Standardfälle, Protokoll, Nichtmutation und A/B-Unabhängigkeit ab. Die Angabe von 1114 Tests zusammen mit fünf D8B3-Preflight-Tests und 1009 vorherigen Tests ist ein historischer Meilenstein; spätere UX-, Preset-, Ergebnis-ViewModel-, Partner-/Minijob- und Szenariovergleich- sowie Public-/Private-Trennungs- und Scenario-UI-Event-Tests führen zum aktuellen Stand 1311/1311. Kein bestehender Test wurde entfernt oder fachlich abgeschwächt.

## Phase UX1: UI-Relevanz und Fehlernavigation

UX1 führt keine neue Berechnungsregel und keine neue rechtliche Annahme ein. Eine DOM-unabhängige UI-Schicht konsumiert ausschließlich die vorhandene Haushalts-/Kindrelevanz und `WG-HOUSEHOLD-001`, um je Modul nur tatsächlich relevante Personen anzuzeigen und zu validieren. Nicht sichtbare Altdaten bleiben unverändert gespeichert. Die Schicht ordnet Validation-Issues und `blockingOpenChecks` verständlichen Eingabezielen oder ausdrücklich nicht automatisierten Sonderfällen zu; sie verändert weder Blocking-Entscheidungen noch D1–D9-Ergebnisse.

Die Haushaltsantworten `central` und `decentral` zur Warmwassererzeugung werden auf relevante Personen als `no` beziehungsweise `yes` übertragen. Dies ist ausschließlich die technische Weitergabe der expliziten Antwort „für alle Personen“ und kein Default für unbekannte Angaben. Bei `mixed` bleiben personenbezogene `yes/no/unknown`-Antworten erforderlich; die bestehende fachliche Behandlung gemischter Erwachsenenfälle wird nicht erweitert.

UX1 besitzt 45 eigene Tests in `tests/ux-relevance-tests.js` und `tests/ux-issue-navigation-tests.js`. Die Zahl 1159 ist ein historischer Meilenstein; sie wurde durch nachfolgende UX1.1-, Preset- und Ergebnispräsentationstests überholt. Datenversion 14 blieb für UX1 unverändert, weil dort keine neue persistierte Eingabe eingeführt wurde.

## Phase UX1.1: Prognosebasis und Relevanz der Wohngeldvalidierung

UX1.1 ändert keine Rechenregel aus D1–D9. Die neue persistierte UI-Angabe `incomeForecast.basis` dokumentiert ausschließlich, ob der Nutzer aktuelle KiZ-Einkommensangaben ausdrücklich als Wohngeld-Prognose bestätigt oder eine eigene Prognose gewählt hat. Eine bestätigte Übernahme kopiert nur unterstützte, semantisch gleiche Einkommensarten mit einem bereits erfassten gleichbleibenden Monatswert; sie erzeugt keine neue rechtliche Zuordnungs- oder Schätzregel.

Die Formalvalidierung von automatischen Wohngeld-Detailangaben folgt der bereits bestehenden D8B3-Semantik `housingBenefit.basis=NOT_NEEDED`: Ist die Coverage-Lücke bereits ohne Wohngeld geschlossen, werden fehlende Forecastdetails nicht als blockierende Eingabefehler behandelt. Die Coverage-Berechnung und ihre Reihenfolge bleiben unverändert. UX1.1 ergänzt 37 Tests; die frühere Angabe von 1196 bestandenen Tests ist ein historischer Meilenstein. Datenversion 15 dient der defensiven Migration der Prognosebasis und der verständlichen Bewohnerauswahl; Datenversion 16 ergänzt den Erwachsenen-Einkommensstatus.

## Phase UX1.2: Ergebnis-ViewModel und getrennte Leistungsanzeige

## Szenariovergleich-MVP: fachliche Abgrenzung

Die Szenario-Benutzeroberfläche gehört im MVP ausschließlich zum lokalen `private.html`-Entry. `index.html` und der Public-Build liefern keine Szenario-UI aus; `npm run build:public` verwendet dafür eine feste Allowlist. Diese Entry-Trennung ändert keine Rechenregel und aktiviert nicht `KIZ-SCENARIO-001`.

Der Szenariovergleich ist eine reine Orchestrierungs- und Darstellungsschicht. Er kopiert den Eingabestate tief, wendet begrenzte Nutzeränderungen an und ruft danach unverändert `validateCalculatorState`, `calculateKinderzuschlag`, `evaluateWohngeld` und `KizResultViewModel` auf. Es gibt keine eigene KiZ- oder Wohngeldformel, keine neuen Grenzwerte und keine persistierte Szenariostruktur. Dieses UI-/Orchestrierungs-MVP aktiviert oder implementiert ausdrücklich nicht die offene fachliche Regel `KIZ-SCENARIO-001`; deren Status bleibt unverändert `OFFEN`.

Vergleichbar sind nur die numerischen ViewModel-Beträge für KiZ, Wohngeld und KiZ+Wohngeld. Ein fehlender oder `UNRESOLVED`-Betrag bleibt nicht numerisch; daraus wird weder ein Nullbetrag noch ein Gesamt-Delta abgeleitet. Einkommen bleibt fachlich getrennt von der Leistungssumme. Die Schicht führt keine Optimierungs- oder Haushalts-Nettoeinkommensberatung ein.

UX1.2 ändert keine Berechnungsregel und keine persistierte Eingabe. `result-view-model.js` kombiniert ausschließlich das vorhandene D9-Ergebnis mit einem separat aufgerufenen `WohngeldCalculator.evaluateWohngeld(...)`-Ergebnis. D9 bleibt für `approved`, `estimated` und bestätigte Nullwerte vorrangig. Bei `automatic` wird ein `SUPPORTED`-Wohngeldergebnis als voraussichtlicher Zahlbetrag angezeigt, auch wenn D9 für Coverage `NOT_NEEDED` meldet. `MISSING_INPUT`, `UNSUPPORTED` und `UNRESOLVED` sind getrennte Darstellungsstatus; technische Codes und Regel-/Quellenbasis bleiben erhalten.

Die Gesamtsumme enthält ausschließlich die beiden dargestellten Leistungen und wird bei fehlendem Betrag nicht gebildet. Die Erklärung nutzt nur bereits vorhandene Ergebnisfelder und Rechenprotokollwerte und führt keine Formel ein. [DATENSCHUTZ: Zahlenfolge eines privaten Referenztests entfernt.]

UX1.2 besitzt 16 Datenebenen-Tests in `tests/result-view-model-tests.js`; die Partner-/Minijob-Regression besitzt 14 Golden-Path-Tests in `tests/partner-minijob-golden-path-tests.js`; der Szenariovergleich besitzt 26 Regressionstests in `tests/scenario-comparison-tests.js`; die Public-/Private-Trennung besitzt 9 Tests in `tests/public-private-separation-tests.js`; Scenario-UI-Events besitzen 9 Tests in `tests/scenario-ui-events-tests.js`; die Krankengeld-Referenzregression besitzt 41 Tests einschließlich des echten privaten Button-Eventpfads; der aktuelle zentrale Regressionsstand beträgt 1311/1311 Tests. `NOT_NEEDED` ohne unabhängiges Wohngeldergebnis ist kein festgestellter Nullanspruch. Positive automatische Wohngeldwerte beachten bei der Anzeige die D8B3-Prechecks: unbekannte Statuswerte bleiben `MISSING_INPUT`, bestätigte Ausschlüsse werden als 0/`NOT_ENTITLED` angezeigt, mathematische Nullwerte bleiben bei unbekannten Prechecks unterstützt. D6-Überschuss und Minderungswerte stammen ausschließlich aus der bestehenden `evaluateParentIncomeReduction(...)`-Ausgabe.

## UX1.3 Statuspropagation erwachsener Einkommen

`KIZ-INCOME-ADULT-001` und `KIZ-MIN-INCOME-001` unterscheiden bei jeder relevanten erwachsenen Person `unknown`, `present` und `none`. Datenversion 16 migriert alte Statusfelder defensiv. Leere Quellen bei `unknown` bleiben `UNRESOLVED` mit `null`-Endwerten; `none` mit leerer Quellenliste liefert den bereits vorhandenen bestätigten Nullbetrag und den Status `SUPPORTED`. Vorhandene Quellen werden bei fehlendem Altfeld als `present` erkannt. `none` mit Quellen sowie `present` ohne Quellen bleiben widersprüchlich beziehungsweise offen. Die Statuspropagation ergänzt keine Rechenformel und lässt Einkommensarten und bestehende Abzüge unverändert.
