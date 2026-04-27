// Pure HTML generation functions - no DOM manipulation or calculations
import { cleanLaserName, getUnit, MODULE_ATTRIBUTE_ORDER } from './data-manager.js';
import { roundAndFormatValue } from './calculations.js';

/**
 * Generate HTML for laserhead card in selection modal
 * @param {Object} laserhead - Laserhead object
 * @param {Array} sortedAttrs - Sorted attribute array
 * @returns {string} - HTML string
 */
export function generateLaserheadCardHTML(laserhead, sortedAttrs) {
    const rows = sortedAttrs.map(attr => `
        <tr>
            <td class="attr-name">${attr.name}</td>
            ${attr.value}
        </tr>
    `).join('');

    return `
        <div class="card-header">
            <div class="size">S${laserhead.size || 1}</div>
            <div class="name">${cleanLaserName(laserhead.name)}</div>
        </div>
        <table class="attributes-table">
            <tbody>${rows}</tbody>
        </table>
    `;
}

/**
 * Generate HTML for module card in selection modal
 * @param {Object} module - Module object
 * @param {Array} visibleAttributes - Array of attribute names to display
 * @returns {string} - HTML string
 */
export function generateModuleCardHTML(module, visibleAttributes) {
    const moduleAttrs = MODULE_ATTRIBUTE_ORDER
        .filter(attrName => visibleAttributes.has(attrName))
        .map(attrName => {
            const attr = module.attributes?.find(a => a.attribute_name === attrName);
            if (!attr?.value || attr.value.trim() === '' || attr.value === '0') return '';
            
            let value = attr.value;
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                value = roundAndFormatValue(numValue);
            }
            
            const unit = getUnit(attr) || attr.unit || '';
            return `<tr>
                <td class="attr-name">${attrName}</td>
                <td class="value-number">${value}</td>
                <td class="value-unit">${unit}</td>
            </tr>`;
        })
        .filter(row => row !== '')
        .join('');

    return `
        <div class="card-header">
            <div class="name">${module.name}</div>
        </div>
        <table class="attributes-table">
            <tbody>${moduleAttrs}</tbody>
        </table>
    `;
}

/**
 * Generate HTML for selected laserhead attribute row
 * @param {string} attrName - Attribute name
 * @param {Object|null} attr - Attribute object or null if not present
 * @returns {string} - HTML string
 */
export function generateAttributeRow(attrName, attr) {
    if (attr) {
        return `
            <tr>
                <td>${attr.name}</td>
                ${attr.value}
            </tr>
        `;
    } else {
        return `
            <tr>
                <td>${attrName}</td>
                <td class="value-number">-</td>
                <td class="value-unit"></td>
            </tr>
        `;
    }
}

/**
 * Generate HTML for a filled module slot
 * @param {Object} module - Module object
 * @param {Array} moduleAttrs - Pre-formatted module attributes HTML
 * @param {number} laserheadIdx - Index of the laserhead
 * @param {number} slotIdx - Index of the slot
 * @param {boolean} isActive - Whether module is active type
 * @returns {string} - HTML string
 */
export function generateFilledModuleSlotHTML(module, moduleAttrs, laserheadIdx, slotIdx, isActive) {
    const hasVisibleAttrs = moduleAttrs !== '';
    
    return `
        <div class="module-slot filled">
            <div class="module-header">
                <div class="module-slot-info">
                    <span class="module-name ${module.isActive === false ? 'inactive' : ''} ${isActive ? 'clickable' : ''}" 
                          ${isActive ? `onclick="toggleModule(${laserheadIdx}, ${slotIdx})"` : ''}>
                        ${module.name || ''}
                    </span>
                </div>
                <div class="module-actions">
                    <button onclick="showModuleSelection(${laserheadIdx}, ${slotIdx})" class="replace-btn">Replace</button>
                    <button onclick="removeModule(${laserheadIdx}, ${slotIdx})" class="remove-btn">×</button>
                </div>
            </div>
            ${hasVisibleAttrs ? `
                <table class="module-table ${module.isActive === false ? 'inactive' : ''}">
                    <tbody>${moduleAttrs}</tbody>
                </table>
            ` : `
                <div class="no-attributes">
                    No visible attributes with this filter
                </div>
            `}
        </div>
    `;
}

/**
 * Generate HTML for an empty module slot
 * @param {number} laserheadIdx - Index of the laserhead
 * @param {number} slotIdx - Index of the slot
 * @returns {string} - HTML string
 */
export function generateEmptyModuleSlotHTML(laserheadIdx, slotIdx) {
    return `
        <div class="module-slot empty">
            <div class="module-header">
                <button onclick="showModuleSelection(${laserheadIdx}, ${slotIdx})" class="add-module-btn">Add Module</button>
            </div>
        </div>
    `;
}

/**
 * Generate module attribute rows for display in selected laserhead
 * @param {Object} module - Module object
 * @param {Set} visibleAttributes - Set of visible attribute names
 * @returns {string} - HTML string
 */
export function generateModuleAttributeRows(module, visibleAttributes) {
    return MODULE_ATTRIBUTE_ORDER
        .filter(attrName => visibleAttributes.has(attrName))
        .map(attrName => {
            const attr = module.attributes?.find(a => a.attribute_name === attrName);
            if (!attr?.value || attr.value.trim() === '' || attr.value === '0') return '';
            
            let value = attr.value;
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                value = roundAndFormatValue(numValue);
            }
            
            const unit = attr.unit || '';
            const inactiveClass = module.isActive === false ? 'inactive-value' : '';
            
            return `<tr class="${inactiveClass}">
                <td>${attrName}</td>
                <td class="value-number">${value}</td>
                <td class="value-unit">${unit}</td>
            </tr>`;
        })
        .filter(row => row !== '')
        .join('');
}

/**
 * Generate complete HTML for selected laserhead card
 * @param {Object} laserhead - Laserhead object
 * @param {number} idx - Index of the laserhead
 * @param {string} attributeRowsHTML - Pre-generated attribute rows HTML
 * @param {string} moduleSectionHTML - Pre-generated module section HTML
 * @returns {string} - HTML string
 */
export function generateSelectedLaserheadHTML(laserhead, idx, attributeRowsHTML, moduleSectionHTML) {
    return `
        <div class="selected-laserhead ${laserhead.isEnabled === false ? 'laserhead-disabled' : ''}">
            <div class="laserhead-info">
                <div class="size">S${laserhead.size || 1}</div>
                <div class="group-field">
                    <label>G</label>
                    <input type="text" class="group-input" data-laser-idx="${idx}" 
                           value="${Array.isArray(laserhead.group) ? laserhead.group.join(',') : (laserhead.group || '')}" placeholder="-">
                </div>
                <div class="laserhead-enabled-field">
                    <label for="laserEnabled_${idx}">On</label>
                    <input type="checkbox" id="laserEnabled_${idx}" class="laserhead-enabled-input" data-laser-idx="${idx}" ${laserhead.isEnabled === false ? '' : 'checked'}>
                </div>
                <div class="name" contenteditable="true" 
                     data-original-name="${laserhead.customName || cleanLaserName(laserhead.name)}">
                    ${laserhead.customName || cleanLaserName(laserhead.name)}
                </div>
                <button onclick="replaceLaserhead(${idx})" class="replace-btn">Replace</button>
                <button onclick="removeLaserhead(${idx})" class="remove-btn">×</button>
            </div>
            <table class="laserhead-table">
                <tbody>${attributeRowsHTML}</tbody>
            </table>
            ${moduleSectionHTML}
        </div>
    `;
}
