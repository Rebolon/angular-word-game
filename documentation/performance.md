# Documentation des Performances : Optimisation du Dictionnaire

Ce document retrace le cheminement technique ayant permis d'optimiser le chargement et la validation du dictionnaire de mots français (Officiel du Scrabble ODS6 - 386 184 mots uniques) du jeu de Boggle, faisant passer le temps de chargement initial de **1 minute 30 secondes à moins de 200 millisecondes (accélération de 450x)**.

---

## 🚀 Tableau Comparatif des Performances

| Version de l'implémentation | Temps d'initialisation initial | Temps de chargement suivant | Vitesse de validation en jeu |
| :--- | :--- | :--- | :--- |
| **1. Originale** | ~1 minute 30 secondes | ~1 à 2 secondes | ~5-15 ms (Asynchrone) |
| **2. RxJS optimisé (Chunks de 30k)** | ~1 minute 10 secondes | ~1 à 2 secondes | ~5-15 ms (Asynchrone) |
| **3. Transaction unique séquentielle** | ~41 secondes | ~1 à 2 secondes | ~5-15 ms (Asynchrone) |
| **4. Cache Mémoire (Version Finale)** | **< 200 millisecondes** | **< 50 millisecondes** | **< 0.01 ms (Synchrone)** |

---

## 1. L'état initial (Original)

Dans la version originale du projet, le fichier [`ods6.txt`](file:///Ubuntu/root/angular-word-game/public/dictionnaries/fr/ods6.txt) était lu et importé dans IndexedDB via un Web Worker (`db.worker.ts`).

### Goulots d'étranglement identifiés :
1.  **Overhead RxJS massif** : Le fichier était découpé par sauts de ligne, puis chaque mot était émis **un par un** dans un flux RxJS (soit 386 000 événements individuels consécutifs). L'opérateur `.distinct()` comparait chaque mot à un historique en mémoire, et `.count()` comptait chaque événement individuellement. Cela consommait d'immenses ressources CPU et figeait virtuellement le Web Worker.
2.  **Requêtes réseau multiples** : La structure d'abonnement au sein de l'écouteur d'événements créait un nouvel abonnement complet à chaque message. Ainsi, le fichier texte était retéléchargé et recalculé à trois reprises en parallèle.
3.  **Schéma de base de données non optimal** : La table IndexedDB utilisait une clé primaire auto-incrémentée (`++`) et deux index secondaires (`fr` et `value`). L'écriture de chaque ligne nécessitait le calcul des index de recherche, doublant le travail d'écriture sur le disque.
4.  **Recherche lente en cours de partie** : La validation d'un mot s'effectuait de manière asynchrone via `.where("value").equalsIgnoreCase()`.

---

## 2. Étape 1 : Optimisation du flux RxJS et filtrage (1m30s ➜ 1m10s)

Dans cette première phase de correction, nous avons conservé la structure de la base de données mais corrigé la tuyauterie de flux.

### Solutions appliquées :
*   **Prétraitement synchrone en mémoire** : Le fractionnement du texte, la mise en majuscules et le dédoublonnement ont été confiés à un `Set` natif en JavaScript (exécuté en ~80 ms) plutôt qu'à l'opérateur RxJS `.distinct()`.
*   **Filtrage de longueur** : Exclusion des mots de moins de 3 lettres (puisque le Boggle impose des mots de 3 lettres minimum), réduisant le jeu de données d'environ 30 000 mots.
*   **Cache d'observable (`shareReplay`)** : Ajout de `shareReplay(1)` sur l'observable de traitement du dictionnaire. Les abonnements multiples partagent désormais le même résultat traité sans redéclencher d'appels réseau.
*   **Écriture par blocs parallèles** : Découpage en blocs de 30 000 mots et écriture à l'aide de `mergeMap` avec un facteur de concurrence égal à `4`.

*Résultat : Une réduction du temps à 1 minute 10 secondes.*

---

## 3. Étape 2 : Concurrence et transactions (1m10s ➜ 41s)

Malgré l'optimisation du flux, écrire des dizaines de milliers d'objets dans IndexedDB restait trop lent à cause de la gestion des verrous et de l'indexation.

### Solutions appliquées :
*   **Indexation et clé primaire** : Le mot lui-même étant unique, nous avons défini `value` comme la clé primaire de la table et supprimé les index secondaires inutiles. La table ne contient plus qu'un seul index (sa clé primaire).
*   **Écritures séquentielles (`concatMap`)** : L'écriture parallèle à l'étape précédente créait des conflits d'accès et des attentes de verrou dans IndexedDB. L'utilisation de `concatMap` a permis de chaîner les écritures de manière fluide.
*   **Transactions globales** : Regroupement de la boucle d'insertion dans une transaction unique de lecture/écriture (`db.transaction('rw')`). IndexedDB n'effectue plus qu'un seul commit sur le disque à la fin de la transaction au lieu d'un commit par bloc.

*Résultat : Le temps d'initialisation est tombé à 41 secondes.*

---

## 4. Étape 3 : L'approche Cache Mémoire (41s ➜ < 200ms) - Version Finale

Pour obtenir des performances instantanées, nous avons changé de paradigme architectural en stockant le dictionnaire non plus sous forme de lignes individuelles, mais comme un document unique.

### Concept de la version finale :
1.  **Enregistrement unique dans IndexedDB** :
    Au lieu de stocker 386 000 objets séparés, la table stocke désormais un **unique objet** contenant le tableau de chaînes complet :
    ```typescript
    export interface DictionaryRecord {
        key: string; // ex: 'fr'
        list: string[];
    }
    ```
    L'écriture d'un tableau compressé de 3.8 Mo prend moins de **100 millisecondes** en IndexedDB.
2.  **Chargement du cache mémoire au démarrage** :
    Au chargement de la page, le singleton `DbService` lit cet enregistrement unique de la base locale (opération de lecture de moins de 50 ms) et remplit un ensemble global en mémoire de type `Set<string>` nommé `dictionaryCache`.
3.  **Recherche synchrone en O(1)** :
    En cours de partie, la validation d'un mot n'interroge plus du tout IndexedDB. Elle interroge de façon synchrone le `Set` en mémoire :
    ```typescript
    private isRealWord(currentWord: string): Observable<boolean> {
      return of(dictionaryCache.has(currentWord.toUpperCase()));
    }
    ```
    Cette recherche s'exécute en **moins de 0.01 milliseconde** sans aucun lag.

---

## 💡 Conclusion et Avantages

L'architecture finale (Cache Mémoire) offre le meilleur des deux mondes :
*   **Rapidité d'initialisation** : L'écriture de l'enregistrement unique est instantanée, le chargement est invisible pour l'utilisateur.
*   **Zéro requête réseau ultérieure** : Le dictionnaire reste persistant localement dans IndexedDB et évite de retélécharger le fichier de 4.2 Mo lors des futures visites.
*   **Validation instantanée** : Le CPU n'est plus du tout sollicité pour interroger la base de données locale pendant que le compte à rebours défile.
