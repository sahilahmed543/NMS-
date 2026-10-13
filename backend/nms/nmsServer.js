const express = require("express");

const app = express();

const PORT = 5001;

app.use(express.json());

// Simulated network devices
const devices = [
    {
        id: "R001",
        name: "Router-01",
        type: "Router",
        ip: "192.168.1.1",
        status: "Online"
    },
    {
        id: "R002",
        name: "Router-02",
        type: "Router",
        ip: "192.168.1.2",
        status: "Online"
    },
    {
        id: "S001",
        name: "Switch-01",
        type: "Switch",
        ip: "192.168.1.10",
        status: "Offline"
    }
];
const alarms = [
    {
        id: "A001",
        deviceId: "R001",
        severity: "Warning",
        message: "High CPU utilization",
        status: "Active",
        time: new Date().toISOString()
    },
    {
        id: "A002",
        deviceId: "S001",
        severity: "Critical",
        message: "Device is offline",
        status: "Active",
        time: new Date().toISOString()
    },
    {
        id: "A003",
        deviceId: "R002",
        severity: "Info",
        message: "Device connectivity verified",
        status: "Active",
        time: new Date().toISOString()
    }
];

// Get all devices
app.get("/nms/devices", (req, res) => {
    res.json(devices);
});
app.get("/nms/alarms", (req, res) => {
    res.json(alarms);
});

// Get one device
app.get("/nms/devices/:id", (req, res) => {

    const device = devices.find(
        d => d.id === req.params.id
    );

    if (!device) {
        return res.status(404).json({
            message: "Device not found"
        });
    }

    res.json(device);
});

// Get network status
app.get("/nms/network-status", (req, res) => {

    const online = devices.filter(
        d => d.status === "Online"
    ).length;

    const offline = devices.filter(
        d => d.status === "Offline"
    ).length;

    res.json({
        totalDevices: devices.length,
        onlineDevices: online,
        offlineDevices: offline
    });
});

// Start NMS server
app.listen(PORT, () => {
    console.log(`NMS Server running on http://localhost:${PORT}`);
});