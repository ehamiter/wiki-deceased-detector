// Options page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const elements = {
        textColor: document.getElementById('textColor'),
        fontWeight: document.getElementById('fontWeight'),
        textDecoration: document.getElementById('textDecoration'),
        opacity: document.getElementById('opacity'),
        opacityValue: document.getElementById('opacityValue'),
        backgroundColor: document.getElementById('backgroundColor'),
        useBackground: document.getElementById('useBackground'),
        customCSS: document.getElementById('customCSS'),
        previewLink: document.getElementById('previewLink'),
        saveBtn: document.getElementById('saveBtn'),
        resetBtn: document.getElementById('resetBtn')
    };

    // Default settings
    const defaults = {
        textColor: '#555555',
        fontWeight: 'bold',
        textDecoration: 'dotted underline',
        opacity: 0.7,
        backgroundColor: '#ffffff',
        useBackground: false,
        customCSS: ''
    };

    // Load saved settings
    function loadSettings() {
        chrome.storage.sync.get(defaults, function(settings) {
            elements.textColor.value = settings.textColor;
            elements.fontWeight.value = settings.fontWeight;
            elements.textDecoration.value = settings.textDecoration;
            elements.opacity.value = settings.opacity;
            elements.opacityValue.textContent = settings.opacity;
            elements.backgroundColor.value = settings.backgroundColor;
            elements.useBackground.checked = settings.useBackground;
            elements.customCSS.value = settings.customCSS;
            
            updatePreview();
        });
    }

    // Save settings
    function saveSettings() {
        const settings = {
            textColor: elements.textColor.value,
            fontWeight: elements.fontWeight.value,
            textDecoration: elements.textDecoration.value,
            opacity: parseFloat(elements.opacity.value),
            backgroundColor: elements.backgroundColor.value,
            useBackground: elements.useBackground.checked,
            customCSS: elements.customCSS.value
        };

        chrome.storage.sync.set(settings, function() {
            // Show save confirmation
            const originalText = elements.saveBtn.textContent;
            elements.saveBtn.textContent = 'Saved!';
            elements.saveBtn.style.background = '#28a745';
            
            setTimeout(function() {
                elements.saveBtn.textContent = originalText;
                elements.saveBtn.style.background = '#007cba';
            }, 1500);
            
            updatePreview();
        });
    }

    // Reset to defaults
    function resetSettings() {
        if (confirm('Reset all settings to defaults?')) {
            chrome.storage.sync.set(defaults, function() {
                loadSettings();
            });
        }
    }

    // Update preview link
    function updatePreview() {
        const styles = {
            color: elements.textColor.value,
            fontWeight: elements.fontWeight.value,
            textDecoration: elements.textDecoration.value,
            opacity: elements.opacity.value
        };

        if (elements.useBackground.checked) {
            styles.backgroundColor = elements.backgroundColor.value;
            styles.padding = '2px 4px';
            styles.borderRadius = '2px';
        } else {
            styles.backgroundColor = 'transparent';
            styles.padding = '0';
            styles.borderRadius = '0';
        }

        // Apply custom CSS
        let customStyles = {};
        if (elements.customCSS.value.trim()) {
            try {
                // Parse custom CSS properties
                const customProps = elements.customCSS.value.split(';');
                customProps.forEach(prop => {
                    if (prop.trim()) {
                        const [property, value] = prop.split(':').map(s => s.trim());
                        if (property && value) {
                            // Convert kebab-case to camelCase
                            const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                            customStyles[camelProperty] = value;
                        }
                    }
                });
            } catch (e) {
                console.warn('Error parsing custom CSS:', e);
            }
        }

        // Apply all styles to preview link
        Object.assign(elements.previewLink.style, styles, customStyles);
    }

    // Event listeners
    elements.opacity.addEventListener('input', function() {
        elements.opacityValue.textContent = this.value;
        updatePreview();
    });

    // Update preview on any change
    ['textColor', 'fontWeight', 'textDecoration', 'backgroundColor', 'customCSS'].forEach(id => {
        elements[id].addEventListener('input', updatePreview);
    });
    
    elements.useBackground.addEventListener('change', updatePreview);

    // Button events
    elements.saveBtn.addEventListener('click', saveSettings);
    elements.resetBtn.addEventListener('click', resetSettings);

    // Initialize
    loadSettings();
});
