# Rapport d'analyse : Reproduction du jeu Boggle

Ce projet est une application web moderne développée avec **Angular** qui propose deux modes de jeu de recherche de mots dans une grille de lettres (Boggle et un mode Alphabet). Les mots saisis par l'utilisateur sont validés en temps réel contre un dictionnaire de référence stocké en local dans le navigateur.

---

## 1. Architecture Générale et Technologies

L'application repose sur la pile technique suivante :
*   **Framework** : Angular v19 (initialement généré sous v16, mais récemment mis à niveau). Les composants sont *Standalone*.
*   **Base de données locale** : [Dexie.js](https://dexie.org/) (une surcouche conviviale à **IndexedDB**) permettant de stocker les dictionnaires côté client.
*   **Calcul asynchrone** : Utilisation d'un **Web Worker** pour charger et indexer le dictionnaire de manière asynchrone sans bloquer l'interface utilisateur.
*   **UI & Design** : [Angular Material](https://material.angular.io/) pour certains contrôles de base, combiné avec un design system personnalisé en SCSS (style dark mode et glassmorphism).

---

## 2. Structure du Code Source (`src/app`)

L'organisation des répertoires et fichiers est la suivante :

### 📂 [components](file:///Ubuntu/root/angular-word-game/src/app/components)
Regroupe les composants visuels de l'interface de jeu.
*   [`app.component.ts`](file:///Ubuntu/root/angular-word-game/src/app/app.component.ts) : Composant racine qui gère la sélection du mode de jeu et s'abonne aux notifications de chargement de la base de données.
*   [`grid.component.ts`](file:///Ubuntu/root/angular-word-game/src/app/components/grid.component.ts) : Conteneur principal du jeu. Affiche la grille, le chronomètre, les boutons d'action (Valider/Annuler/Rejouer), le score final et le volet des mots trouvés.
*   [`letter.component.ts`](file:///Ubuntu/root/angular-word-game/src/app/components/letter.component.ts) : Représente une case de la grille. Gère l'effet de survol, l'effet ripple et le clic utilisateur pour sélectionner/désélectionner la lettre.
*   [`countdown.component.ts`](file:///Ubuntu/root/angular-word-game/src/app/components/countdown.component.ts) : Un chronomètre (par défaut réglé sur 120 secondes) basé sur des flux RxJS (`interval(1000)`).
*   [`words.component.ts`](file:///Ubuntu/root/angular-word-game/src/app/components/words.component.ts) : Affiche la liste des mots trouvés avec les points générés pour chacun d'eux.
*   [`score.component.ts`](file:///Ubuntu/root/angular-word-game/src/app/components/score.component.ts) : Affiche le score total calculé à la fin de la partie.
*   [`game-select.component.ts`](file:///Ubuntu/root/angular-word-game/src/app/components/game-select.component.ts) : Formulaire permettant de choisir le mode de jeu (Alphabet ou Boggle). Le bouton de démarrage est désactivé tant que le dictionnaire n'est pas complètement chargé en cache IndexedDB.

### 📂 [services](file:///Ubuntu/root/angular-word-game/src/app/services)
Contient la logique métier du jeu et les types/interfaces de données.
*   [`word-game.interface.ts`](file:///Ubuntu/root/angular-word-game/src/app/services/word-game.interface.ts) : Contient toutes les définitions d'interfaces du domaine (`Game`, `BoardCase`, `GameBehavior`, `GameScoring`, etc.) et la classe réutilisable `BoardCase` basée sur les Angular *Signals* (`WritableSignal`).
*   [`game-behavior.service.ts`](file:///Ubuntu/root/angular-word-game/src/app/services/game-behavior.service.ts) : Contient la logique d'état et les règles de validation du tracé de mot (décrites ci-dessous).
*   📂 [**alphabet**](file:///Ubuntu/root/angular-word-game/src/app/services/alphabet) : Logique spécifique au mode Alphabet (génération de grille 5x5 aléatoire et scoring de longueur simple).
*   📂 [**boggle**](file:///Ubuntu/root/angular-word-game/src/app/services/boggle) : Logique de reproduction du Boggle classique (grille 4x4, simulation de tirage de dés physiques et système de points officiel).
*   📂 [**database**](file:///Ubuntu/root/angular-word-game/src/app/services/database) : Configuration de Dexie (`db.ts`) et de l'injectable `DbService` communiquant avec le Web Worker.

### 📂 [workers](file:///Ubuntu/root/angular-word-game/src/app/workers)
*   [`db.worker.ts`](file:///Ubuntu/root/angular-word-game/src/app/workers/db.worker.ts) : Web Worker dédié au chargement en arrière-plan du dictionnaire français (fichier [`public/dictionnaries/fr/ods6.txt`](file:///Ubuntu/root/angular-word-game/public/dictionnaries/fr/ods6.txt) contenant les mots de l'Officiel du Scrabble 6). Il lit le fichier texte, le découpe par ligne, filtre les doublons, et injecte les mots par lots (`bulkAdd`) dans IndexedDB.

---

## 3. Logique et Règles du Jeu (`GameBehavior`)

Le moteur de jeu [`GameBehavior`](file:///Ubuntu/root/angular-word-game/src/app/services/game-behavior.service.ts) implémente les contraintes officielles du Boggle :
1.  **Sélection des lettres** : L'utilisateur clique sur des lettres consécutives pour former un mot.
2.  **Règle d'adjacence** : Une lettre ne peut être sélectionnée que si elle est adjacente (horizontalement, verticalement ou en diagonale) à la dernière lettre cliquée (méthode `isAroundLastClickedCase`).
3.  **Lettre unique par mot** : Une même case de la grille ne peut pas être réutilisée plus d'une fois dans le tracé du même mot (`isAlreadyClickedCaseInCurrentSeries`).
4.  **Désélection** : L'utilisateur ne peut annuler sa sélection qu'en partant de la fin (méthode `canUnSelectCase` qui vérifie si la case est la dernière cliquée dans la chaîne).
5.  **Validation du mot** :
    *   La longueur minimale du mot doit être supérieure à 2 lettres (donc **3 lettres ou plus**).
    *   Le mot ne doit pas avoir déjà été trouvé dans la partie en cours.
    *   Le mot doit exister dans la base de données Dexie (IndexedDB).

---

## 4. Comparaison des Deux Modes de Jeu

L'application découple la configuration de la grille, le tirage des lettres et le calcul du score grâce à des abstractions d'interfaces :

| Caractéristique | Mode Alphabet | Mode Boggle |
| :--- | :--- | :--- |
| **Taille de la Grille** | 5x5 | 4x4 |
| **Génération des Lettres** | Tirage purement aléatoire et uniforme parmi les 26 lettres de l'alphabet. | Simulation du tirage des **16 dés originaux** du jeu Boggle (en français). Chaque dé possède ses propres faces et chaque dé n'est utilisé qu'une fois. |
| **Scoring par mot** | 1 point par lettre (ex: un mot de 4 lettres = 4 points). | Système de points officiel : <br>• 3-4 lettres : 1 point <br>• 5 lettres : 2 points <br>• 6 lettres : 3 points <br>• 7 lettres : 5 points <br>• 8+ lettres : 11 points |

---

## 5. Design System et Design Visuel

*   **Palette de couleurs** : Définie dans [`src/styles.scss`](file:///Ubuntu/root/angular-word-game/src/styles.scss), elle utilise des nuances d'Indigo, de Rose et d'Ardoise (`Slate`).
*   **Esthétique** : L'application utilise une esthétique *Glassmorphism* moderne avec des panneaux semi-transparents floutés (`backdrop-filter: blur(12px)`), des bordures fines blanches translucides, et des ombres douces.
*   **Typographie** : Utilisation de la police Google Fonts **Inter**.

> [!NOTE]
> **Incohérence de style identifiée** :
> Le fichier de style global [`styles.scss`](file:///Ubuntu/root/angular-word-game/src/styles.scss) définit une superbe charte sombre (Dark Mode). Cependant, le fichier de composant racine [`src/app/app.scss`](file:///Ubuntu/root/angular-word-game/src/app/app.scss) force un fond blanc (`background-color: #ffffff`) sur les balises `<header>`, `<main>` et `<footer>`, ce qui casse l'immersion sombre globale de l'application. C'est un élément d'amélioration cosmétique évident.

---

## 6. Analyse des Tests Unitaires

Le projet inclut une suite de tests unitaires pour le moteur du jeu dans [`game-behavior.service.spec.ts`](file:///Ubuntu/root/angular-word-game/src/app/services/game-behavior.service.spec.ts) :
*   Vérification que l'on ne peut pas cliquer en dehors de la grille.
*   Vérification que l'on peut commencer un mot sur n'importe quelle case de la grille.
*   Validation de la règle d'adjacence pour la sélection d'une case voisine.
*   Interdiction de sélectionner une case non adjacente.
*   Vérification que seule la dernière case de la chaîne peut être désélectionnée.

---

## 7. Déploiement et Build

Dans la configuration [`angular.json`](file:///Ubuntu/root/angular-word-game/angular.json), on remarque que le chemin de sortie de production (`outputPath`) est configuré vers `docs/angular-word-game`. Ce paramétrage permet de publier directement le build de l'application sur **GitHub Pages** en configurant le dépôt pour servir le dossier `/docs` de la branche principale.
