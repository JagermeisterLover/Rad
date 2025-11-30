/**
 * Tab Management System (Simplified - No Folders)
 * Handles filesystem-based tabs with autosave and context menus
 */

const TabManager = {
    tabs: [],
    activeTabId: null,
    selectedItems: new Set(),
    autosaveTimeout: null,

    async init() {
        await window.electronAPI.ensureDir();
        await this.loadAllTabs();
        this.renderSidebar();
        this.setupEventListeners();

        // Create default tab if none exist
        if (this.tabs.length === 0) {
            await this.createTab('Default Table');
        } else {
            // Switch to first tab
            this.switchToTab(this.tabs[0].id);
        }
    },

    async loadAllTabs() {
        const loadedTabs = await window.electronAPI.listTabs();
        this.tabs = loadedTabs.filter(tab => tab && tab.id);
        // Sort by created date
        this.tabs.sort((a, b) => new Date(a.created) - new Date(b.created));
    },

    async createTab(name = null, data = null) {
        const timestamp = Date.now();
        const tabId = `tab-${timestamp}`;
        const defaultName = window.I18n ? window.I18n.t('sidebar.newTable') : 'New Table';
        const tabName = name || `${defaultName} ${this.tabs.length + 1}`;

        const tab = {
            id: tabId,
            name: tabName,
            wavelength: data?.wavelength || 550,
            surfaces: data?.surfaces || [],
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };

        this.tabs.push(tab);
        await this.saveTab(tab);
        this.renderSidebar();
        this.switchToTab(tabId);

        return tabId;
    },

    async deleteTab(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) {
            console.error('Tab not found for deletion:', tabId);
            return;
        }

        console.log('Attempting to delete tab:', tabId, 'Total tabs:', this.tabs.length);

        // Remove from tabs array
        const index = this.tabs.findIndex(t => t.id === tabId);
        this.tabs.splice(index, 1);

        // Delete file
        await window.electronAPI.deleteTab(tabId);

        // If there are remaining tabs, switch to another one
        if (this.tabs.length > 0) {
            if (this.activeTabId === tabId) {
                const newActiveTab = this.tabs[Math.max(0, index - 1)];
                this.switchToTab(newActiveTab.id);
            }
        } else {
            // No tabs left - create a new empty one
            const defaultName = window.I18n ? window.I18n.t('sidebar.newTable') : 'Default Table';
            await this.createTab(defaultName);
        }

        this.renderSidebar();
        console.log('Tab deleted successfully. Remaining tabs:', this.tabs.length);
    },

    async deleteMultiple() {
        const items = Array.from(this.selectedItems);
        if (items.length === 0) return;

        const tabsToDelete = items.filter(id => id.startsWith('tab-'));

        if (this.tabs.length - tabsToDelete.length < 1) {
            const msg = window.I18n ? window.I18n.t('status.cannotDeleteAll') : 'Cannot delete all tables. At least one must remain.';
            alert(msg);
            return;
        }

        const confirmMsg = window.I18n ? window.I18n.t('status.confirmDelete', { count: items.length }) : `Delete ${items.length} table(s)?`;
        if (!confirm(confirmMsg)) return;

        // Delete individual tabs
        for (const tabId of tabsToDelete) {
            const index = this.tabs.findIndex(t => t.id === tabId);
            if (index !== -1) {
                // Don't switch tabs during batch delete
                this.tabs.splice(index, 1);
                await window.electronAPI.deleteTab(tabId);
            }
        }

        // Switch to remaining tab
        if (this.tabs.length > 0) {
            this.switchToTab(this.tabs[0].id);
        }

        this.selectedItems.clear();
        this.renderSidebar();
    },

    async renameTab(tabId, newName) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;

        tab.name = newName;
        tab.modified = new Date().toISOString();
        await this.saveTab(tab);
        this.renderSidebar();
    },

    switchToTab(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;

        // Save current tab before switching
        if (this.activeTabId && this.activeTabId !== tabId) {
            this.saveCurrentTab();
        }

        this.activeTabId = tabId;

        // Update UI
        if (window.loadTableData) {
            window.wavelength = tab.wavelength;
            document.getElementById('wavelength').value = tab.wavelength;
            window.loadTableData(tab.surfaces);
        }

        this.renderSidebar();
    },

    saveCurrentTab() {
        const tab = this.tabs.find(t => t.id === this.activeTabId);
        if (!tab || !window.collectTableData) return;

        tab.wavelength = window.wavelength;
        tab.surfaces = window.collectTableData();
        tab.modified = new Date().toISOString();

        // Debounced autosave
        clearTimeout(this.autosaveTimeout);
        this.autosaveTimeout = setTimeout(() => {
            this.saveTab(tab);
        }, 1000);
    },

    async saveTab(tab) {
        await window.electronAPI.saveTab(tab.id, tab);
    },

    // Selection
    toggleSelection(itemId, multiSelect = false) {
        if (multiSelect) {
            if (this.selectedItems.has(itemId)) {
                this.selectedItems.delete(itemId);
            } else {
                this.selectedItems.add(itemId);
            }
        } else {
            this.selectedItems.clear();
            this.selectedItems.add(itemId);
        }
        this.renderSidebar();
    },

    // Context menu
    showContextMenu(event, itemId) {
        event.preventDefault();
        event.stopPropagation();

        const menu = document.getElementById('contextMenu');
        const items = [];

        const t = (key, params) => window.I18n ? window.I18n.t(key, params) : key;

        items.push({ label: t('contextMenu.rename'), action: () => this.promptRename(itemId) });
        items.push({ label: t('contextMenu.duplicate'), action: () => this.duplicateTab(itemId) });
        items.push({ separator: true });
        items.push({ label: t('contextMenu.delete'), action: () => this.deleteTab(itemId), danger: true });

        if (this.selectedItems.size > 1 && this.selectedItems.has(itemId)) {
            items.push({ label: t('contextMenu.deleteMultiple', { count: this.selectedItems.size }), action: () => this.deleteMultiple(), danger: true });
        }

        this.renderContextMenu(menu, items, event.pageX, event.pageY);
    },

    renderContextMenu(menu, items, x, y) {
        menu.innerHTML = items.map(item => {
            if (item.separator) {
                return '<div class="context-menu-separator"></div>';
            }
            const dangerClass = item.danger ? 'danger' : '';
            return `<div class="context-menu-item ${dangerClass}">${item.label}</div>`;
        }).join('');

        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.display = 'block';

        // Add click handlers
        const itemElements = menu.querySelectorAll('.context-menu-item');
        const actionItems = items.filter(i => !i.separator);
        itemElements.forEach((el, idx) => {
            el.onclick = () => {
                const item = actionItems[idx];
                if (item && item.action) {
                    item.action();
                }
                menu.style.display = 'none';
            };
        });

        // Close on click outside
        setTimeout(() => {
            document.addEventListener('click', () => {
                menu.style.display = 'none';
            }, { once: true });
        }, 0);
    },

    promptRename(itemId) {
        const tab = this.tabs.find(t => t.id === itemId);
        if (!tab) {
            console.error('Tab not found:', itemId);
            return;
        }

        console.log('Prompting rename for:', tab.name);

        // Show custom modal
        const modal = document.getElementById('renameModal');
        const input = document.getElementById('renameInput');
        const confirmBtn = document.getElementById('renameConfirmBtn');
        const cancelBtn = document.getElementById('renameCancelBtn');

        // Set current name
        input.value = tab.name;
        modal.style.display = 'flex';

        // Focus and select text
        setTimeout(() => {
            input.focus();
            input.select();
        }, 100);

        // Handle confirm
        const handleConfirm = () => {
            const newName = input.value.trim();
            console.log('New name entered:', newName);

            if (newName && newName !== tab.name) {
                this.renameTab(itemId, newName);
            }

            modal.style.display = 'none';
            cleanup();
        };

        // Handle cancel
        const handleCancel = () => {
            modal.style.display = 'none';
            cleanup();
        };

        // Handle Enter key
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        };

        // Cleanup event listeners
        const cleanup = () => {
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            input.removeEventListener('keydown', handleKeyDown);
            modal.removeEventListener('click', handleOverlayClick);
        };

        // Handle clicking outside modal
        const handleOverlayClick = (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        };

        // Add event listeners
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        input.addEventListener('keydown', handleKeyDown);
        modal.addEventListener('click', handleOverlayClick);
    },

    async duplicateTab(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;

        await this.createTab(`${tab.name} (Copy)`, {
            wavelength: tab.wavelength,
            surfaces: JSON.parse(JSON.stringify(tab.surfaces))
        });
    },

    // Rendering
    renderSidebar() {
        const container = document.getElementById('tabsList');
        container.innerHTML = '';

        // Render all tabs
        this.tabs.forEach(tab => {
            this.renderTab(container, tab);
        });
    },

    renderTab(container, tab) {
        const isActive = tab.id === this.activeTabId;
        const isSelected = this.selectedItems.has(tab.id);

        const tabEl = document.createElement('div');
        tabEl.className = `tab-item ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`;
        tabEl.dataset.id = tab.id;

        const surfacesText = window.I18n ?
            `${tab.surfaces.length} ${window.I18n.t('status.surfacesLoaded', { count: tab.surfaces.length, plural: window.I18n.getPlural(tab.surfaces.length) }).split(' ')[1]}` :
            `${tab.surfaces.length} surfaces`;
        const deleteTitle = window.I18n ? window.I18n.t('table.delete') : 'Delete table';

        tabEl.innerHTML = `
            <div class="tab-info">
                <div class="tab-name">${tab.name}</div>
                <div class="tab-meta">${surfacesText}</div>
            </div>
            <button class="tab-close" title="${deleteTitle}">\u00d7</button>
        `;

        const tabInfo = tabEl.querySelector('.tab-info');
        const tabName = tabEl.querySelector('.tab-name');
        const closeBtn = tabEl.querySelector('.tab-close');

        // Single click to switch tabs
        tabInfo.onclick = (e) => {
            if (e.ctrlKey || e.metaKey) {
                this.toggleSelection(tab.id, true);
            } else {
                this.switchToTab(tab.id);
            }
        };

        // Double-click to rename
        tabName.ondblclick = (e) => {
            e.stopPropagation();
            this.promptRename(tab.id);
        };

        // Close button
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.deleteTab(tab.id);
        };

        // Right-click context menu
        tabEl.oncontextmenu = (e) => {
            if (!this.selectedItems.has(tab.id)) {
                this.selectedItems.clear();
                this.selectedItems.add(tab.id);
                this.renderSidebar();
            }
            this.showContextMenu(e, tab.id);
        };

        container.appendChild(tabEl);
    },

    setupEventListeners() {
        // New tab button
        document.getElementById('newTabBtn').onclick = () => {
            this.createTab();
        };

        // Autosave on data change
        const tableBody = document.getElementById('tableBody');
        if (tableBody) {
            tableBody.addEventListener('input', () => {
                this.saveCurrentTab();
            });
        }

        const wavelengthInput = document.getElementById('wavelength');
        if (wavelengthInput) {
            wavelengthInput.addEventListener('input', () => {
                this.saveCurrentTab();
            });
        }
    }
};
