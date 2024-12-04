class WordPressManager {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.consoleOutput = document.getElementById("output");
    this.init();
  }


  init() {
    this.setupTabNavigation();
    this.setupFormSubmission();
    this.setupActionHandlers();
  }


  updateConsole(message, isError = false) {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = isError ? "❌ ERROR:" : "✓";
    this.consoleOutput.innerHTML += `\n[${timestamp}] ${prefix} ${
      typeof message === "object" ? JSON.stringify(message, null, 2) : message
    }`;
    this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
  }

  setupTabNavigation() {
    const tabs = document.querySelectorAll(".tab-button");
    const sections = {
      template: document.getElementById("template-section"),
      actions: document.getElementById("actions-section"),
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        const targetSection = tab.dataset.tab;
        Object.entries(sections).forEach(([key, section]) => {
          section.classList.toggle("active", key === targetSection);
        });
      });
    });
  }

  setupFormSubmission() {
    document
      .getElementById("create-template-form")
      .addEventListener("submit", async (event) => {
        event.preventDefault();

        const languageDropdown = document.getElementById("languageDropdown");
        const wpVersionDropdown = document.getElementById("wp-version-Dropdown");

        const formData = {
          dirname: document.getElementById("dirname").value,
          username: document.getElementById("username").value,
          email: document.getElementById("email").value,
          wp_psswd: document.getElementById("wpPassword").value,
          wp_port: document.getElementById("wpPort").value,
          wp_host: document.getElementById("wpHost").value,
          wp_project_name: document.getElementById("wpProjectName").value,
          mysql_root_psswd: document.getElementById("mysqlRootPassword").value,
          mysql_user: document.getElementById("mysqlUser").value,
          mysql_psswd: document.getElementById("mysqlPassword").value,
          mysql_port: document.getElementById("mysqlPort").value,
          name_api_key: "exemple",
          rules: "exemple",
          addons: JSON.parse(document.getElementById("addons").value),
          language: languageDropdown.options[languageDropdown.selectedIndex].value,
          wp_version: wpVersionDropdown.options[wpVersionDropdown.selectedIndex]?.value || "latest", 
        };

        try {
          this.updateConsole("Creating template...");

          const response = await fetch(`${this.apiUrl}/build/template`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          });
          const result = await response.json();
          console.log(result)
          if (!response.ok) { // vérifie si le status n'est pas dans la plage 200-299
            this.updateConsole(result.message, true);
            return;
        }
        
        this.updateConsole(result.message, false);
        } catch (error) {
          console.log(error.message)
          const errorMessage = error.message === 'Load failed' 
          ? 'Unable to reach server' 
          : error.message || 'An unexpected error occurred';
          this.updateConsole(errorMessage, true);
        }
      });
  }

  setupActionHandlers() {
    const actions = ["start", "stop", "remove"];
    actions.forEach((action) => {
      document
        .getElementById(`${action}-container`)
        .addEventListener("click", () => this.handleContainerAction(action));
      document
        .getElementById(`${action}-compose`)
        .addEventListener("click", () => this.handleComposeAction(action));
    });

    document
      .getElementById("build-app")
      .addEventListener("click", () => this.buildApp());
    document
      .getElementById("get-containers")
      .addEventListener("click", () => this.getContainers());
    document
      .getElementById("get-images")
      .addEventListener("click", () => this.getImages());
    document
      .getElementById("reset-project")
      .addEventListener("click", () => this.resetProject());
  }

  async handleContainerAction(action) {
    const containerId = document.getElementById("container-id").value;
    if (!containerId) {
      this.updateConsole("Container ID is required", true);
      return;
    }
    try {
      this.updateConsole(`${action} container ${containerId}...`);
      const response = await fetch(
        `${this.apiUrl}/containers/${containerId}/${action}`,
        {
          method: "POST",
        }
      );
      const result = await response.json();
      this.updateConsole(result);
    } catch (error) {
      this.updateConsole(error.message, true);
    }
  }

  async handleComposeAction(action) {
    const appName = document.getElementById("compose-app-name").value;
    const endpoint =
      action === "remove"
        ? `containers/${appName}/remove-all?delete_project=${
            document.getElementById("delete-project").checked
          }`
        : `docker-compose/${appName}/${action === "start" ? "up" : "down"}`;

    try {
      this.updateConsole(`${action} compose for ${appName}...`);
      const response = await fetch(`${this.apiUrl}/${endpoint}`, {
        method: "POST",
      });
      const result = await response.json();
      this.updateConsole(result.message);
    } catch (error) {
      this.updateConsole(error.message, true);
    }
  }

  async buildApp() {
    const appName = document.getElementById("compose-app-name-build").value;
    try {
      this.updateConsole(`Building app ${appName}...`);
      const response = await fetch(
        `${this.apiUrl}/build/build-app?appName=${appName}`
      );
      const result = await response.json();
      this.updateConsole(result.message);
    } catch (error) {
      this.updateConsole(error.message, true);
    }
  }

  async getContainers() {
    try {
      this.updateConsole("Fetching containers...");
      const response = await fetch(`${this.apiUrl}/containers`);
      const result = await response.json();
      this.updateConsole(result);
    } catch (error) {
      this.updateConsole(error.message, true);
    }
  }

  async getImages() {
    try {
      this.updateConsole("Fetching images...");
      const response = await fetch(`${this.apiUrl}/images`);
      const result = await response.json();
      this.updateConsole(result.message);
    } catch (error) {
      this.updateConsole(error.message, true);
    }
  }

  async resetProject() {
    const appName = document.getElementById("compose-app-name").value;
    try {
      this.updateConsole(`Resetting project ${appName}...`);
      const response = await fetch(
        `${this.apiUrl}/containers/${appName}/remove-all?delete_project=true`,
        { method: "POST" }
      );
      const result = await response.json();
      this.updateConsole(result.message);

      this.updateConsole("Waiting for cleanup...");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      this.updateConsole("Recreating template...");
      document
        .getElementById("create-template-form")
        .dispatchEvent(new Event("submit"));

      this.updateConsole("Rebuilding application...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      document.getElementById("build-app").click();
    } catch (error) {
      this.updateConsole(error.message, true);
    }
  }
}


document.addEventListener("DOMContentLoaded", () => { new WordPressManager("http://dalency-io:8002") });
