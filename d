// Update selected plugins count
        selectedCount.textContent = selectedPlugins.length;
            
        // Update hidden input with selected plugins data
        addonsInput.value = JSON.stringify(
            selectedPlugins.map(({slug, name}) => ({slug, name}))
        );
    }

    // Update pagination
    function updatePagination() {
        const totalPages = Math.ceil(totalPlugins / ITEMS_PER_PAGE);
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <button class="pagination-btn" 
                    onclick="changePage(${currentPage - 1})" 
                    ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                paginationHTML += `
                    <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                            onclick="changePage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                paginationHTML += `
                    <button class="pagination-btn" disabled>...</button>
                `;
            }
        }

        // Next button
        paginationHTML += `
            <button class="pagination-btn" 
                    onclick="changePage(${currentPage + 1})" 
                    ${currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        pagination.style.display = totalPages > 1 ? 'flex' : 'none';
        pagination.innerHTML = paginationHTML;
    }

    // Change page
    function changePage(page) {
        currentPage = page;
        displaySearchResults();
        window.scrollTo({
            top: pluginsGrid.offsetTop - 20,
            behavior: 'smooth'
        });
    }

    // Utility functions
    function showLoading(show) {
        loadingSpinner.style.display = show ? 'flex' : 'none';
    }

    function showError(message) {
        errorMessage.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            ${message}
        `;
        errorMessage.style.display = 'flex';
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    function formatNumber(num) {
        if (!num) return '0';
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    }

    function formatLastUpdated(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 1) return 'Today';
        if (diffDays < 2) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}m ago`;
        return `${Math.floor(diffDays / 365)}y ago`;
    }

    // Keyboard navigation
    document.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft' && currentPage > 1) {
            changePage(currentPage - 1);
        } else if (e.key === 'ArrowRight' && currentPage < Math.ceil(totalPlugins / ITEMS_PER_PAGE)) {
            changePage(currentPage + 1);
        }
    });

    // Load plugins from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const initialSearch = urlParams.get('plugin-search');
    if (initialSearch) {
        searchInput.value = initialSearch;
        searchPlugins(initialSearch);
    }
    </script>
</body>
</html>