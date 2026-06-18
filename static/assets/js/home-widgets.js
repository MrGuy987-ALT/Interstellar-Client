// Widget Management System
class WidgetManager {
  constructor() {
    this.widgets = [];
    this.enabledWidgets = new Set();
    this.loadConfiguration();
    this.initializeSortable();
  }

  loadConfiguration() {
    const saved = localStorage.getItem("enabledWidgets");
    if (saved) {
      this.enabledWidgets = new Set(JSON.parse(saved));
    } else {
      // Default enabled widgets
      this.enabledWidgets = new Set(["search", "quickLinks", "recentApps", "favorites"]);
      this.saveConfiguration();
    }
  }

  saveConfiguration() {
    localStorage.setItem("enabledWidgets", JSON.stringify(Array.from(this.enabledWidgets)));
    const widgetOrder = Array.from(document.querySelectorAll(".widget")).map(w => w.id);
    localStorage.setItem("widgetOrder", JSON.stringify(widgetOrder));
  }

  initializeSortable() {
    const container = document.querySelector(".widgets-container");
    if (!container) return;

    if (typeof Sortable !== "undefined") {
      Sortable.create(container, {
        handle: ".widget-title",
        animation: 150,
        ghostClass: "sortable-ghost",
        onChange: () => this.saveConfiguration(),
        onEnd: () => this.saveConfiguration(),
      });
    }
  }

  toggleWidget(widgetId) {
    if (this.enabledWidgets.has(widgetId)) {
      this.enabledWidgets.delete(widgetId);
    } else {
      this.enabledWidgets.add(widgetId);
    }
    this.saveConfiguration();
  }

  isWidgetEnabled(widgetId) {
    return this.enabledWidgets.has(widgetId);
  }

  renderWidgets() {
    const container = document.querySelector(".widgets-container");
    if (!container) return;

    // Clear existing widgets
    container.innerHTML = "";

    // Get saved widget order or use default
    const savedOrder = localStorage.getItem("widgetOrder");
    const order = savedOrder ? JSON.parse(savedOrder) : ["search", "quickLinks", "recentApps", "favorites"];

    // Render widgets in order
    for (const widgetId of order) {
      if (this.isWidgetEnabled(widgetId)) {
        const widget = this.createWidget(widgetId);
        if (widget) {
          container.appendChild(widget);
        }
      }
    }

    this.initializeSortable();
  }

  createWidget(widgetId) {
    switch (widgetId) {
      case "search":
        return this.createSearchWidget();
      case "quickLinks":
        return this.createQuickLinksWidget();
      case "recentApps":
        return this.createRecentAppsWidget();
      case "favorites":
        return this.createFavoritesWidget();
      case "stats":
        return this.createStatsWidget();
      default:
        return null;
    }
  }

  createSearchWidget() {
    const widget = document.createElement("div");
    widget.id = "search";
    widget.className = "widget search-widget";
    widget.innerHTML = `
      <div class="widget-header">
        <h3 class="widget-title"><i class="fa-solid fa-magnifying-glass widget-icon"></i>Search</h3>
        <div class="widget-controls">
          <button class="widget-btn" onclick="widgetManager.removeWidget('search')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="widget-content">
        <input type="text" id="widget-search-input" placeholder="Search the web..." />
        <div id="search-suggestions" style="display: none; margin-top: 10px;"></div>
      </div>
    `;

    widget.querySelector("#widget-search-input").addEventListener("keypress", e => {
      if (e.key === "Enter") {
        const value = e.target.value.trim();
        if (value) {
          const engine = localStorage.getItem("engine") || "https://search.brave.com/search?q=";
          const isUrl = /^http(s?):\/\//.test(value) || (value.includes(".") && !value.startsWith(" "));
          const url = isUrl ? (value.startsWith("http") ? value : `https://${value}`) : engine + encodeURIComponent(value);
          window.location.href = `/a/${__uv$config.encodeUrl(url)}`;
        }
      }
    });

    return widget;
  }

