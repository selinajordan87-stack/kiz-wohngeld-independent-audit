# Technische Anpassungen außerhalb des Rechenkerns

Keine Datei unter `snapshots/` wurde bearbeitet. Die Module sind bereits CommonJS-/UMD-kompatibel und werden per `require` geladen. Das Manifest sichert die Originalbytes einschließlich Zeilenenden. `.gitattributes` verhindert eine nachträgliche Textnormalisierung der Snapshots.

Neu sind nur:

- Aufrufadapter und JSON-Export unter `audit/run-case.js`, jeweils mit der tatsächlichen Originalvalidierung. Die Inputstruktur enthält optional `caseId`, `evidenceKind`, `payrollEvidence` und die eigentliche Engine-Eingabe `state`.
- Getrennte Node-Prozesse im Versionsvergleich, weil die Originalmodule globale Variablen beschreiben. Es werden keine globalen Abhängigkeiten künstlich durch eine andere Version ersetzt.
- Synthetische Fallgeneratoren und Tests, Integritätsprüfung, Ablaufskript und Beobachtungsexport. Ein Metadatenprüfer meldet doppelte Sachbezüge/Abzüge; er greift nicht in die ursprüngliche Berechnung oder Validierung ein.
- Expliziter Adapterhinweis bei einem KiZ-Antragsjahr außerhalb 2026. Die originale Engine-Antwort bleibt vollständig sichtbar.
- Eine neue `package.json` ohne externe Dependencies; Auswahl des Original-Teststarters und der datenschutzgeprüften Originaltests. `npm test` führt genau diesen dokumentierten Exportumfang aus, nicht die komplette ursprüngliche Browser-/UI-Suite.

Das Paket installiert nichts, hat keinen automatischen Deployment-Workflow und publiziert keine Website. Tests benötigen normale lokale Node-Subprozesse. In einer stark eingeschränkten Sandbox müssen Subprozesse zugelassen sein; leere Ausgaben eines blockierten Prozesses sind kein Testerfolg.

Nicht enthalten: Original-UI, private Presets, Browserprofile, Belege, PDFs, Kontoauszüge, Original-Git-Metadaten, ursprüngliche Autorenangaben oder lokale nicht eingecheckte Weiterentwicklungen. Vollständiges Inventar: `provenance/inclusion-inventory.json`.

Einzige inhaltliche Exportänderung betrifft die Dokumentation: Zwei Absätze pro `CALCULATION_SPEC.md` enthielten private Referenzzahlen. Die gekennzeichneten Dokumentationskopien unter `docs/specifications/` ersetzen diese Zahlenfolgen durch Datenschutzvermerke. Quellzeilen, ursprüngliche Git-/SHA-256-Prüfsummen und Export-Prüfsummen stehen unter `documentationExports` im Herkunftsmanifest. Kein Programmmodul und kein übernommener Test wurde geschwärzt oder bearbeitet.
