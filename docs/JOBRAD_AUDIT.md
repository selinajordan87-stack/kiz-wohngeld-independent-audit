# Jobrad: Beobachtung, rechtlicher Maßstab und Testauftrag

## Befund am unveränderten Code

In beiden untersuchten Ständen wurde in den Rechenmodulen und den ursprünglichen Eingabeformularen keine spezielle Jobrad-, Dienstrad-, Entgeltumwandlungs- oder Sachbezugslogik gefunden. Es gibt allgemeine Einkommens-, Brutto-/Netto- und Abzugsfelder. Vertragsbrutto, Barbrutto, Steuerbrutto, SV-Brutto und bewerteter Sachbezug sind nicht als getrennte miteinander abgeglichene Größen modelliert.

Dadurch ist eine Eingabe eines bereits konsolidierten Bruttobetrags technisch möglich. Sie ist nur dann fachlich hinreichend, wenn dieser Betrag für die konkrete Leistung der richtige Ausgangswert ist. Das Steuerbrutto allein beweist noch nicht den richtigen KiZ-Sachbezugswert. Es fehlen Belegabgleich und die automatische Erkennung eines nochmals abgezogenen Leasingbetrags oder nochmals hinzugerechneten Sachbezugs. Das ist eine **mögliche fachliche Abdeckungslücke**, keine hier vorgenommene Korrektur.

## Getrennte Rechtsmaßstäbe

**Lohnsteuer:** § 3 Nr. 37 EStG betrifft zusätzlich zum ohnehin geschuldeten Arbeitslohn überlassene, verkehrsrechtlich nicht als Kfz einzuordnende Fahrräder. Eine Gehaltsumwandlung darf nicht ohne Weiteres wie diese Zusatzleistung steuerfrei behandelt werden. § 8 EStG und der Ländererlass vom 09.01.2020 regeln die Bewertung. Unter dessen Voraussetzungen wird ab 2020 ein Prozent eines auf volle 100 Euro abgerundeten Viertels der unverbindlichen Preisempfehlung angesetzt. UPE 4.000 Euro ergibt in unseren erfundenen Fällen 10 Euro. Datum der erstmaligen Überlassung und Fahrrad-/Kfz-Einordnung sind zu prüfen. Die rechnerisch verkürzte „0,25-Prozent-Regel“ darf nicht die vorgeschriebene Rundungsreihenfolge verdecken.

**Sozialversicherung:** § 14 SGB IV und § 1 SvEV eigenständig prüfen. Umwandlung und geldwerter Vorteil wirken auf das beitragspflichtige Entgelt nach dessen Regeln. Steuerfreiheit, Beitragsfreiheit und tatsächlich ausgezahlter Nettobetrag sind verschiedene Größen.

**KiZ:** § 6a BKGG verweist auf Einkommensregeln des SGB II. Nach § 11 Abs. 1 SGB II gehören grundsätzlich auch in Erwerbstätigkeit zufließende Einnahmen in Geldeswert zum Einkommen. § 11b betrifft Absetzbeträge. Für sonstige Einnahmen in Geldeswert nennt § 2 Abs. 6 der einschlägigen Einkommensverordnung den Verkehrswert. Der steuerlich pauschalierte Fahrradwert ist daher **kein automatisch verbindlicher KiZ-Verkehrswert**. Den im Monat geltenden Verordnungstext prüfen; die aktuelle Online-Fassung wird bereits unter dem Namen GrusiGV bereitgestellt, während historische 2025/2026-Unterlagen die Bürgergeld-V bezeichnen. Weder Steuerrecht noch eine aktuelle Umbenennung ersetzen diesen Zeitvergleich.

**Wohngeld:** § 14 WoGG knüpft an positive steuerliche Einkünfte plus ausdrücklich aufgeführte weitere Einnahmen an, § 15 an die erwarteten Einnahmen im BWZ, § 16 an die dortigen pauschalen Abzüge. Ein steuerpflichtiger Fahrrad-Sachbezug ist in der steuerlichen Einkunftsgröße zu berücksichtigen. Für steuerfreie zusätzliche Fahrradüberlassung ist gesondert zu prüfen, ob eine Hinzurechnung nach § 14 Abs. 2 greift; nicht pauschal den KiZ-Maßstab übertragen. Werbungskosten/Arbeitnehmer-Pauschbetrag und Einkommensabzüge folgen dem Wohngeldrecht. Die tatsächlichen KiZ-Pflichtabzüge dürfen nicht nochmals als zusätzlicher Wohngeldabzug übernommen werden.