  createQuickLinksWidget() {
    const widget = document.createElement("div");
    widget.id = "quickLinks";
    widget.className = "widget quick-links-widget";
    widget.innerHTML = `
      <div class="widget-header">
        <h3 class="widget-title"><i class="fa-solid fa-link widget-icon"></i>Quick Links</h3>
        <div class="widget-controls">
          <button class="widget-btn" onclick="widgetManager.removeWidget('quickLinks')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="widget-content">
        <div class="quick-links-grid" id="quick-links-container">
          <a href="https://www.google.com" target="_blank" class="quick-link-item">
            <i class="fab fa-google quick-link-icon"></i>
            <span class="quick-link-name">Google</span>
          </a>
          <a href="https://www.youtube.com" target="_blank" class="quick-link-item">
            <i class="fab fa-youtube quick-link-icon"></i>
            <span class="quick-link-name">YouTube</span>
          </a>
          <a href="https://github.com" target="_blank" class="quick-link-item">
            <i class="fab fa-github quick-link-icon"></i>
            <span class="quick-link-name">GitHub</span>
          </a>
          <a href="https://reddit.com" target="_blank" class="quick-link-item">
            <i class="fab fa-reddit quick-link-icon"></i>
            <span class="quick-link-name">Reddit</span>
          </a>
          <a href="https://twitter.com" target="_blank" class="quick-link-item">
            <i class="fab fa-x-twitter quick-link-icon"></i>
            <span class="quick-link-name">Twitter</span>
          </a>
          <a href="https://discord.com" target="_blank" class="quick-link-item">
            <i class="fab fa-discord quick-link-icon"></i>
            <span class="quick-link-name">Discord</span>
          </a>
        </div>
      </div>
    `;
    return widget;
  }

  createRecentAppsWidget() {
    const widget = document.createElement("div");
    widget.id = "recentApps";
    widget.className = "widget recent-apps-widget";
    widget.innerHTML = `
      <div class="widget-header">
        <h3 class="widget-title"><i class="fa-solid fa-clock widget-icon"></i>Recently Played</h3>
        <div class="widget-controls">
          <button class="widget-btn" onclick="widgetManager.removeWidget('recentApps')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="widget-content recent-apps-list" id="recent-apps-list">
        <div class="widget-empty">
          <div class="widget-empty-icon"><i class="fa-solid fa-hourglass-end"></i></div>
          <p class="widget-empty-text">No recent apps. Start playing to see history.</p>
        </div>
      </div>
    `;
    this.updateRecentApps(widget);
    return widget;
  }

  createFavoritesWidget() {
    const widget = document.createElement("div");
    widget.id = "favorites";
    widget.className = "widget favorites-widget";
    widget.innerHTML = `
      <div class="widget-header">
        <h3 class="widget-title"><i class="fa-solid fa-star widget-icon"></i>Favorites</h3>
        <div class="widget-controls">
          <button class="widget-btn" onclick="widgetManager.removeWidget('favorites')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="widget-content favorites-list" id="favorites-list">
        <div class="widget-empty">
          <div class="widget-empty-icon"><i class="fa-solid fa-bookmark"></i></div>
          <p class="widget-empty-text">No favorites yet. Star an app to add it.</p>
        </div>
      </div>
    `;
    this.updateFavorites(widget);
    return widget;
  }

  createStatsWidget() {
    const widget = document.createElement("div");
    widget.id = "stats";
    widget.className = "widget stats-widget";
    widget.innerHTML = `
      <div class="widget-header">
        <h3 class="widget-title"><i class="fa-solid fa-chart-line widget-icon"></i>Stats</h3>
        <div class="widget-controls">
          <button class="widget-btn" onclick="widgetManager.removeWidget('stats')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="widget-content">
        <div class="stats-grid">
          <div class="stat-item">
            <p class="stat-value" id="stat-visits">0</p>
            <p class="stat-label">Visits</p>
          </div>
          <div class="stat-item">
            <p class="stat-value" id="stat-favorites">0</p>
            <p class="stat-label">Favorites</p>
          </div>
          <div class="stat-item">
            <p class="stat-value" id="stat-time">0m</p>
            <p class="stat-label">Time Spent</p>
          </div>
          <div class="stat-item">
            <p class="stat-value" id="stat-today">0</p>
            <p class="stat-label">Today</p>
          </div>
        </div>
      </div>
    `;
    this.updateStats(widget);
    return widget;
  }

  updateRecentApps(widget) {
    const listContainer = widget.querySelector("#recent-apps-list");
    const recentApps = this.getRecentApps();

    if (recentApps.length === 0) {
      return; // Keep empty state
    }

    listContainer.innerHTML = recentApps
      .slice(0, 5)
      .map(
        app => `
      <a href="/a/${__uv$config.encodeUrl(app.url)}" class="recent-app-item">
        <img src="${app.icon}" alt="${app.name}" class="recent-app-icon" />
        <div class="recent-app-info">
          <p class="recent-app-name">${app.name}</p>
          <p class="recent-app-time">${this.formatTime(app.timestamp)}</p>
        </div>
      </a>
    `,
      )
      .join("");
  }

