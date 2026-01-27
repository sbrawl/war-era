// main_db.js - Le moteur de synchronisation et d'accès aux données
import { trpcQuery } from './js/api.js';
import { saveTransactions, getLastTransactionDate, getStatsDB, openDB } from './js/db.js';

// Configuration des types à synchroniser
const TRACKED_TYPES = ["wage", "itemMarket", "trading", "donation", "applicationFee"];

/**
 * RÉCUPÈRE LES TRANSACTIONS DEPUIS LA DB POUR UNE PÉRIODE DONNÉE
 */
export async function getTransactionsForPeriod(startDate, endDate) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("transactions", "readonly");
        const store = tx.objectStore("transactions");
        const index = store.index("createdAt");

        // --- CORRECTION ICI ---
        // Utiliser explicitement UTC pour les bornes (00:00:00Z - 23:59:59.999Z)
        const start = new Date(startDate + 'T00:00:00Z');
        const end = new Date(endDate + 'T23:59:59.999Z');

        const range = IDBKeyRange.bound(start.toISOString(), end.toISOString());
        // ----------------------

        const request = index.getAll(range);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Erreur lors de la récupération des transactions");
    });
}

/**
 * LOGIQUE DE TRAITEMENT DES DONNÉES D'ANALYSE
 * Transforme les transactions brutes en statistiques exploitables
 */
export function processAnalysisData(transactions, myUserId) {
    const analysis = {
        global: { totalBuy: 0, totalSell: 0, netProfit: 0, count: transactions.length },
        byItem: {}, byType: {}
    };

    const targetId = String(myUserId); // On normalise l'ID ici

    transactions.forEach(t => {
        const isBuyer = String(t.buyerId) === targetId;
        const isSeller = String(t.sellerId) === targetId;
        
        const money = Number(t.money) || 0;
        const qty = Number(t.quantity) || 0;

        if (isBuyer) analysis.global.totalBuy += money;
        if (isSeller) analysis.global.totalSell += money;

        const isTrading = t.transactionType === 'trading';
        const key = isTrading ? (t.itemCode || 'Unknown') : t.transactionType;
        const targetMap = isTrading ? analysis.byItem : analysis.byType;

        if (!targetMap[key]) {
            targetMap[key] = { name: key, count: 0, buyQty: 0, buyTotal: 0, sellQty: 0, sellTotal: 0 };
        }

        const entry = targetMap[key];
        entry.count++;
        if (isBuyer) { entry.buyQty += qty; entry.buyTotal += money; }
        if (isSeller) { entry.sellQty += qty; entry.sellTotal += money; }
    });

    // Utilisation de toFixed pour éviter les problèmes de précision 0.1 + 0.2
    analysis.global.netProfit = Number((analysis.global.totalSell - analysis.global.totalBuy).toFixed(2));
    return analysis;
}

/**
 * Lance la synchronisation des transactions pour l'utilisateur
 */
/**
 * Synchronisation complète des transactions
 */
export async function runFullSync(userId, onProgressUpdate) {
    let cursor = null;
    let totalSyncedThisSession = 0;
    let isSyncComplete = false;

    // 1. Récupérer le point d'arrêt (la plus récente en base)
    const lastDateInDB = await getLastTransactionDate();
    const lastTimestamp = lastDateInDB ? new Date(lastDateInDB).getTime() : 0;

    console.log(`[Sync] Démarrage. Point d'arrêt local : ${lastDateInDB || "Base vide"}`);

    try {
        while (!isSyncComplete) {
            // Appel API avec le curseur actuel
            const response = await trpcQuery('transaction.getPaginatedTransactions', {
                userId: userId,
                transactionType: TRACKED_TYPES,
                limit: 100,
                cursor: cursor,
            });

            const items = response?.items || [];
            const nextCursor = response?.nextCursor;

            // Si l'API ne renvoie rien, on a fini
            if (items.length === 0) {
                isSyncComplete = true;
                break;
            }

            const batchToSave = [];
            let foundOverlapInThisPage = false;

            for (const tx of items) {
                const txTime = new Date(tx.createdAt).getTime();

                // On vérifie si on a atteint des données anciennes
                if (txTime < lastTimestamp) {
                    foundOverlapInThisPage = true;
                    // IMPORTANT : On ne fait pas de 'break' ici. 
                    // On finit de parcourir la page pour être sûr de ne rater aucune transaction 
                    // qui aurait le même timestamp exact (même milliseconde).
                }
                
                batchToSave.push(tx);
            }

            // Sauvegarde du lot (IndexedDB gère les doublons via l'ID unique)
            if (batchToSave.length > 0) {
                await saveTransactions(batchToSave);
                totalSyncedThisSession += batchToSave.length;
                
                if (onProgressUpdate) onProgressUpdate(totalSyncedThisSession);
            }

            // Décision de continuer vers la page suivante
            if (!foundOverlapInThisPage && nextCursor) {
                cursor = nextCursor;
            } else {
                // On a trouvé des données anciennes ou il n'y a plus de pages
                isSyncComplete = true;
            }
        }

        const finalTotal = await getStatsDB();
        console.log(`[Sync] Terminée. ${totalSyncedThisSession} transactions traitées.`);
        
        // On retourne l'objet attendu par main2.js
        return { 
            newCount: totalSyncedThisSession, 
            totalInDB: finalTotal 
        };

    } catch (error) {
        console.error("[Sync] Erreur critique lors de la synchronisation:", error);
        
        // RÉPARATION ERREUR : En cas d'erreur, on renvoie un objet par défaut 
        // pour éviter le crash "undefined" dans l'UI.
        const currentTotal = await getStatsDB().catch(() => 0);
        return { 
            newCount: 0, 
            totalInDB: currentTotal,
            error: error.message 
        };
    }
}

/**
 * Récupère les informations de base de la DB pour l'affichage initial
 */
export async function getDatabaseOverview() {
    const total = await getStatsDB();
    const lastDate = await getLastTransactionDate();
    const lastISO = lastDate ? new Date(lastDate).toISOString() : null;
    return {
        totalTransactions: total,
        // `lastUpdate` = ISO (machine), `lastUpdateHuman` = lisible pour l'UI
        lastUpdate: lastISO,
        lastUpdateHuman: lastISO ? lastISO.replace('T',' ').split('.')[0] + ' UTC' : "Jamais"
    }; 
}

/**
 * Récupère la date de la transaction la plus ancienne en base
 */
export async function getOldestTransactionDate() {
    const db = await openDB(); // Importé depuis db.js
    return new Promise((resolve) => {
        const tx = db.transaction("transactions", "readonly");
        const store = tx.objectStore("transactions");
        const index = store.index("createdAt");
        // On prend le premier élément (le plus ancien)
        const request = index.openCursor(null, "next"); 
        request.onsuccess = (e) => {
            const cursor = e.target.result;
            resolve(cursor ? cursor.value.createdAt : null);
        };
    });
}