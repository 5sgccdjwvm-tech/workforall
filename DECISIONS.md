# Décisions — Work for All Smart Stock

- Next.js App Router + TypeScript, Prisma/SQLite fichier, Tailwind CSS; interface mobile-first sobre, vert forêt / crème / terracotta.
- Le schéma couvre Company, établissements, rôles, catalogue, recettes, ventes, mouvements, inventaires, anomalies, alertes, POS et audit.
- La règle de stock impose de créer un mouvement lors des variations; les écritures métier transactionnelles complètes (vente, inventaire) sont la prochaine étape du MVP.
- Le connecteur POS réel est limité: aucun identifiant/API caisse n'a été fourni. Un point de connexion « Caisse simulation — Webhook » est préparé; aucun accès fournisseur n'est simulé comme réel.
- Reporté: commandes fournisseurs, prévisions IA, comptabilité, facturation, RH, planning, CRM et paiements.
- Limites connues: authentification NextAuth et formulaires d'écriture avancés nécessitent leur branche dédiée; le dashboard et stock sont connectés à la base et le seed est reproductible.
