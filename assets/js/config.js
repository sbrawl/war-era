// Configuration globale de l'application
// Modifier cette valeur pour changer le nombre d'options recommandées affichées
export const TOP_OPTIONS_COUNT = 5;

// Export des recettes (PP totaux et composants nécessaires)
export const RECIPES = {
	'grain': { totalPPs: 1, components: {} },
	'limestone': { totalPPs: 1, components: {} },
	'lead': { totalPPs: 1, components: {} },
	'petroleum': { totalPPs: 1, components: {} },
	'coca': { totalPPs: 1, components: {} },
	'iron': { totalPPs: 1, components: {} },
	'livestock': { totalPPs: 20, components: {} },
	'fish': { totalPPs: 40, components: {} },
    
	'steel': { totalPPs: 10, components: { 'iron': 10 } }, 
	'concrete': { totalPPs: 10, components: { 'limestone': 10 } }, 
	'oil': { totalPPs: 1, components: { 'petroleum': 1 } },
	'bread': { totalPPs: 10, components: { 'grain': 10 } },
	'steak': { totalPPs: 20, components: { 'livestock': 1 } },
	'cookedFish': { totalPPs: 40, components: { 'fish': 1 } },
    
	'lightAmmo': { totalPPs: 1, components: { 'lead': 1 } }, 
	'ammo': { totalPPs: 4, components: { 'lead': 4 } }, 
	'heavyAmmo': { totalPPs: 16, components: { 'lead': 16 } }, 
	'cocain': { totalPPs: 200, components: { 'mysterious_plant': 200 } }
};

export const automatedEngine = {
	1: 24,
	2: 48,
	3: 72,
	4: 96,
	5: 120,
	6: 144,
	7: 168,
};

export const storage = {
	1: 200,
	2: 400,
	3: 600,
	4: 800,
	5: 1000,
	6: 1200,
	7: 1400,
}

