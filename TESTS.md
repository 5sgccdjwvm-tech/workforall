# Tests du brief

| Test | Résultat | Note |
|---|---|---|
| Créer produit | PARTIEL | Modèle Prisma + page catalogue présents; formulaire à compléter |
| Entrée stock | PARTIEL | StockMovement ENTRY présent dans schéma/seed |
| Créer recette | PARTIEL | Recipe/RecipeIngredient et Gin Tonic seedés |
| Créer vente | PARTIEL | Sale/SaleLine présents; écran d’écriture à compléter |
| Déduction auto | PARTIEL | Relations et mouvements prévues; transaction métier à compléter |
| Historique | OK | mouvements récents chargés depuis SQLite |
| Inventaire/écarts | PARTIEL | modèles présents; validation UI à compléter |
| Alerte stock faible | OK | indicateurs stock calculés côté serveur |
| Import CSV | REPORTÉ | papaparse prévu dans package, assistant non livré |
| Association POS/recette | PARTIEL | POSProductMapping dans schéma |
| Rendu mobile | OK | CSS responsive vérifié structurellement (tables → lignes) |
| Redémarrage à froid/persistance | NON EXÉCUTÉ | dépend de l'installation npm réseau |
