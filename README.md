# Unabhängiges Audit: Kinderzuschlag, Wohngeld und Wechselmodell

Dieses Paket sichert zwei unveränderte Rechenkern-Versionen und macht sie ohne Browser, Konten oder private Presets ausführbar. Es ist **Prüfmaterial, kein korrigierter Rechner und kein fachliches Gütesiegel**. Das Repository bleibt bis zu einer ausdrücklichen Freigabe privat.

[Weitergebbares ZIP herunterladen](downloads/kiz-wohngeld-independent-audit.zip) · [Prüfanleitung](AUDIT_GUIDE.md) · [Datenschutzbericht](reports/PRIVACY_REVIEW.md)

## Schnellstart

Node.js 20 oder neuer, empfohlen Node.js 24 LTS. Keine npm-Pakete, keine Zugangsdaten und kein Netzwerkzugriff sind zur Berechnung erforderlich. `npm install` ist nicht nötig.

```sh
npm test
npm run verify
node audit/run-case.js --version main --input cases/jobrad-A.json
node audit/run-case.js --version finance --input cases/jobrad-B.json --output outputs/jobrad-B.json
node audit/compare.js --input cases/jobrad-B.json > outputs/vergleich.json
```

Vor der letzten Umleitung einmal `mkdir -p outputs` ausführen. Alle `cases/*.json` enthalten ausschließlich neu erfundene Daten. Kopiere eine Datei für eigene Eingaben; private Eingaben und Ergebnisse gehören in das ignorierte Verzeichnis `outputs/`.

## Gesicherte Versionen

| Bezeichnung | Originalbranch | Commit |
|---|---|---|
| `main` | `main` | `973fc250464a29916ea4a4a7071f7245845635b8` |
| `finance` | `codex/finanzszenarien-2026-2027` | `ca36ddc48b500d1e734010f3cca80ab7f656f37a` |

Die 72 Originaldateien liegen unter `snapshots/main/` und `snapshots/finance/`. Jede Datei ist bytegleich zum jeweiligen GitHub-Blob; SHA-256 und Git-Blob-SHA stehen in [source-integrity.json](provenance/source-integrity.json). Keine Historie, Autorenmetadaten, lokalen Änderungen oder privaten Daten des Originalprojekts wurden übernommen. Die identifizierende Zuordnung zum Ursprungsrepository wird außerhalb dieses Pakets privat aufbewahrt. Der neue Git-Verlauf beginnt mit einem eigenen Root-Commit.

Enthalten sind pro Version neun gemeinsame Module: `calculator.js`, `calculation-rules.js`, `parent-need-data.js`, `wohngeld.js`, `wohngeld-data.js`, `validation.js`, `ux-relevance.js`, `scenario-comparison.js`, `ux-income-forecast.js`; außerdem der Original-Teststarter und 25 ausgewählte Original-Testdateien. `finance` enthält zusätzlich `finance-payroll.js` und `finance-scenarios.js`. Die Auswahl und Ausschlüsse stehen in [inclusion-inventory.json](provenance/inclusion-inventory.json).

Die Rechenspezifikation liegt als gesonderte Dokumentationskopie unter `docs/specifications/<version>/CALCULATION_SPEC.md`. Pro Version wurden zwei Absätze mit privaten Referenzzahlen geschwärzt; keine Berechnungsregel wurde entfernt. Original- und Export-Prüfsummen sowie genaue Quellzeilen sind im Manifest unter `documentationExports` protokolliert. Diese Dokumente werden ausdrücklich nicht als bytegleiche Originaldateien bezeichnet.

## Ergebnisse und Zwischenrechnungen

`audit/run-case.js` gibt die echte Validierung, den unveränderten KiZ-Gesamtaufruf, Einkommensbereinigung je Person/Monat, Kinderzuordnung, Eltern- und Familienbedarf, Elternminderung, Bedarfsdeckung, Wohngeldgrundlagen, Formelwerte, Parameter und Quellen-/Regel-IDs als JSON zurück. `null`, `UNRESOLVED` und offene Prüfungen bleiben sichtbar. Der Adapter ersetzt sie nicht durch null Euro und übergeht keine Validierung.

```js
// Direkter Aufruf ohne Adapter; jeweils nur eine Version pro Node-Prozess!
const calculator = require('./snapshots/main/calculator.js');
const validation = require('./snapshots/main/validation.js');
const input = require('./cases/jobrad-A.json');
const checked = validation.validateCalculatorState(input.state);
const result = calculator.calculateKinderzuschlag(input.state, checked);
console.log(JSON.stringify(result, null, 2));
```

Die UMD-Module schreiben auch globale Variablen. Deshalb startet `audit/compare.js` für jede Version einen eigenen Prozess. Anwendungscode, UI-Migrationen und Bedienoberfläche sind kein Bestandteil dieses begrenzten Rechenkern-Audits. Neue lokale Prognosemodule, die nicht in den oben genannten Commits existieren, sind ebenfalls nicht enthalten.

## Prüfen und weiterarbeiten

- [AUDIT_GUIDE.md](AUDIT_GUIDE.md): kompakter Ablauf für Claude, ChatGPT Work, Gemini und Perplexity.
- [docs/JOBRAD_AUDIT.md](docs/JOBRAD_AUDIT.md): A–D, unterschiedliche Rechtsmaßstäbe, Doppelzählung und offene Fragen.
- [docs/TEST_COVERAGE.md](docs/TEST_COVERAGE.md): abgedeckte Bereiche und bewusst offene Testorakel.
- [docs/LEGAL_SOURCES.md](docs/LEGAL_SOURCES.md): amtliche Quellen und zeitliche Grenzen.
- [docs/TECHNICAL_ADAPTATIONS.md](docs/TECHNICAL_ADAPTATIONS.md): ausschließlich technische neue Prüfdateien.
- [reports/PRIVACY_REVIEW.md](reports/PRIVACY_REVIEW.md): Umfang der Anonymisierung und Grenzen.
- [reports/test-results.json](reports/test-results.json) und [reports/synthetic-observations.json](reports/synthetic-observations.json): tatsächlich ausgeführte Prüfungen und Engine-Beobachtungen.

`npm run examples` erzeugt die synthetischen Beobachtungen neu. Die erhaltenen Geldbeträge sind **Ist-Verhalten der Software**, keine unabhängigen gesetzlichen Sollwerte. Bestehende Tests können denselben fachlichen Fehler wie der Code enthalten. Gesetzesjahre und rückwirkende Zeitzuordnung sind separat zu prüfen.

Optionale Paketprüfung mit Python 3 (nur Standardbibliothek): `python audit/privacy-scan.py`. `python audit/create-archive.py --output ../kiz-wohngeld-independent-audit.zip` erstellt ein ZIP ohne Git-Verzeichnis und ohne private Ausgaben. Python ist für den JavaScript-Rechenkern nicht erforderlich.

Ein historischer Bescheidvergleich ist aus Datenschutzgründen nicht Teil dieses Pakets. Er liegt in einem separaten privaten, noch unvollständigen Referenzpaket. Eingaben dürfen niemals auf einen bekannten Bewilligungsbetrag hin angepasst werden.

## Nutzung über GitHub

Nach ausdrücklicher Freigabe der Eigentümerin kann dieses getrennte Repository auf öffentlich umgestellt werden. Dann genügen der Repository-Link und `AUDIT_GUIDE.md`; Prüfer können es vollständig klonen oder als ZIP laden. Bis dahin benötigen externe Systeme ausdrücklich eingerichteten privaten Zugriff oder das geprüfte ZIP. Es wurden keine Einladungen, E-Mails oder externen Audit-Aufträge versandt.
