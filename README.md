# 3615 DOLI 📺

> Votre ERP sur Minitel. Tarif : 1,29 F/min.

Module Dolibarr qui transforme **toute** l'interface en terminal Minitel.
Zéro utilité. 100% ambiance. Né pendant un devcamp.

```
+----------------------------------------------------+
|                     3615 DOLI                      |
|         SERVICE TELEMATIQUE PROFESSIONNEL          |
|                                                    |
|   CONNEXION ETABLIE  -  1200/75 BAUDS              |
|   TARIF : 1,29 F/MIN FACTURE A VOTRE PATRON        |
+----------------------------------------------------+
```

## Ce que ça fait

- 🖥️ **Écran cathodique** : fond noir, texte vert phosphore (police VT323), scanlines,
  vignettage, scintillement du tube, allumage CRT à chaque page.
- 🖨️ **Affichage à 1200 bauds** : à chaque page, **tous les textes** se peignent
  caractère par caractère, de haut en bas, avec le curseur de balayage — comme sur
  un vrai Minitel qui reçoit sa page. Sans saut de mise en page (les caractères
  non révélés sont masqués par des insécables, même largeur en monospace).
- 📞 **Modem au login** : à la connexion, le module **compose réellement le 36 15 en DTMF**
  (synthétisé au WebAudio : tonalité France Télécom, sonnerie, tonalité de réponse 2100 Hz,
  porteuse V.23, souffle de négociation) pendant que l'écran tape la séquence de connexion
  caractère par caractère. Comptez ~6 secondes, comme à l'époque.
- ⌨️ **Touches Minitel** (hors champ de saisie) :

  | Touche | Fonction | Effet |
  |--------|------------------|----------------------------------|
  | `S` | SOMMAIRE | Retour à l'accueil |
  | `R` | RETOUR | Page précédente |
  | `U` | SUITE | Page suivante |
  | `G` | GUIDE | Affiche le guide |
  | `F` | FIN | Déconnexion (avec écran d'adieu) |
  | `B` | BIP | Son du clavier on/off |
  | `M` | MINITEL INTÉGRAL | Masque la souris 😈 |

- 💸 **Compteur de coût** : la barre Minitel en bas d'écran affiche la durée de session
  et son coût en francs (1,29 F/min), facturé à votre patron.
- 🔊 Le clavier fait **bip** quand on tape, évidemment.
- 🔲 En-têtes de tableaux en vidéo inverse, texte en majuscules, pictos passés au phosphore.

## Installation

1. Cloner dans `htdocs/custom/` :
   ```bash
   cd htdocs/custom
   git clone https://github.com/evarisk-kilyan/doli3615.git
   ```
2. Activer le module dans **Accueil → Configuration → Modules** (famille *Interface*, « Doli3615 »).
3. Se déconnecter, admirer la page de login, mettre le son, se connecter. ☎️

## Désinstallation

Décocher le module. Le retour brutal aux couleurs de 2026 peut provoquer un léger vertige.

## Compatibilité

- Dolibarr ≥ 16 (développé sur la 23).
- Aucune table, aucun droit, aucun hook : juste un CSS et un JS injectés partout
  via `module_parts`. Vanilla JS, zéro dépendance, zéro build.
- La police VT323 est chargée depuis Google Fonts ; sans réseau, repli sur `Courier New`
  (le Minitel survit à tout).

## Licence

GPL v3+ — comme Dolibarr.