Die amtlichen Quellen und deren Prüfstatus stehen in [LEGAL_SOURCES.md](LEGAL_SOURCES.md). Der begrenzte Audit-Auftrag erstellt keine neue Sachbezugsbewertungsregel im Kern.

## Synthetische Fälle A–D

| Fall | Vertragsbrutto | Umwandlung | Barbrutto | Steuer-/SV-Brutto als Eingabehypothese | Steuerlicher Sachbezug | Auszahlung bei erfundenen 1.000 Euro Abzügen |
|---|---:|---:|---:|---:|---:|---:|
| A ohne Dienstrad | 3.300 € | 0 € | 3.300 € | 3.300 € | 0 € | 2.300 € |
| B Gehaltsumwandlung | 3.300 € | 100 € | 3.200 € | 3.210 € | 10 € | 2.200 € |
| C bereits in Abrechnung enthalten | 3.300 € | 100 € | 3.200 € | 3.210 € | 10 € | 2.200 € |
| D bewusst doppelt erfasst | 3.300 € | 100 € | 3.200 € | **3.220 € fehlerhafte Eingabe** | 10 € nochmals addiert | unverändert 2.200 € |

Die 1.000 Euro sind fest vorgegebene synthetische Abzüge; dies ist keine Brutto-Netto-Lohnsimulation. Bei B/C enthält das Brutto den Sachbezug einmal. Die Differenz zwischen Abrechnungsnetto einschließlich Sachbezug und Barauszahlung ist kein weiterer frei abziehbarer Leasingbetrag. C muss mit B dasselbe Ergebnis liefern. D prüft eine Inkonsistenz, die ohne Belegmetadaten aus einem alleinigen Bruttofeld nicht erkennbar ist.

Für KiZ wird B/C ausdrücklich als Hypothese mit Sachbezugswert 10 Euro ausgeführt. `jobrad-market-value-sensitivity.json` setzt nur für KiZ einen **erfundenen Verkehrswert von 35 Euro** an; der Wohngeld-Steuerwert bleibt unverändert. Beide Werte sind keine Feststellung zu einem realen Fahrrad. `jobrad-double-deduction.json` ergänzt den umgekehrten Negativtest: Gehaltsumwandlung bereits in den Bruttowerten und danach nochmals abgezogen.

## Tatsächlich beobachtetes Softwareverhalten

Beide eingefrorenen Versionen liefern für die Standardhypothese identische Ergebnisse:

| Fall | KiZ laut Engine | Wohngeld laut Engine | Ursprüngliche Validierung |
|---|---:|---:|---|
| A | 761 € | 643 € | keine Fehler |
| B | 801 € | 664 € | keine Fehler |
| C | 801 € | 664 € | keine Fehler |
| D | 797 € | 661 € | keine Fehler |

Diese Beträge beschreiben ausschließlich unsere künstliche Familie und feste Abzüge. Es sind **keine unabhängigen gesetzlichen Sollwerte**. Der zusätzliche Metadatenprüfer unter `audit/` meldet D als `DOUBLE_COUNTING_RISK`, die unveränderte Engine selbst erkennt es nicht. B=C zeigt konsistente Übernahme derselben normalisierten Eingabe; es beweist nicht die richtige KiZ-Verkehrswertbewertung.

Vollständige unveränderte Ergebnisobjekte einschließlich Einkommensbereinigung, Elternminderung, Bedarfsdeckung und Wohngeldformel liegen unter `reports/jobrad/`. Reproduktion:

```sh
node audit/run-case.js --version main --input cases/jobrad-B.json
node audit/run-case.js --version finance --input cases/jobrad-D.json
```

## Monatsabgleich historischer Unterlagen

Der historische Einzelvergleich bleibt separat privat. Je Monat benötigt er: Abrechnung und Zahlungsdatum; Grundentgelt/alle weiteren Bezüge; Umwandlungszeile; Sachbezugszeile; Steuer- und SV-Brutto; Steuern und AN-Beiträge; Netto-Sachbezug; Pfändung/sonstige Nettoabzüge; Bankauszahlung; damalige tatsächliche Engine-Eingabe. Korrekturabrechnungen dem richtigen Zufluss und Abrechnungsmonat zuordnen. Brutto-Aggregate nicht aus einer einzelnen Zeile rekonstruieren, wenn weitere Bestandteile fehlen.

Erst danach feststellen: Umwandlung im Ausgangsbrutto enthalten? Sachbezug einmal enthalten? Tatsächliche Auszahlung richtig? KiZ-Sachbezugswert belegt? Wohngeld-Steuerwert und Jahresprognose richtig? Fehlt eine dieser Brücken, bleibt die historische Ursache offen. Keine pauschale zusätzliche Leasingkürzung und kein Anpassen an einen bekannten Bescheid.
