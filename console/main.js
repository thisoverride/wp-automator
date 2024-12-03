const apiUrl = 'http://localhost:8002';
const consoleOutput = document.getElementById('output');

const updateConsole = (message, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = isError ? '❌ ERROR:' : '✓';
    consoleOutput.innerHTML += `\n[${timestamp}] ${prefix} ${typeof message === 'object' ? JSON.stringify(message, null, 2) : message}`;
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
};


const tabs = document.querySelectorAll('.tab-button');
const sections = {
    'template': document.getElementById('template-section'),
    'actions': document.getElementById('actions-section')
};

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const targetSection = tab.dataset.tab;
        Object.entries(sections).forEach(([key, section]) => {
            section.classList.toggle('active', key === targetSection);
        });
    });
});


fetch('./language.json')
    .then(response => response.json())
    .then(data => {
        const dropdown = document.getElementById('languageDropdown');
        data.forEach(({ code, language }) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = language;
            option.selected = code === 'fr_FR';
            dropdown.appendChild(option);
        });
    })
    .catch(error => updateConsole('Error loading languages: ' + error.message, true));

document.getElementById('create-template-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const dropdown = document.getElementById('languageDropdown');
    const formData = {
        dirname: document.getElementById('dirname').value,
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        wp_psswd: document.getElementById('wpPassword').value,
        wp_port: document.getElementById('wpPort').value,
        wp_host: document.getElementById('wpHost').value,
        wp_project_name: document.getElementById('wpProjectName').value,
        mysql_root_psswd: document.getElementById('mysqlRootPassword').value,
        mysql_user: document.getElementById('mysqlUser').value,
        mysql_psswd: document.getElementById('mysqlPassword').value,
        mysql_port: document.getElementById('mysqlPort').value,
        name_api_key: 'exemple',
        rules: 'exemple',
        addons: JSON.parse(document.getElementById('addons').value),
        language: dropdown.options[dropdown.selectedIndex].value
    };

    try {
        updateConsole('Creating template...');
        const response = await fetch(`${apiUrl}/build/template`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const result = await response.json();
        updateConsole(result);
    } catch (error) {
        updateConsole(error.message, true);
    }
});

async function handleContainerAction(action) {
    const containerId = document.getElementById('container-id').value;
    if (!containerId) {
        updateConsole('Container ID is required', true);
        return;
    }
    try {
        updateConsole(`${action} container ${containerId}...`);
        const response = await fetch(`${apiUrl}/containers/${containerId}/${action}`, {
            method: 'POST'
        });
        const result = await response.json();
        updateConsole(result);
    } catch (error) {
        updateConsole(error.message, true);
    }
}

document.getElementById('start-container').addEventListener('click', () => handleContainerAction('start'));
document.getElementById('stop-container').addEventListener('click', () => handleContainerAction('stop'));
document.getElementById('remove-container').addEventListener('click', () => handleContainerAction('remove'));

document.getElementById('build-app').addEventListener('click', async () => {
    const appName = document.getElementById('compose-app-name-build').value;
    try {
        updateConsole(`Building app ${appName}...`);
        const response = await fetch(`${apiUrl}/build/build-app?appName=${appName}`);
        const result = await response.json();
        updateConsole(result);
    } catch (error) {
        updateConsole(error.message, true);
    }
});

document.getElementById('get-containers').addEventListener('click', async () => {
    try {
        updateConsole('Fetching containers...');
        const response = await fetch(`${apiUrl}/containers`);
        const result = await response.json();
        updateConsole(result);
    } catch (error) {
        updateConsole(error.message, true);
    }
});

document.getElementById('get-images').addEventListener('click', async () => {
    try {
        updateConsole('Fetching images...');
        const response = await fetch(`${apiUrl}/images`);
        const result = await response.json();
        updateConsole(result);
    } catch (error) {
        updateConsole(error.message, true);
    }
});

async function handleComposeAction(action) {
    const appName = document.getElementById('compose-app-name').value;
    const endpoint = action === 'remove' 
        ? `containers/${appName}/remove-all?delete_project=${document.getElementById('delete-project').checked}`
        : `docker-compose/${appName}/${action === 'start' ? 'up' : 'down'}`;

    try {
        updateConsole(`${action} compose for ${appName}...`);
        const response = await fetch(`${apiUrl}/${endpoint}`, {
            method: 'POST'
        });
        const result = await response.json();
        updateConsole(result);
    } catch (error) {
        updateConsole(error.message, true);
    }
}

document.getElementById('start-compose').addEventListener('click', () => handleComposeAction('start'));
document.getElementById('stop-compose').addEventListener('click', () => handleComposeAction('stop'));
document.getElementById('remove-compose').addEventListener('click', () => handleComposeAction('remove'));

document.getElementById('reset-project').addEventListener('click', async () => {
    const appName = document.getElementById('compose-app-name').value;
    try {
        updateConsole(`Resetting project ${appName}...`);
        let response = await fetch(`${apiUrl}/containers/${appName}/remove-all?delete_project=true`, {
            method: 'POST'
        });
        let result = await response.json();
        updateConsole(result);
        
        updateConsole('Waiting for cleanup...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        updateConsole('Recreating template...');
        document.getElementById('create-template-form').dispatchEvent(new Event('submit'));
        
        updateConsole('Rebuilding application...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        document.getElementById('build-app').click();
        
    } catch (error) {
        updateConsole(error.message, true);
    }
});