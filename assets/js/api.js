// ============================================
// API.JS - REQUÊTES TRPC
// ============================================

import { getStoredApiKey } from './apiKeyManager.js';

const trpcEndpoint = 'https://api2.warera.io/trpc';

// --- FONCTIONS CORE ---
export async function trpcQuery(procedureName, input = {}) {
    const cleanedInput = Object.keys(input).reduce((acc, key) => {
        if (input[key] !== null && input[key] !== undefined) {
            acc[key] = input[key];
        }
        return acc;
    }, {});

    const url = `${trpcEndpoint}/${procedureName}?input=${encodeURIComponent(JSON.stringify(cleanedInput))}`;

    // Récupérer la clé API dynamiquement
    const apiKey = getStoredApiKey();
    const headers = {
        'Content-Type': 'application/json',
    };
    
    if (apiKey) {
        headers['X-API-Key'] = apiKey;
    }

    const response = await fetch(url, {
        method: 'GET',
        headers: headers,
    });

    if (!response.ok) {
        const errorText = await response.text(); 
        let errorMessage = `Erreur HTTP: ${response.status}`;
        try {
            const errorJson = JSON.parse(errorText);
            if (errorJson?.error?.message) {
                errorMessage = errorJson.error.message;
            }
        } catch {}

        throw new Error(errorMessage);
    }

    const data = await response.json();

    if (data.result && data.result.data) {
        return data.result.data;
    }
    
    return data; 
}

// --- FONCTIONS UTILISATEUR ---
export async function getUserProductionAndName(userId) {
    try {
        const userData = await trpcQuery('user.getUserLite', { userId });
        
        return {
            production: userData.skills?.production?.value || 12,
            name: userData.username || userId.substring(0, 8) + '...',
            estimatedWorkPerDay: (userData.skills?.energy?.hourlyBarRegen * 24) / 10 || 0
        };

    } catch (error) {
        console.error(`Erreur profil ${userId}:`, error);
        return {
            ppPerSession: 12,
            username: userId.substring(0, 8) + '...'
        }; 
    }
}

// --- FONCTIONS REGION & PAYS ---
export async function getAllRegions() {
    try {
        const regionsData = await trpcQuery('region.getRegionsObject', {});
        return Object.values(regionsData) || [];
    } catch (error) {
        console.error("Erreur régions:", error);
        return [];
    }
}

export async function getAllCountries() {
    try {
        const countries = await trpcQuery('country.getAllCountries', {});
        return Array.isArray(countries) ? countries : [];
    } catch (error) {
        console.error('Erreur pays:', error);
        return [];
    }
}
