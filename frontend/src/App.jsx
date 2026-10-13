
import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const API = "http://localhost:5000";

function decodeToken(token) {
    try {
        const part = token.split(".")[1];
        const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
        return JSON.parse(atob(base64));
    } catch {
        return null;
    }
}

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleString();
}

function App() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [userRole, setUserRole] = useState("");
    const [loggedIn, setLoggedIn] = useState(
        Boolean(localStorage.getItem("token"))
    );

    const [message, setMessage] = useState("");
    const [authLoading, setAuthLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [gatewayOnline, setGatewayOnline] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    const [devices, setDevices] = useState([]);
    const [networkStatus, setNetworkStatus] = useState({
        totalDevices: 0,
        onlineDevices: 0,
        offlineDevices: 0
    });
    const [alarms, setAlarms] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);

    const [activeView, setActiveView] = useState("overview");
    const [deviceSearch, setDeviceSearch] = useState("");
    const [deviceFilter, setDeviceFilter] = useState("All");
    const [alarmFilter, setAlarmFilter] = useState("All");

    const logout = useCallback(() => {
        localStorage.removeItem("token");
        setLoggedIn(false);
        setUserRole("");
        setUsername("");
        setPassword("");
        setDevices([]);
        setAlarms([]);
        setAuditLogs([]);
        setNetworkStatus({
            totalDevices: 0,
            onlineDevices: 0,
            offlineDevices: 0
        });
        setError("");
        setMessage("");
    }, []);

    const loadDashboard = useCallback(async () => {
        const token = localStorage.getItem("token");

        if (!token) {
            logout();
            return;
        }

        const payload = decodeToken(token);

        if (!payload) {
            logout();
            setMessage("Your session is invalid. Please sign in again.");
            return;
        }

        setUserRole(payload.role || "");
        setLoading(true);
        setError("");

        const headers = {
            Authorization: "Bearer " + token
        };

        try {
            const [deviceResponse, statusResponse, alarmResponse] =
                await Promise.all([
                    fetch(`${API}/api/devices`, { headers }),
                    fetch(`${API}/api/network-status`, { headers }),
                    fetch(`${API}/api/alarms`, { headers })
                ]);

            const responses = [
                deviceResponse,
                statusResponse,
                alarmResponse
            ];

            const invalidSession = responses.some(
                (response) =>
                    response.status === 401 ||
                    response.status === 403
            );

            if (invalidSession) {
                logout();
                setMessage(
                    "Your session has expired or access was denied. Please sign in again."
                );
                return;
            }

            const [deviceData, statusData, alarmData] =
                await Promise.all(
                    responses.map((response) => response.json())
                );

            if (!deviceResponse.ok) {
                throw new Error(
                    deviceData.message || "Unable to load devices."
                );
            }

            if (!statusResponse.ok) {
                throw new Error(
                    statusData.message || "Unable to load network status."
                );
            }

            if (!alarmResponse.ok) {
                throw new Error(
                    alarmData.message || "Unable to load alarms."
                );
            }

            setDevices(Array.isArray(deviceData) ? deviceData : []);
            setNetworkStatus(statusData);
            setAlarms(Array.isArray(alarmData) ? alarmData : []);
            setGatewayOnline(true);

            // Audit logs are restricted to administrators.
            if (payload.role === "admin") {
                try {
                    const auditResponse = await fetch(
                        `${API}/api/audit-logs`,
                        { headers }
                    );

                    if (auditResponse.ok) {
                        const auditData = await auditResponse.json();
                        setAuditLogs(
                            Array.isArray(auditData) ? auditData : []
                        );
                    } else if (auditResponse.status === 401) {
                        logout();
                        setMessage("Please sign in again.");
                        return;
                    } else {
                        setAuditLogs([]);
                    }
                } catch {
                    setAuditLogs([]);
                }
            } else {
                setAuditLogs([]);
            }

            setLastUpdated(new Date());
        } catch (err) {
            setGatewayOnline(false);
            setError(
                err.message ||
                "Unable to connect to the Secure NMS API Gateway."
            );
        } finally {
            setLoading(false);
        }
    }, [logout]);

    useEffect(() => {
        if (loggedIn) {
            loadDashboard();
        }
    }, [loggedIn, loadDashboard]);

    const handleLogin = async (event) => {
        event.preventDefault();
        setAuthLoading(true);
        setMessage("");

        try {
            const response = await fetch(`${API}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                setMessage(data.message || "Unable to sign in.");
                return;
            }

            const payload = decodeToken(data.token);

            if (!payload) {
                setMessage("The server returned an invalid token.");
                return;
            }

            localStorage.setItem("token", data.token);
            setUserRole(payload.role || "");
            setLoggedIn(true);
            setMessage("");
            setPassword("");
        } catch {
            setMessage(
                "Cannot connect to the Gateway. Check that the backend is running."
            );
        } finally {
            setAuthLoading(false);
        }
    };

    const navigateTo = (view) => {
        setActiveView(view);

        const target = document.getElementById(view);

        if (target) {
            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    };

    const filteredDevices = useMemo(() => {
        const query = deviceSearch.trim().toLowerCase();

        return devices.filter((device) => {
            const matchesSearch = [
                device.id,
                device.name,
                device.type,
                device.ip
            ].some((value) =>
                String(value || "").toLowerCase().includes(query)
            );

            const matchesStatus =
                deviceFilter === "All" ||
                device.status === deviceFilter;

            return matchesSearch && matchesStatus;
        });
    }, [devices, deviceSearch, deviceFilter]);

    const filteredAlarms = useMemo(() => {
        if (alarmFilter === "All") return alarms;

        return alarms.filter(
            (alarm) =>
                String(alarm.severity).toLowerCase() ===
                alarmFilter.toLowerCase()
        );
    }, [alarms, alarmFilter]);

    const criticalAlarms = alarms.filter(
        (alarm) =>
            String(alarm.severity).toLowerCase() === "critical"
    ).length;

    if (!loggedIn) {
        return (
            <main className="login-page">
                <section className="login-layout">
                    <div className="login-brand-panel">
                        <div className="brand-lockup">
                            <div className="brand-mark">N</div>
                            <div>
                                <div className="brand-name">SECURE NMS</div>
                                <div className="brand-caption">
                                    NETWORK OPERATIONS
                                </div>
                            </div>
                        </div>

                        <div className="login-intro">
                            <div className="eyebrow">
                                NETWORK MANAGEMENT SYSTEM
                            </div>
                            <h1>
                                Visibility.
                                <br />
                                Control.
                                <br />
                                <span>Security.</span>
                            </h1>
                            <p>
                                A secure access layer for monitoring
                                network infrastructure, reviewing alarms
                                and protecting NMS interfaces.
                            </p>
                        </div>

                        <div className="login-bottom">
                            <span className="status-dot" />
                            SECURE API GATEWAY
                            <span className="login-bottom-divider">/</span>
                            LOCAL ENVIRONMENT
                        </div>
                    </div>

                    <div className="login-form-panel">
                        <div className="login-form-wrap">
                            <div className="mobile-brand">
                                <div className="brand-mark">N</div>
                                <div className="brand-name">SECURE NMS</div>
                            </div>

                            <div className="eyebrow">WELCOME BACK</div>
                            <h2>Sign in to your workspace</h2>
                            <p className="form-description">
                                Enter your credentials to access network
                                operations.
                            </p>

                            <form onSubmit={handleLogin}>
                                <label htmlFor="username">Username</label>
                                <input
                                    id="username"
                                    type="text"
                                    autoComplete="username"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(event) =>
                                        setUsername(event.target.value)
                                    }
                                    required
                                />

                                <label htmlFor="password">Password</label>
                                <input
                                    id="password"
                                    type="password"
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(event.target.value)
                                    }
                                    required
                                />

                                {message && (
                                    <div className="inline-alert error-alert">
                                        {message}
                                    </div>
                                )}

                                <button
                                    className="primary-button login-submit"
                                    type="submit"
                                    disabled={authLoading}
                                >
                                    {authLoading
                                        ? "Signing in..."
                                        : "Sign in"}
                                    <span aria-hidden="true">→</span>
                                </button>
                            </form>

                            <div className="login-security-note">
                                <span className="security-icon">◇</span>
                                Authenticated access · Role-based permissions
                            </div>

                            <div className="login-disclaimer">
                                Development environment. Use your configured
                                project credentials.
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <div className="brand-mark">N</div>
                    <div>
                        <div className="brand-name">SECURE NMS</div>
                        <div className="brand-caption">OPERATIONS CENTER</div>
                    </div>
                </div>

                <div className="sidebar-section-label">WORKSPACE</div>

                <nav className="sidebar-nav" aria-label="Main navigation">
                    <button
                        className={
                            activeView === "overview"
                                ? "nav-item active"
                                : "nav-item"
                        }
                        onClick={() => navigateTo("overview")}
                    >
                        <span className="nav-icon">◫</span>
                        Overview
                    </button>

                    <button
                        className={
                            activeView === "devices"
                                ? "nav-item active"
                                : "nav-item"
                        }
                        onClick={() => navigateTo("devices")}
                    >
                        <span className="nav-icon">⌘</span>
                        Devices
                        <span className="nav-count">{devices.length}</span>
                    </button>

                    <button
                        className={
                            activeView === "alarms"
                                ? "nav-item active"
                                : "nav-item"
                        }
                        onClick={() => navigateTo("alarms")}
                    >
                        <span className="nav-icon">♧</span>
                        Alarms
                        {alarms.length > 0 && (
                            <span className="nav-count alert-count">
                                {alarms.length}
                            </span>
                        )}
                    </button>

                    {userRole === "admin" && (
                        <button
                            className={
                                activeView === "audit-logs"
                                    ? "nav-item active"
                                    : "nav-item"
                            }
                            onClick={() => navigateTo("audit-logs")}
                        >
                            <span className="nav-icon">≡</span>
                            Audit logs
                        </button>
                    )}
                </nav>

                <div className="sidebar-bottom">
                    <div className="sidebar-status-card">
                        <div className="sidebar-status-heading">
                            <span
                                className={
                                    gatewayOnline
                                        ? "status-dot"
                                        : "status-dot status-dot-offline"
                                }
                            />
                            Gateway
                        </div>
                        <div className="sidebar-status-value">
                            {gatewayOnline ? "Connected" : "Disconnected"}
                        </div>
                        <div className="sidebar-status-detail">
                            localhost:5000
                        </div>
                    </div>

                    <div className="sidebar-user">
                        <div className="avatar">
                            {(username || "U").slice(0, 1).toUpperCase()}
                        </div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">
                                {username || "User"}
                            </div>
                            <div className="sidebar-user-role">
                                {userRole || "User"}
                            </div>
                        </div>
                        <button
                            className="logout-icon-button"
                            onClick={logout}
                            title="Sign out"
                            aria-label="Sign out"
                        >
                            ↗
                        </button>
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <header className="topbar">
                    <div className="breadcrumbs">
                        <span>Workspace</span>
                        <span className="breadcrumb-divider">/</span>
                        <strong>
                            {activeView === "audit-logs"
                                ? "Audit logs"
                                : activeView.charAt(0).toUpperCase() +
                                  activeView.slice(1)}
                        </strong>
                    </div>

                    <div className="topbar-actions">
                        <div className="environment-label">
                            <span className="status-dot" />
                            Local environment
                        </div>
                        <button
                            className="secondary-button refresh-button"
                            onClick={loadDashboard}
                            disabled={loading}
                        >
                            <span className={loading ? "spin" : ""}>↻</span>
                            {loading ? "Refreshing" : "Refresh data"}
                        </button>
                    </div>
                </header>

                <div className="page-content">
                    <section className="page-heading" id="overview">
                        <div>
                            <div className="eyebrow">
                                NETWORK OPERATIONS
                            </div>
                            <h1>Overview</h1>
                            <p>
                                Monitor infrastructure health, review
                                network alarms and inspect gateway activity.
                            </p>
                        </div>
                        <div className="updated-label">
                            <span className="updated-label-title">
                                LAST UPDATED
                            </span>
                            <span>
                                {lastUpdated
                                    ? lastUpdated.toLocaleTimeString()
                                    : "Waiting for data"}
                            </span>
                        </div>
                    </section>

                    {error && (
                        <div className="inline-alert error-alert page-alert">
                            <div>
                                <strong>Unable to load all data</strong>
                                <p>{error}</p>
                            </div>
                            <button
                                className="text-button"
                                onClick={loadDashboard}
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    <section className="metric-grid" aria-label="Network summary">
                        <article className="metric-card">
                            <div className="metric-card-top">
                                <span className="metric-label">
                                    TOTAL DEVICES
                                </span>
                                <span className="metric-icon neutral-icon">
                                    ◫
                                </span>
                            </div>
                            <div className="metric-value">
                                {networkStatus.totalDevices ?? devices.length}
                            </div>
                            <div className="metric-footnote">
                                Registered in simulated NMS
                            </div>
                        </article>

                        <article className="metric-card">
                            <div className="metric-card-top">
                                <span className="metric-label">ONLINE</span>
                                <span className="metric-icon green-icon">
                                    ✓
                                </span>
                            </div>
                            <div className="metric-value">
                                {networkStatus.onlineDevices ?? 0}
                            </div>
                            <div className="metric-footnote">
                                Reporting operational status
                            </div>
                        </article>

                        <article className="metric-card">
                            <div className="metric-card-top">
                                <span className="metric-label">OFFLINE</span>
                                <span className="metric-icon red-icon">
                                    !
                                </span>
                            </div>
                            <div className="metric-value">
                                {networkStatus.offlineDevices ?? 0}
                            </div>
                            <div className="metric-footnote">
                                Devices needing attention
                            </div>
                        </article>

                        <article className="metric-card">
                            <div className="metric-card-top">
                                <span className="metric-label">
                                    CRITICAL ALARMS
                                </span>
                                <span className="metric-icon amber-icon">
                                    !
                                </span>
                            </div>
                            <div className="metric-value">{criticalAlarms}</div>
                            <div className="metric-footnote">
                                {alarms.length} total reported alarms
                            </div>
                        </article>
                    </section>

                    <section className="section-block" id="devices">
                        <div className="section-heading">
                            <div>
                                <div className="eyebrow">INFRASTRUCTURE</div>
                                <h2>Network devices</h2>
                                <p>
                                    Devices returned by the secure NMS interface.
                                </p>
                            </div>
                            <span className="section-meta">
                                {filteredDevices.length} devices
                            </span>
                        </div>

                        <div className="toolbar">
                            <div className="search-field">
                                <span aria-hidden="true">⌕</span>
                                <input
                                    type="search"
                                    aria-label="Search devices"
                                    placeholder="Search name, ID, type or IP..."
                                    value={deviceSearch}
                                    onChange={(event) =>
                                        setDeviceSearch(event.target.value)
                                    }
                                />
                            </div>

                            <select
                                value={deviceFilter}
                                onChange={(event) =>
                                    setDeviceFilter(event.target.value)
                                }
                                aria-label="Filter devices by status"
                                className="filter-select"
                            >
                                <option value="All">All statuses</option>
                                <option value="Online">Online</option>
                                <option value="Offline">Offline</option>
                            </select>
                        </div>

                        <div className="table-card">
                            <div className="table-scroll">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>DEVICE</th>
                                            <th>DEVICE ID</th>
                                            <th>TYPE</th>
                                            <th>IP ADDRESS</th>
                                            <th>STATUS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredDevices.map((device) => (
                                            <tr key={device.id}>
                                                <td>
                                                    <div className="device-cell">
                                                        <div className="device-type-icon">
                                                            {String(device.type)
                                                                .toLowerCase()
                                                                .includes("switch")
                                                                ? "⇄"
                                                                : "⌘"}
                                                        </div>
                                                        <div className="device-cell-info">
                                                            <strong>
                                                                {device.name}
                                                            </strong>
                                                            <span>
                                                                Network device
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="mono-text">
                                                        {device.id}
                                                    </span>
                                                </td>
                                                <td>{device.type}</td>
                                                <td>
                                                    <span className="mono-text">
                                                        {device.ip}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span
                                                        className={
                                                            String(device.status).toLowerCase() ===
                                                            "online"
                                                                ? "status-pill online-pill"
                                                                : "status-pill offline-pill"
                                                        }
                                                    >
                                                        <span className="pill-dot" />
                                                        {device.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {filteredDevices.length === 0 && (
                                    <div className="empty-state">
                                        <div className="empty-state-icon">⌕</div>
                                        <strong>No matching devices</strong>
                                        <p>
                                            Try changing your search or status
                                            filter.
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="table-footer">
                                <span>
                                    Data source: simulated NMS via API Gateway
                                </span>
                                <span>
                                    {loading ? "Updating…" : "Current results"}
                                </span>
                            </div>
                        </div>
                    </section>

                    <section className="section-block" id="alarms">
                        <div className="section-heading">
                            <div>
                                <div className="eyebrow">EVENT MANAGEMENT</div>
                                <h2>Network alarms</h2>
                                <p>
                                    Review reported events by severity.
                                </p>
                            </div>
                            <span className="section-meta">
                                {alarms.length} total alarms
                            </span>
                        </div>

                        <div className="toolbar">
                            <div className="alarm-summary">
                                <span className="severity-key critical-key">
                                    Critical{" "}
                                    {alarms.filter(
                                        (alarm) =>
                                            String(alarm.severity).toLowerCase() ===
                                            "critical"
                                    ).length}
                                </span>
                                <span className="severity-key warning-key">
                                    Warning{" "}
                                    {alarms.filter(
                                        (alarm) =>
                                            String(alarm.severity).toLowerCase() ===
                                            "warning"
                                    ).length}
                                </span>
                                <span className="severity-key info-key">
                                    Info{" "}
                                    {alarms.filter(
                                        (alarm) =>
                                            String(alarm.severity).toLowerCase() ===
                                            "info"
                                    ).length}
                                </span>
                            </div>

                            <select
                                className="filter-select"
                                value={alarmFilter}
                                onChange={(event) =>
                                    setAlarmFilter(event.target.value)
                                }
                                aria-label="Filter alarms by severity"
                            >
                                <option value="All">All severities</option>
                                <option value="Critical">Critical</option>
                                <option value="Warning">Warning</option>
                                <option value="Info">Info</option>
                            </select>
                        </div>

                        <div className="table-card">
                            <div className="table-scroll">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>ALARM</th>
                                            <th>DEVICE</th>
                                            <th>SEVERITY</th>
                                            <th>STATUS</th>
                                            <th>REPORTED</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAlarms.map((alarm) => (
                                            <tr key={alarm.id}>
                                                <td>
                                                    <div className="alarm-cell">
                                                        <strong>
                                                            {alarm.message}
                                                        </strong>
                                                        <span className="mono-text">
                                                            {alarm.id}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="mono-text">
                                                        {alarm.deviceId}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span
                                                        className={
                                                            "severity-pill " +
                                                            String(alarm.severity)
                                                                .toLowerCase() +
                                                            "-severity"
                                                        }
                                                    >
                                                        {alarm.severity}
                                                    </span>
                                                </td>
                                                <td>{alarm.status || "Active"}</td>
                                                <td>{formatDate(alarm.time)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {filteredAlarms.length === 0 && (
                                    <div className="empty-state">
                                        <div className="empty-state-icon">✓</div>
                                        <strong>No alarms to display</strong>
                                        <p>
                                            No alarms match the selected severity.
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="table-footer">
                                <span>
                                    Simulated alarm data from the NMS
                                </span>
                                <span>
                                    {filteredAlarms.length} shown
                                </span>
                            </div>
                        </div>
                    </section>

                    {userRole === "admin" && (
                        <section className="section-block" id="audit-logs">
                            <div className="section-heading">
                                <div>
                                    <div className="eyebrow">
                                        SECURITY & COMPLIANCE
                                    </div>
                                    <h2>Audit logs</h2>
                                    <p>
                                        Recent requests observed by the API
                                        Gateway.
                                    </p>
                                </div>
                                <span className="section-meta">
                                    {auditLogs.length} events
                                </span>
                            </div>

                            <div className="table-card">
                                <div className="table-scroll">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>USER</th>
                                                <th>ROLE</th>
                                                <th>REQUEST</th>
                                                <th>ENDPOINT</th>
                                                <th>STATUS</th>
                                                <th>DURATION</th>
                                                <th>TIME</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {auditLogs.map((log) => (
                                                <tr key={log.id}>
                                                    <td>
                                                        <strong>{log.user}</strong>
                                                    </td>
                                                    <td>
                                                        <span className="role-tag">
                                                            {log.role}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="method-tag">
                                                            {log.method}
                                                        </span>
                                                    </td>
                                                    <td className="endpoint-cell">
                                                        {log.endpoint}
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={
                                                                Number(log.status) < 400
                                                                    ? "http-status success-http"
                                                                    : "http-status error-http"
                                                            }
                                                        >
                                                            {log.status}
                                                        </span>
                                                    </td>
                                                    <td className="mono-text">
                                                        {log.duration}
                                                    </td>
                                                    <td>
                                                        {formatDate(log.time)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {auditLogs.length === 0 && (
                                        <div className="empty-state">
                                            <div className="empty-state-icon">≡</div>
                                            <strong>No audit events available</strong>
                                            <p>
                                                Make a few requests and refresh
                                                the dashboard. Logs are stored
                                                in memory and reset when the
                                                Gateway restarts.
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="table-footer">
                                    <span>
                                        Administrator-only view
                                    </span>
                                    <span>
                                        In-memory logs · Latest events first
                                    </span>
                                </div>
                            </div>
                        </section>
                    )}

                    <section className="section-block security-section">
                        <div className="section-heading">
                            <div>
                                <div className="eyebrow">ACCESS PROTECTION</div>
                                <h2>Gateway security</h2>
                                <p>
                                    Security controls configured in the
                                    current backend.
                                </p>
                            </div>
                        </div>

                        <div className="security-grid">
                            <div className="security-item">
                                <div className="security-item-icon">◇</div>
                                <div>
                                    <strong>JWT authentication</strong>
                                    <p>Token required for protected APIs</p>
                                </div>
                                <span className="configured-label">
                                    Configured
                                </span>
                            </div>

                            <div className="security-item">
                                <div className="security-item-icon">⇄</div>
                                <div>
                                    <strong>Role-based access</strong>
                                    <p>Admin, Operator and Viewer roles</p>
                                </div>
                                <span className="configured-label">
                                    Configured
                                </span>
                            </div>

                            <div className="security-item">
                                <div className="security-item-icon">⌁</div>
                                <div>
                                    <strong>Rate limiting</strong>
                                    <p>Request threshold on /api routes</p>
                                </div>
                                <span className="configured-label">
                                    Configured
                                </span>
                            </div>

                            <div className="security-item">
                                <div className="security-item-icon">▣</div>
                                <div>
                                    <strong>Security headers</strong>
                                    <p>Helmet middleware enabled</p>
                                </div>
                                <span className="configured-label">
                                    Configured
                                </span>
                            </div>

                            <div className="security-item">
                                <div className="security-item-icon">⌘</div>
                                <div>
                                    <strong>CORS policy</strong>
                                    <p>Configured frontend origin</p>
                                </div>
                                <span className="configured-label">
                                    Configured
                                </span>
                            </div>

                            <div className="security-item">
                                <div className="security-item-icon">≡</div>
                                <div>
                                    <strong>Audit logging</strong>
                                    <p>Recent request activity recorded</p>
                                </div>
                                <span className="configured-label">
                                    Configured
                                </span>
                            </div>
                        </div>
                    </section>

                    <footer className="page-footer">
                        <div className="footer-brand">
                            <span className="footer-brand-mark">N</span>
                            <span>SECURE NMS</span>
                        </div>
                        <span>
                            Network operations · Local development build
                        </span>
                    </footer>
                </div>
            </main>
        </div>
    );
}

export default App;
