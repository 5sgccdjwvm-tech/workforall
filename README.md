# Work For All / Smart Stock — version modifiée

## Lancer
Node.js 18+ requis : `npm install` puis `npm run dev` (ou `npm run build && npm start`). Ouvrir http://localhost:3000. L’application est une démo Next.js côté client ; aucune connexion n’est requise. Pour afficher un autre nom, exécuter dans la console du navigateur `localStorage.setItem('wfa-user', JSON.stringify({name:'Yann'})); location.reload()` (ou utiliser la donnée utilisateur existante si elle est déjà enregistrée).

## Tester les modifications
1. **Bienvenue** : ouvrir Dashboard ; le nom de `wfa-user` apparaît dans « Bonjour … » (repli démo : Yann).
2. **Tendance** : dans le sélecteur du panneau TENDANCE, choisir « 7 semaines », « Ce mois » ou « Cette année » ; le nombre de barres, les libellés et la série changent.
3. **Alertes stock** : dans Produits, modifier un produit avec une quantité inférieure ou égale au minimum. Dans Stock, il devient rouge et passe en tête.
4. **Factures** : ouvrir Factures et importer un PDF texte ou une image. Le PDF est lu avec pdf.js et l’image avec Tesseract.js ; numéro, date, fournisseur, lignes produit, quantités, prix et total sont préremplis quand reconnus. Vérifier puis valider ; les produits sont rapprochés par nom avant mise à jour du stock.
5. **Fournisseurs** : ouvrir Fournisseurs puis cliquer une carte ; le tableau « Produits associés » liste tous les produits, sans tranche ni pagination.
6. **Non-régression** : utiliser les menus Dashboard, Produits, Stock, Recettes Bar, Factures, Fournisseurs et Paramètres.
