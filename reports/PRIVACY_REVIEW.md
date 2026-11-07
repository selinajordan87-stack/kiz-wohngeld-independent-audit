# Datenschutz- und Herkunftsprüfung

Prüfdatum: 07.11.2026. Ziel ist ein weitergebbares, eigenständiges Rechenkernpaket. Das neue Repository wird privat angelegt; eine öffentliche Sichtbarkeit ist nicht freigegeben.

## Dateiauswahl

- **72 unveränderte Originaldateien:** neun gemeinsame Berechnungs-/Hilfsmodule, Original-Teststarter und 25 ausgewählte Original-Testdateien je Version; zusätzlich zwei Finanzmodule in `finance`. Herkunft mit Branch, Commit, ursprünglichem Git-Blob-SHA und SHA-256 pro Datei dokumentiert.
- **Zwei geschwärzte Dokumentationskopien:** je `CALCULATION_SPEC.md` wurden zwei Absätze mit privaten Referenzzahlen entfernt/ersetzt. Die fachlichen Regeln bleiben erhalten; Quellzeilen und Prüfsummen sind ausdrücklich als Dokumentationsänderung protokolliert.
- **37 neu erzeugte synthetische Fälle:** keine umbenannten persönlichen Presets. Jobrad A–D und weitere Grenz-/Diagnosefälle, zusammen 74 Versionsaufrufe, vollständige Jobrad-Zwischenrechnungen und Testprotokolle.
- Neue README, Audit-Anleitung, Rechtsquellen, Abdeckungsgrenzen und technische Aufrufadapter.

Private Presets, persönliche Szenarioexporte, Originalbelege, Kontoauszüge, Bilder/PDFs, Original-README, Benutzeroberfläche, Speicherstände, Browserprofile, Zugangsdaten und ursprüngliche Git-Historie wurden ausgeschlossen. Die historische Bescheidprüfung einschließlich echter Beträge befindet sich ausschließlich in einem anderen privaten Verzeichnis, außerhalb dieses Repositories und außerhalb des weitergebbaren ZIPs.

## Durchgeführte Kontrollen

1. Quellversionen von festen GitHub-Commits lesen, nicht aus dem lokal geänderten Arbeitsbaum exportieren. Hashes gegen die GitHub-Blobs prüfen.
2. Importgraph und erforderliche Hilfsfunktionen ermitteln. Private-fixture-abhängige Tests vollständig ausschließen, statt private Daten nur umzubenennen.
3. Übernommene Module/Tests, Spezifikation und neue Fälle auf Namen, Ortsangaben, persönliche Betragsfolgen und vertrauliche Inhalte prüfen. Dabei gefundene private Zahlenvektoren in den Spezifikationen entfernen und Änderung protokollieren.
4. Sämtliche fertigen Dateien automatisiert auf bekannte private Marker sowie Tokenformate, private Schlüssel, IBAN, Versicherungsnummern und nicht synthetische E-Mail-Adressen prüfen. Die private Marker-Liste bleibt außerhalb dieses Pakets. Ergebnis: `privacy-scan-results.json`.
5. Eigene Git-Historie mit neutraler Autoridentität erstellen. Anschließend alle neuen erreichbaren Git-Blobs und Commitmetadaten nochmals scannen, einschließlich später ersetzter Dateien. Ergebnis: `history-scan-results.json`.
6. ZIP mit ausschließlich freigegebenen relativen Paketpfaden und neutralisierten ZIP-Zeit-/Besitzmetadaten erstellen; kein `.git`, kein privates Referenzpaket. Archivinhalt rekursiv mitprüfen.
7. Originalprojekt am Ende mit zuvor gesicherten Dateiprüfsummen und den Quell-Branchreferenzen vergleichen. Nur lesende Zugriffe auf das Original.

Die maschinenlesbaren Prüfdateien sind die maßgeblichen Ausführungsnachweise. Falls sie nicht vorliegen oder `REVIEW_REQUIRED` melden, ist die Prüfung nicht abgeschlossen. Der Dateiumfang ist unter `FILE_INVENTORY.md` und im Release-Dateimanifest nachvollziehbar.

## Einschätzung und Grenzen

In der ausgewählten weitergebbaren Dateimenge wurden nach der dokumentierten Schwärzung keine bekannten personenbezogenen Daten oder Zugangsdaten gefunden. Der echte historische Fall ist **nicht** Teil des anonymisierten Pakets. Keine Originalberechnungsfunktion oder Originaltest wurde geändert. Bestehende Softwarefehler bleiben für das Audit erhalten.

Die neue Git-Historie ist vollständig eigenständig. Mustererkennung plus manuelle Prüfung ist keine mathematische Garantie gegen jede denkbare Reidentifikation. **GitHub-Konto, Profil und Eigentümerschaft bleiben über einen Repository-Link sichtbar.** Falls auch diese Identität anonym sein soll, wäre später ein neutrales Eigentümerkonto erforderlich; eine automatische Übertragung oder Veröffentlichung erfolgt hier nicht. Commit-Hashes dokumentieren Herkunft, können aber durch Personen mit Zugriff auf das Original zugeordnet werden.

Eine Umstellung auf öffentlich darf ausschließlich nach ausdrücklicher Freigabe erfolgen. Bis dahin können externe KI-Systeme das Repository ohne eingerichteten privaten Zugang nicht über einen öffentlichen Link lesen. Das geprüfte ZIP kann unabhängig davon gezielt hochgeladen werden. Es wurden keine Nachrichten oder Einladungen an externe Prüfer versandt.
