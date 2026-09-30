import { useState } from "react";

function App() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loggedIn, setLoggedIn] = useState(
        Boolean(localStorage.getItem("token"))
    );

const [devices, setDevices] = useState([]);
const [networkStatus, setNetworkStatus] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    offlineDevices: 0
});
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
    const [userRole, setUserRole] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();

        setMessage("Authenticating...");

        try {
            const response = await fetch(
                "http://localhost:5000/auth/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        username,
                        password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setMessage(data.message || "Login failed");
                return;
            }

            localStorage.setItem("token", data.token);

            setLoggedIn(true);
            setMessage("");

            // Decode JWT payload to get role
            const payload = JSON.parse(
                atob(data.token.split(".")[1])
            );

            setUserRole(payload.role);

        } catch (error) {
            setMessage("Gateway connection failed.");
        }
    };

    const fetchDevices = async () => {
        const token = localStorage.getItem("token");

        if (!token) {
            setLoggedIn(false);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch(
                "http://localhost:5000/api/devices",
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Unable to load devices");

                if (response.status === 401 || response.status === 403) {
                    logout();
                }

                return;
            }

            setDevices(data);
            const statusResponse = await fetch(
    "http://localhost:5000/api/network-status",
    {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + token
        }
    }
);

const statusData = await statusResponse.json();

if (statusResponse.ok) {
    setNetworkStatus(statusData);
}

        } catch (error) {
            setError(
                "Unable to connect to the Secure NMS API Gateway."
            );
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        setLoggedIn(false);
        setDevices([]);
        setUserRole("");
        setUsername("");
        setPassword("");
    };

    // Automatically load devices after login
    useState(() => {
        if (loggedIn) {
            const token = localStorage.getItem("token");

            if (token) {
                try {
                    const payload = JSON.parse(
                        atob(token.split(".")[1])
                    );

                    setUserRole(payload.role);
                } catch {
                    logout();
                }
            }

            fetchDevices();
        }
    });

    // LOGIN SCREEN
    if (!loggedIn) {
        return (
            <div style={styles.container}>

                <div style={styles.loginCard}>

                    <div style={styles.goldLine}></div>

                    <h1 style={styles.title}>
                        SECURE NMS
                    </h1>

                    <div style={styles.gateway}>
                        API GATEWAY
                    </div>

                    <p style={styles.subtitle}>
                        NETWORK MANAGEMENT SYSTEM
                    </p>

                    <form onSubmit={handleLogin}>

                        <label style={styles.label}>
                            IDENTIFICATION
                        </label>

                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) =>
                                setUsername(e.target.value)
                            }
                            style={styles.input}
                            required
                        />

                        <label style={styles.label}>
                            ACCESS CODE
                        </label>

                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            style={styles.input}
                            required
                        />

                        <button
                            type="submit"
                            style={styles.loginButton}
                        >
                            AUTHENTICATE
                        </button>

                    </form>

                    {message && (
                        <p style={styles.message}>
                            {message}
                        </p>
                    )}

                    <div style={styles.security}>
                        ● SECURE CONNECTION
                    </div>

                </div>

                <p style={styles.footer}>
                    NMS SECURITY OPERATIONS • 2026
                </p>

            </div>
        );
    }

    // DASHBOARD
    return (
        <div style={styles.dashboardContainer}>

            {/* HEADER */}

            <header style={styles.header}>

                <div>
                    <h1 style={styles.dashboardTitle}>
                        SECURE NMS
                    </h1>

                    <p style={styles.dashboardSubtitle}>
                        NETWORK MANAGEMENT SYSTEM
                    </p>
                </div>

                <div style={styles.userSection}>

                    <div>
                        <div style={styles.userName}>
                            {username || "User"}
                        </div>

                        <div style={styles.userRole}>
                            ROLE: {userRole.toUpperCase()}
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        style={styles.logoutButton}
                    >
                        LOGOUT
                    </button>

                </div>

            </header>


            {/* SECURITY STATUS */}

            <section style={styles.securityBanner}>

                <div style={styles.securityIndicator}>
                    <span style={styles.greenDot}></span>
                    GATEWAY SECURE
                </div>

                <div style={styles.securityFeatures}>
                    JWT AUTHENTICATION
                    <span>•</span>
                    RBAC
                    <span>•</span>
                    RATE LIMITING
                    <span>•</span>
                    CORS
                    <span>•</span>
                    HELMET
                </div>

            </section>


            {/* STAT CARDS */}

            <section style={styles.statsGrid}>

                <div style={styles.statCard}>

                    <div style={styles.statLabel}>
                        TOTAL DEVICES
                    </div>

                    <div style={styles.statNumber}>
                        {networkStatus.totalDevices}
                    </div>

                </div>


                <div style={styles.statCard}>

                    <div style={styles.statLabel}>
                        ONLINE
                    </div>

                    <div style={styles.onlineNumber}>
                        {networkStatus.onlineDevices}
                    </div>

                </div>


                <div style={styles.statCard}>

                    <div style={styles.statLabel}>
                        OFFLINE
                    </div>

                    <div style={styles.offlineNumber}>
                        {networkStatus.offlineDevices}
                    </div>

                </div>


                <div style={styles.statCard}>

                    <div style={styles.statLabel}>
                        GATEWAY
                    </div>

                    <div style={styles.gatewayStatus}>
                        ACTIVE
                    </div>

                </div>

            </section>


            {/* DEVICES */}

            <section style={styles.panel}>

                <div style={styles.panelHeader}>

                    <div>
                        <h2 style={styles.panelTitle}>
                            NETWORK DEVICES
                        </h2>

                        <p style={styles.panelSubtitle}>
                            Devices monitored through the secure API gateway
                        </p>
                    </div>

                    <button
                        onClick={fetchDevices}
                        style={styles.refreshButton}
                    >
                        {loading ? "LOADING..." : "REFRESH"}
                    </button>

                </div>


                {error && (
                    <div style={styles.errorBox}>
                        {error}
                    </div>
                )}


                {loading ? (

                    <div style={styles.loading}>
                        Loading network devices...
                    </div>

                ) : devices.length === 0 ? (

                    <div style={styles.loading}>
                        No devices found.
                    </div>

                ) : (

                    <div style={styles.tableContainer}>

                        <table style={styles.table}>

                            <thead>

                                <tr>

                                    <th style={styles.th}>
                                        DEVICE ID
                                    </th>

                                    <th style={styles.th}>
                                        DEVICE NAME
                                    </th>

                                    <th style={styles.th}>
                                        TYPE
                                    </th>

                                    <th style={styles.th}>
                                        IP ADDRESS
                                    </th>

                                    <th style={styles.th}>
                                        STATUS
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {devices.map((device) => (

                                    <tr key={device.id}>

                                        <td style={styles.td}>
                                            {device.id}
                                        </td>

                                        <td style={styles.deviceName}>
                                            {device.name}
                                        </td>

                                        <td style={styles.td}>
                                            {device.type}
                                        </td>

                                        <td style={styles.ip}>
                                            {device.ip}
                                        </td>

                                        <td style={styles.td}>

                                            {device.status === "Online" ? (

                                                <span style={styles.onlineBadge}>
                                                    ● ONLINE
                                                </span>

                                            ) : (

                                                <span style={styles.offlineBadge}>
                                                    ● OFFLINE
                                                </span>

                                            )}

                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    </div>

                )}

            </section>


            {/* SECURITY ARCHITECTURE */}

            <section style={styles.panel}>

                <h2 style={styles.panelTitle}>
                    SECURITY ARCHITECTURE
                </h2>

                <div style={styles.architecture}>

                    <div style={styles.archBox}>
                        CLIENT
                    </div>

                    <div style={styles.arrow}>
                        →
                    </div>

                    <div style={styles.archBox}>
                        JWT + RBAC
                    </div>

                    <div style={styles.arrow}>
                        →
                    </div>

                    <div style={styles.archBox}>
                        API GATEWAY
                    </div>

                    <div style={styles.arrow}>
                        →
                    </div>

                    <div style={styles.archBox}>
                        NMS
                    </div>

                </div>

            </section>


            {/* FOOTER */}

            <footer style={styles.dashboardFooter}>
                SECURE NMS API GATEWAY • NETWORK OPERATIONS CENTER
            </footer>

        </div>
    );
}


const styles = {

    // LOGIN

    container: {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background:
            "radial-gradient(circle at center, #202020 0%, #080808 55%, #000000 100%)",
        fontFamily: "Arial, sans-serif",
        color: "white"
    },

    loginCard: {
        width: "400px",
        padding: "40px",
        background: "#111111",
        border: "1px solid #333333",
        borderRadius: "5px",
        boxShadow: "0 0 50px rgba(0,0,0,0.8)",
        boxSizing: "border-box"
    },

    goldLine: {
        height: "3px",
        background: "#f5c518",
        marginBottom: "28px"
    },

    title: {
        color: "#f5c518",
        textAlign: "center",
        fontSize: "30px",
        letterSpacing: "5px",
        margin: "0"
    },

    gateway: {
        color: "#ffffff",
        textAlign: "center",
        fontSize: "13px",
        letterSpacing: "4px",
        marginTop: "8px"
    },

    subtitle: {
        color: "#777777",
        textAlign: "center",
        fontSize: "11px",
        letterSpacing: "2px",
        marginBottom: "32px"
    },

    label: {
        display: "block",
        color: "#aaaaaa",
        fontSize: "11px",
        letterSpacing: "2px",
        marginBottom: "7px"
    },

    input: {
        width: "100%",
        padding: "13px",
        marginBottom: "20px",
        boxSizing: "border-box",
        borderRadius: "3px",
        border: "1px solid #333333",
        background: "#080808",
        color: "#ffffff",
        fontSize: "14px"
    },

    loginButton: {
        width: "100%",
        padding: "14px",
        border: "none",
        borderRadius: "3px",
        background: "#f5c518",
        color: "#050505",
        fontWeight: "bold",
        fontSize: "14px",
        letterSpacing: "2px",
        cursor: "pointer"
    },

    message: {
        textAlign: "center",
        color: "#f5c518",
        fontSize: "13px",
        marginTop: "20px"
    },

    security: {
        marginTop: "30px",
        paddingTop: "15px",
        borderTop: "1px solid #292929",
        color: "#666666",
        textAlign: "center",
        fontSize: "10px",
        letterSpacing: "1px"
    },

    footer: {
        color: "#444444",
        fontSize: "10px",
        letterSpacing: "2px",
        marginTop: "20px"
    },


    // DASHBOARD

    dashboardContainer: {
        minHeight: "100vh",
        background: "#080808",
        color: "#ffffff",
        fontFamily: "Arial, sans-serif",
        paddingBottom: "40px"
    },

    header: {
        minHeight: "90px",
        padding: "0 50px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #292929",
        background: "#111111",
        boxSizing: "border-box"
    },

    dashboardTitle: {
        color: "#f5c518",
        margin: "0",
        fontSize: "25px",
        letterSpacing: "4px"
    },

    dashboardSubtitle: {
        color: "#666666",
        margin: "5px 0 0",
        fontSize: "10px",
        letterSpacing: "2px"
    },

    userSection: {
        display: "flex",
        alignItems: "center",
        gap: "25px"
    },

    userName: {
        color: "#ffffff",
        fontSize: "14px",
        textAlign: "right"
    },

    userRole: {
        color: "#f5c518",
        fontSize: "10px",
        letterSpacing: "1px",
        marginTop: "4px",
        textAlign: "right"
    },

    logoutButton: {
        padding: "9px 16px",
        border: "1px solid #444444",
        background: "transparent",
        color: "#ffffff",
        cursor: "pointer",
        borderRadius: "3px"
    },


    // SECURITY

    securityBanner: {
        margin: "25px 50px",
        padding: "15px 20px",
        background: "#111111",
        border: "1px solid #292929",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxSizing: "border-box"
    },

    securityIndicator: {
        color: "#ffffff",
        fontSize: "12px",
        fontWeight: "bold",
        letterSpacing: "1px"
    },

    greenDot: {
        display: "inline-block",
        width: "8px",
        height: "8px",
        background: "#22c55e",
        borderRadius: "50%",
        marginRight: "8px"
    },

    securityFeatures: {
        color: "#777777",
        fontSize: "10px",
        letterSpacing: "1px"
    },


    // STATS

    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "18px",
        margin: "0 50px 25px"
    },

    statCard: {
        background: "#111111",
        border: "1px solid #292929",
        padding: "25px",
        borderRadius: "3px"
    },

    statLabel: {
        color: "#777777",
        fontSize: "10px",
        letterSpacing: "2px"
    },

    statNumber: {
        color: "#ffffff",
        fontSize: "35px",
        fontWeight: "bold",
        marginTop: "10px"
    },

    onlineNumber: {
        color: "#22c55e",
        fontSize: "35px",
        fontWeight: "bold",
        marginTop: "10px"
    },

    offlineNumber: {
        color: "#ef4444",
        fontSize: "35px",
        fontWeight: "bold",
        marginTop: "10px"
    },

    gatewayStatus: {
        color: "#f5c518",
        fontSize: "24px",
        fontWeight: "bold",
        marginTop: "17px"
    },


    // PANELS

    panel: {
        margin: "0 50px 25px",
        background: "#111111",
        border: "1px solid #292929",
        padding: "25px",
        borderRadius: "3px",
        boxSizing: "border-box"
    },

    panelHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px"
    },

    panelTitle: {
        color: "#f5c518",
        fontSize: "16px",
        letterSpacing: "2px",
        margin: "0"
    },

    panelSubtitle: {
        color: "#666666",
        fontSize: "11px",
        marginTop: "6px"
    },

    refreshButton: {
        padding: "9px 18px",
        background: "#f5c518",
        border: "none",
        color: "#000000",
        fontWeight: "bold",
        cursor: "pointer",
        borderRadius: "3px"
    },


    // TABLE

    tableContainer: {
        overflowX: "auto"
    },

    table: {
        width: "100%",
        borderCollapse: "collapse"
    },

    th: {
        textAlign: "left",
        padding: "14px",
        color: "#777777",
        fontSize: "10px",
        letterSpacing: "1px",
        borderBottom: "1px solid #333333"
    },

    td: {
        padding: "16px 14px",
        color: "#aaaaaa",
        fontSize: "13px",
        borderBottom: "1px solid #202020"
    },

    deviceName: {
        padding: "16px 14px",
        color: "#ffffff",
        fontWeight: "bold",
        fontSize: "13px",
        borderBottom: "1px solid #202020"
    },

    ip: {
        padding: "16px 14px",
        color: "#f5c518",
        fontSize: "13px",
        borderBottom: "1px solid #202020"
    },

    onlineBadge: {
        color: "#22c55e",
        fontSize: "11px",
        fontWeight: "bold"
    },

    offlineBadge: {
        color: "#ef4444",
        fontSize: "11px",
        fontWeight: "bold"
    },

    errorBox: {
        padding: "15px",
        background: "#2a1111",
        border: "1px solid #5c2222",
        color: "#ef4444",
        marginBottom: "20px"
    },

    loading: {
        textAlign: "center",
        padding: "40px",
        color: "#777777"
    },


    // ARCHITECTURE

    architecture: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "15px",
        marginTop: "25px",
        flexWrap: "wrap"
    },

    archBox: {
        padding: "15px 22px",
        border: "1px solid #f5c518",
        color: "#f5c518",
        background: "#080808",
        fontSize: "11px",
        letterSpacing: "1px"
    },

    arrow: {
        color: "#555555",
        fontSize: "22px"
    },


    dashboardFooter: {
        textAlign: "center",
        color: "#444444",
        fontSize: "9px",
        letterSpacing: "2px",
        marginTop: "35px"
    }
};

export default App;
