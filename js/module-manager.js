import { 
    miningData, 
    MODULE_ATTRIBUTE_ORDER, 
    MODULE_DISPLAY_ATTRIBUTES,
    ATTRIBUTE_ORDER_NAMES,
    DEFAULT_ACTIVE_NAMES,
    DEFAULT_ACTIVE_MODULE_NAMES
} from './data-manager.js';
import { renderSelectedLaserheads, selectedLaserheads } from './laserhead-manager.js';
import { generateModuleCardHTML } from './html-generators.js';
import { updateBreakabilityChart } from './chart-manager.js';
import { saveLaserSetup, saveActiveModuleTypes, loadActiveModuleTypes, saveActiveTiers, loadActiveTiers, saveDisplayAttributes, saveModuleDisplayAttributes } from './storage-manager.js';

let currentLaserheadIndex = null;
let currentModuleSlot = null;
let activeModuleTypes = new Set(["active", "passive"]); // Show both types by default
let activeTiers = new Set([1, 2, 3]); // Show all tiers by default

export function setupModuleUI() {
    // Load saved filters
    const savedModuleTypes = loadActiveModuleTypes();
    if (savedModuleTypes) {
        activeModuleTypes = savedModuleTypes;
    }
    
    const savedTiers = loadActiveTiers();
    if (savedTiers) {
        activeTiers = savedTiers;
    }
    
    setupModuleModal();
    setupModuleTypeFilters();
    setupTierFilters();
}

export function showModuleSelection(laserIdx, slotIdx) {
    currentLaserheadIndex = laserIdx;
    currentModuleSlot = slotIdx;
    document.getElementById('moduleModal').classList.remove('hidden');
    renderModuleCards();
}

export function removeModule(laserIdx, moduleIdx) {
    const laserhead = selectedLaserheads[laserIdx];
    if (laserhead && Array.isArray(laserhead.modules)) {
        // Remove the module by setting it to null
        // Keep the null to preserve slot indices
        laserhead.modules[moduleIdx] = null;
        
        // Update the display
        renderSelectedLaserheads();
        saveLaserSetup(selectedLaserheads);
    }
}

export function toggleModule(laserIdx, moduleIdx) {
    const slots = document.getElementById('laserSlots');
    const laserSlot = slots.children[laserIdx];
    if (!laserSlot) return;

    const moduleSlots = laserSlot.querySelector('.module-slots');
    const moduleSlot = moduleSlots.children[moduleIdx];
    if (!moduleSlot) return;

    const moduleNameSpan = moduleSlot.querySelector('.module-name');
    const moduleName = moduleNameSpan.textContent;
    const module = miningData.modules.find(m => m.name === moduleName);

    if (!isActiveModule(module)) return;

    const isCurrentlyActive = !moduleNameSpan.classList.contains('inactive');
    moduleNameSpan.classList.toggle('inactive', isCurrentlyActive);

    const moduleTable = moduleSlot.querySelector('.module-table');
    if (moduleTable) {
        moduleTable.classList.toggle('inactive', isCurrentlyActive);
    }
}

export function isActiveModule(module) {
    return module?.attributes?.some(attr => 
        attr.attribute_name === "Item Type" && 
        attr.value === "Active"
    ) ?? false;
}

export function renderDisplayOptions() {
    const laserheadCheckboxes = document.getElementById('displayOptionsCheckboxes');
    const moduleCheckboxes = document.getElementById('moduleOptionsCheckboxes');

    if (laserheadCheckboxes) {
        laserheadCheckboxes.innerHTML = ATTRIBUTE_ORDER_NAMES.map(attrName => `
            <div>
                <input type="checkbox" 
                       id="attr_${attrName}" 
                       ${window.displayAttributes.includes(attrName) ? 'checked' : ''}>
                <label for="attr_${attrName}">${attrName}</label>
            </div>
        `).join('');

        const checkboxes = laserheadCheckboxes.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const checked = Array.from(checkboxes)
                    .filter(cb => cb.checked)
                    .map(cb => cb.id.replace('attr_', ''));
                window.displayAttributes = checked;
                saveDisplayAttributes(checked);
                renderSelectedLaserheads();
            });
        });
    }

    if (moduleCheckboxes) {
        moduleCheckboxes.innerHTML = MODULE_ATTRIBUTE_ORDER.map(attrName => `
            <div>
                <input type="checkbox" 
                       id="mod_${attrName}" 
                       ${window.moduleDisplayAttributes.has(attrName) ? 'checked' : ''}>
                <label for="mod_${attrName}">${attrName}</label>
            </div>
        `).join('');

        const checkboxes = moduleCheckboxes.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const checked = new Set(
                    Array.from(checkboxes)
                        .filter(cb => cb.checked)
                        .map(cb => cb.id.replace('mod_', ''))
                );
                window.moduleDisplayAttributes = checked;
                saveModuleDisplayAttributes(checked);
                renderSelectedLaserheads();
            });
        });
    }
}

