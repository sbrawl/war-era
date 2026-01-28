// ============================================
// API KEY MANAGER - Gestion de la clé API au démarrage
// ============================================

/**
 * Vérifier et valider la clé API au démarrage
 * À appeler au démarrage de l'app
 */
export async function initializeApiKeyCheck(syncBtn, statusEl) {
    const apiKey = getStoredApiKey();
    
    if (!apiKey) {
        // Pas de clé API trouvée
        disableSyncButton(syncBtn, '⚠️ Aucun API Key fourni');
        if (statusEl) statusEl.textContent = 'Aucun API Key fourni';
        return false;
    }
    
    // Tester la clé API
    try {
        sessionStorage.setItem('apiKey', apiKey);
        
        // Faire un appel API pour valider
        // On utilise un ID fictif, l'erreur 404 est normale mais le header sera validé
        const test = await fetch('https://api2.warera.io/trpc/transaction.getPaginatedTransactions?input=' + encodeURIComponent(JSON.stringify({ userId: localStorage.getItem('targetUserId'), limit: 10, transactionType: "trading"})), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
            }
        });

        if (test.status === 401) {
            console.warn('Validation API Key échouée:', err);
            disableSyncButton(syncBtn, '❌ API Key invalide');
            if (statusEl) statusEl.textContent = 'API Key invalide';
            return false;
        }


        // Si on arrive ici sans exception, la clé est valide
        enableSyncButton(syncBtn);
        if (statusEl) statusEl.textContent = '✅ API Key valide';
        return true;
        
    } catch (err) {
        console.warn('Validation API Key échouée:', err);
        disableSyncButton(syncBtn, '❌ API Key invalide');
        if (statusEl) statusEl.textContent = 'API Key invalide';
        return false;
    }
}

/**
 * Récupérer la clé API stockée (sessionStorage ou localStorage)
 */
export function getStoredApiKey() {
    const sessionKey = sessionStorage.getItem('apiKey');
    if (sessionKey) return sessionKey;
    
    const localKey = localStorage.getItem('apiKey');
    if (localKey) return localKey;
    
    return null;
}

/**
 * Désactiver le bouton sync et afficher un message
 */
function disableSyncButton(syncBtn, message) {
    if (syncBtn) {
        syncBtn.disabled = true;
        syncBtn.title = message;
        syncBtn.style.opacity = '0.5';
        syncBtn.style.cursor = 'not-allowed';
    }
}

/**
 * Activer le bouton sync
 */
function enableSyncButton(syncBtn) {
    if (syncBtn) {
        syncBtn.disabled = false;
        syncBtn.title = 'Synchroniser la base de données';
        syncBtn.style.opacity = '1';
        syncBtn.style.cursor = 'pointer';
    }
}

/**
 * Initialiser le bouton pour changer/ajouter la clé API
 */
export function setupChangeApiKeyButton(syncBtn, statusEl) {
    const changeApiKeyBtn = document.getElementById('changeApiKeyBtn');
    
    if (!changeApiKeyBtn) {
        console.warn('changeApiKeyBtn non trouvé dans le DOM');
        return;
    }
    
    changeApiKeyBtn.addEventListener('click', () => openChangeApiKeyModal(syncBtn, statusEl));
}

/**
 * Ouvrir la modale pour changer/ajouter la clé API
 */
function openChangeApiKeyModal(syncBtn, statusEl) {
    const modal = document.getElementById('change-api-key-modal');
    const apiKeyInput = document.getElementById('changeApiKeyInput');
    const saveBtn = document.getElementById('saveChangeApiKeyBtn');
    const closeBtn = document.getElementById('closeChangeApiKeyBtn');
    const closeCancelBtn = document.getElementById('closeCancelApiKeyBtn');
    const errorEl = document.getElementById('change-api-key-error');
    
    // Afficher la modale
    modal.classList.remove('hidden');
    apiKeyInput.value = '';
    errorEl.style.display = 'none';
    apiKeyInput.focus();
    
    // Fermer la modale
    const onClose = () => {
        modal.classList.add('hidden');
        apiKeyInput.value = '';
        errorEl.style.display = 'none';
    };
    
    closeBtn.addEventListener('click', onClose, { once: true });
    closeCancelBtn.addEventListener('click', onClose, { once: true });
    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') onClose();
    }, { once: true });
    
    // Sauvegarder la clé API
    const onSave = async () => {
        const apiKey = apiKeyInput.value.trim();
        const storageOption = document.querySelector('input[name="changeApiKeyStorage"]:checked');
        const persistApiKey = storageOption ? storageOption.value === 'persistent' : false;
        
        if (!apiKey) {
            errorEl.style.display = 'block';
            errorEl.textContent = 'Veuillez entrer une clé API.';
            return;
        }
        
        // Désactiver les contrôles pendant la validation
        saveBtn.disabled = true;
        apiKeyInput.disabled = true;
        const origText = saveBtn.textContent;
        saveBtn.textContent = 'Vérification...';
        errorEl.style.display = 'none';
        
        try {
            // Tester la clé API
            const MY_USER_ID = localStorage.getItem('targetUserId');
            const response = await fetch('https://api2.warera.io/trpc/transaction.getPaginatedTransactions?input=' + encodeURIComponent(JSON.stringify({ userId: MY_USER_ID, limit: 10, transactionType: "trading" })), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey
                }
            });

            console.log(response);
            
            if (response.status === 401) {
                console.warn('Validation clé API échouée', err);
                errorEl.style.display = 'block';
                errorEl.textContent = 'Clé API invalide. Veuillez vérifier et réessayer.';
                apiKeyInput.focus();
                return;
            }

            // Sauvegarder selon le choix
            if (persistApiKey) {
                localStorage.setItem('apiKey', apiKey);
                sessionStorage.removeItem('apiKey');
            } else {
                sessionStorage.setItem('apiKey', apiKey);
                localStorage.removeItem('apiKey');
            }
            
            // Mettre à jour l'état du bouton sync
            enableSyncButton(syncBtn);
            if (statusEl) statusEl.textContent = '✅ API Key valide';
            
            // Succès
            modal.classList.add('hidden');
            showNotification('✅ Clé API mise à jour avec succès !', 'success');
            
        } catch (err) {
            console.warn('Validation clé API échouée', err);
            errorEl.style.display = 'block';
            errorEl.textContent = 'Clé API invalide. Veuillez vérifier et réessayer.';
            apiKeyInput.focus();
        } finally {
            saveBtn.disabled = false;
            apiKeyInput.disabled = false;
            saveBtn.textContent = origText;
        }
    };
    
    saveBtn.removeEventListener('click', onSave);
    saveBtn.addEventListener('click', onSave);
    apiKeyInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') onSave();
    }, { once: false });
}

/**
 * Afficher une notification temporaire
 */
function showNotification(message, type = 'info') {
    let notif = document.getElementById('notification-container');
    
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'notification-container';
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
        `;
        document.body.appendChild(notif);
    }
    
    const notifEl = document.createElement('div');
    notifEl.style.cssText = `
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#ff4444' : '#2196F3'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-size: 14px;
        animation: slideIn 0.3s ease-out;
    `;
    notifEl.textContent = message;
    notif.appendChild(notifEl);
    
    setTimeout(() => {
        notifEl.remove();
    }, 4000);
}