  updateFavorites(widget) {
    const listContainer = widget.querySelector("#favorites-list");
    const favorites = this.getFavorites();

    if (favorites.length === 0) {
      return; // Keep empty state
    }

    listContainer.innerHTML = favorites
      .map(
        app => `
      <div class="favorite-item">
        <a href="/a/${__uv$config.encodeUrl(app.url)}" class="favorite-item-info" style="text-decoration: none; color: inherit;">
          <img src="${app.icon}" alt="${app.name}" class="favorite-item-icon" />
          <span class="favorite-item-name">${app.name}</span>
        </a>
        <button class="favorite-remove-btn" onclick="widgetManager.removeFavorite('${app.id}')">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    `,
      )
      .join("");
  }

  updateStats(widget) {
    const stats = this.getStats();
    widget.querySelector("#stat-visits").textContent = stats.visits || "0";
    widget.querySelector("#stat-favorites").textContent = stats.favorites || "0";
    widget.querySelector("#stat-time").textContent = this.formatMinutes(stats.timeSpent) || "0m";
    widget.querySelector("#stat-today").textContent = stats.today || "0";
  }

  getRecentApps() {
    const stored = localStorage.getItem("recentApps");
    return stored ? JSON.parse(stored) : [];
  }

  getFavorites() {
    const stored = localStorage.getItem("favorites");
    return stored ? JSON.parse(stored) : [];
  }

  getStats() {
    const stored = localStorage.getItem("stats");
    return stored ? JSON.parse(stored) : { visits: 0, favorites: 0, timeSpent: 0, today: 0 };
  }

  addRecentApp(name, url, icon) {
    const recent = this.getRecentApps();
    const entry = { name, url, icon, timestamp: Date.now(), id: `app-${Date.now()}` };

    // Remove if already exists
    const filtered = recent.filter(app => app.url !== url);
    const updated = [entry, ...filtered].slice(0, 20); // Keep last 20

    localStorage.setItem("recentApps", JSON.stringify(updated));
    this.renderWidgets();
  }

  addFavorite(name, url, icon) {
    const favorites = this.getFavorites();
    if (!favorites.find(app => app.url === url)) {
      const entry = { name, url, icon, id: `fav-${Date.now()}` };
      favorites.push(entry);
      localStorage.setItem("favorites", JSON.stringify(favorites));
      this.renderWidgets();
    }
  }

  removeFavorite(id) {
    const favorites = this.getFavorites();
    const updated = favorites.filter(app => app.id !== id);
    localStorage.setItem("favorites", JSON.stringify(updated));
    this.renderWidgets();
  }

  removeWidget(widgetId) {
    this.enabledWidgets.delete(widgetId);
    this.saveConfiguration();
    this.renderWidgets();
  }

  openWidgetManager() {
    const modal = document.querySelector(".widget-manager-modal");
    if (modal) {
      modal.classList.add("active");
      this.updateWidgetManagerUI();
    }
  }

  closeWidgetManager() {
    const modal = document.querySelector(".widget-manager-modal");
    if (modal) {
      modal.classList.remove("active");
    }
  }

  updateWidgetManagerUI() {
    const list = document.querySelector(".widget-manager-list");
    if (!list) return;

    const widgetOptions = [
      { id: "search", name: "Search Bar" },
      { id: "quickLinks", name: "Quick Links" },
      { id: "recentApps", name: "Recently Played" },
      { id: "favorites", name: "Favorites" },
      { id: "stats", name: "Statistics" },
    ];

    list.innerHTML = widgetOptions
      .map(
        widget => `
      <div class="widget-manager-item">
        <span class="widget-manager-item-name">${widget.name}</span>
        <div class="widget-toggle ${this.isWidgetEnabled(widget.id) ? "active" : ""}" onclick="widgetManager.toggleWidgetUI('${widget.id}', this)">
          <div class="widget-toggle-circle"></div>
        </div>
      </div>
    `,
      )
      .join("");
  }

  toggleWidgetUI(widgetId, element) {
    this.toggleWidget(widgetId);
    element.classList.toggle("active");
  }

  saveWidgetManager() {
    this.saveConfiguration();
    this.renderWidgets();
    this.closeWidgetManager();
  }

  formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  formatMinutes(minutes) {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
    return `${minutes}m`;
  }

  getStats() {
    const stored = localStorage.getItem("stats");
    if (stored) {
      return JSON.parse(stored);
    }
    return { visits: 0, favorites: 0, timeSpent: 0, today: 0 };
  }
}

// Initialize widget manager when DOM is ready
let widgetManager;
document.addEventListener("DOMContentLoaded", () => {
  widgetManager = new WidgetManager();
  widgetManager.renderWidgets();
});

// Export for global use
window.WidgetManager = WidgetManager;
window.widgetManager = widgetManager;