function setupModuleModal() {
    const modal = document.getElementById("moduleModal");
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

function setupModuleTypeFilters() {
    document.querySelectorAll(".moduleTypeFilter").forEach(btn => {
        const type = btn.dataset.type;
        
        if (activeModuleTypes.has(type)) {
            btn.classList.add("active");
        }
        
        btn.addEventListener("click", () => {
            if(activeModuleTypes.has(type)) {
                activeModuleTypes.delete(type);
                btn.classList.remove("active");
            } else {
                activeModuleTypes.add(type);
                btn.classList.add("active");
            }
            
            // Show/hide tier filters based on whether passive is selected
            const tierFilterContainer = document.getElementById('tierFilterButtons');
            if (tierFilterContainer) {
                tierFilterContainer.style.display = activeModuleTypes.has('passive') ? 'flex' : 'none';
            }
            
            saveActiveModuleTypes(activeModuleTypes);
            renderModuleCards();
        });
    });
}

function setupTierFilters() {
    document.querySelectorAll(".tierFilter").forEach(btn => {
        const tier = parseInt(btn.dataset.tier);
        
        if (activeTiers.has(tier)) {
            btn.classList.add("active");
        }
        
        btn.addEventListener("click", () => {
            if(activeTiers.has(tier)) {
                activeTiers.delete(tier);
                btn.classList.remove("active");
            } else {
                activeTiers.add(tier);
                btn.classList.add("active");
            }
            saveActiveTiers(activeTiers);
            renderModuleCards();
        });
    });
}

export function renderModuleCards() {
    const container = document.getElementById('moduleCards');
    container.innerHTML = '';
    
    // Show/hide tier filters based on current selection
    const tierFilterContainer = document.getElementById('tierFilterButtons');
    if (tierFilterContainer) {
        tierFilterContainer.style.display = activeModuleTypes.has('passive') ? 'flex' : 'none';
    }
    
    // Filter modules based on active/passive and tier selection
    const filteredModules = miningData.modules.filter(module => {
        const isActive = isActiveModule(module);
        const moduleType = isActive ? "active" : "passive";
        
        // Check if module type matches filter
        if (!activeModuleTypes.has(moduleType)) {
            return false;
        }
        
        // For passive modules, also check tier
        if (!isActive) {
            const tierAttr = module.attributes.find(attr => attr.attribute_name === 'Tier');
            if (tierAttr) {
                const tier = parseInt(tierAttr.value);
                if (!activeTiers.has(tier)) {
                    return false;
                }
            }
        }
        
        return true;
    });
    
    filteredModules.forEach(module => {
        const card = document.createElement('div');
        card.className = 'laser-card';  // Use same styling as laser cards
        card.dataset.id = module.id;
        
        // Generate card HTML
        card.innerHTML = buildModuleCardHTML(module);
        
        // Add click handler
        card.addEventListener('click', () => {
            selectModule(card.dataset.id);
        });
        
        container.appendChild(card);
    });
}

function buildModuleCardHTML(module) {
    return generateModuleCardHTML(module, MODULE_DISPLAY_ATTRIBUTES);
}

function selectModule(id) {
    const module = miningData.modules.find(m => m.id === parseInt(id));
    
    // Close modal first
    const modal = document.getElementById("moduleModal");
    if (modal) {
        modal.classList.add('hidden');
    }
    
    if (!module) return;

    // Add module to the selected laserhead's modules
    if (typeof currentLaserheadIndex === 'number' && typeof currentModuleSlot === 'number') {
        const laserhead = selectedLaserheads[currentLaserheadIndex];
        if (laserhead) {
            const previousModule = laserhead.modules?.[currentModuleSlot] || null;

            // Ensure modules array exists
            if (!Array.isArray(laserhead.modules)) {
                laserhead.modules = [];
            }
            
            // Ensure array is large enough to hold this slot
            while (laserhead.modules.length <= currentModuleSlot) {
                laserhead.modules.push(null);
            }

            const nextModule = { ...module };

            // Keep on/off state when replacing one active module with another.
            if (isActiveModule(nextModule) && previousModule && isActiveModule(previousModule)) {
                nextModule.isActive = previousModule.isActive !== false;
            } else if (isActiveModule(nextModule)) {
                // New active modules default to on.
                nextModule.isActive = true;
            }

            laserhead.modules[currentModuleSlot] = nextModule;
            renderSelectedLaserheads();
            saveLaserSetup(selectedLaserheads);
        }
    }
}