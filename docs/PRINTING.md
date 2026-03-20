# Printing when the backend is outside the restaurant WiFi

The backend runs in the cloud (or another network) and **cannot reach printers on the restaurant’s local WiFi**. Printers are only on the restaurant LAN. So printing must be done by **something that runs on the restaurant’s WiFi** and talks to those printers.

---

## Approach: print agent on the restaurant LAN

Use a small **print agent** that runs on a device **inside** the restaurant’s WiFi (e.g. Raspberry Pi, always-on PC, or a dedicated mini server). That agent:

1. **Has access to local printers** – same LAN as the printers; can use IP:9100, IPP, or CUPS.
2. **Gets print jobs from the backend** – the backend never talks to the printer; it sends jobs to the agent (or the agent fetches them). Because the backend is outside the WiFi, the agent must initiate the connection:
   - **Polling**: agent periodically calls the backend (e.g. `GET /api/print-jobs?tenant_id=...&device_id=...`), or
   - **Long-lived connection**: agent opens a WebSocket (or SSE) to the backend; backend pushes “print this” when orders are placed/paid.
3. **Renders and prints** – for each job, the agent produces the document (e.g. kitchen ticket, receipt) and sends it to the right local printer.

So the flow is:

```
[Backend, outside WiFi]  ----(internet: poll or WebSocket)---->  [Print agent on restaurant WiFi]  ----(LAN)---->  [Local printers]
```

The backend does not need to know printer IPs; it only needs to know the **tenant** (and optionally which “printer role”, e.g. kitchen vs receipt). The agent on the LAN is configured with which local printer to use for each role.

---

## 1. Print agent (on restaurant WiFi)

- **Runs on**: Raspberry Pi, old PC, or any machine that is always on and on the restaurant’s WiFi.
- **Responsibilities**:
  - Register with the backend (optional): e.g. tenant_id + device_id so the backend can assign jobs to this venue.
  - Fetch or receive print jobs (poll or WebSocket/SSE).
  - Optionally **discover** local printers (e.g. mDNS/Avahi for AirPrint, or scan port 9100, or use CUPS); or use **configured** printer IPs/hostnames.
  - For each job: render the content (e.g. HTML → PDF, or plain text → PCL) and send to the correct printer via:
    - **Raw socket** to `printer-ip:9100` (JetDirect), or
    - **IPP** to the printer, or
    - **CUPS** (if the agent runs on Linux with CUPS and printers added).
- **Outbound-only to backend**: the agent calls the backend (HTTPS or WSS). No need to open ports on the restaurant firewall; no inbound from the internet.

---

## 2. Backend (outside WiFi)

- **Does not** send data directly to any printer.
- When a print-trigger event happens (e.g. order confirmed, payment received), the backend:
  - **Either** enqueues a print job (e.g. in DB or queue) with tenant_id, job type (kitchen / receipt), and payload (order id, template name, or HTML/JSON). The agent later **polls** and gets new jobs.
  - **Or** pushes the job over an existing **WebSocket/SSE** connection from the agent (if the agent connected with tenant_id/device_id).
- Backend can store “registered” agents (tenant_id, device_id, last_seen) to know which venues are online; optional.

---

## 3. Printer registration (“printers on local WiFi”)

- **Registration** means: the agent (on the LAN) knows which printer to use for which purpose. That can be:
  - **Local config only**: e.g. config file or env on the agent: `KITCHEN_PRINTER=192.168.1.50`, `RECEIPT_PRINTER=192.168.1.51`.
  - **Or** the agent discovers printers on the LAN (mDNS, CUPS, or port 9100 scan) and reports a list to the backend; staff then choose in the POS UI “kitchen printer = Printer A”, “receipt printer = Printer B”. The backend stores that mapping per tenant; when sending a job, it includes “printer role = kitchen” and the agent resolves that to the right IP/queue using its local discovery or config.
- Printers stay on **local WiFi**; only the agent (also on that WiFi) talks to them.

---

## 4. Summary

| Question | Answer |
|----------|--------|
| Where does printing happen? | On the **restaurant LAN**, by the **print agent**. |
| Can the backend print directly? | **No** – backend is outside the restaurant WiFi and cannot reach local printers. |
| How does the backend get jobs to the agent? | Agent **polls** the backend for new jobs, or uses a **WebSocket/SSE** connection so the backend can push jobs. |
| How does the agent talk to printers? | Same LAN: raw socket (port 9100), IPP, or CUPS. |
| Who “registers” printers? | The agent (on the LAN) knows or discovers local printers; optionally the backend stores which “printer role” (kitchen/receipt) maps to which agent-side printer name/IP. |

This gives you automatic printing to **local WiFi printers** without the backend needing to be on the restaurant’s network, and without the user having to do anything at print time (once the agent is set up and connected).

---

## 5. How to run the agent inside the restaurant

You have three practical patterns. **Pure in-browser JavaScript cannot print to a network printer or print silently** — browsers block raw TCP and always show the print dialog for `window.print()`. So the “agent” is always a process (or extension + process) that has access to the OS/network.

### Option A: Local WebSocket bridge (no browser extension)

A small **desktop app** runs on one machine on the restaurant’s WiFi (e.g. the staff PC or a Raspberry Pi). It opens a **WebSocket server on localhost** (or on the LAN). The **web app** (your Angular frontend) uses **plain JavaScript/TypeScript** to connect to that server and send print jobs. No Chrome/Firefox extension is required.

**Flow:** Browser tab (staff dashboard) → `new WebSocket('ws://localhost:8443')` → local bridge → printer on LAN.

- **WebApp Hardware Bridge** (Java) is a ready-made solution:
  - [GitHub: imTigger/webapp-hardware-bridge](https://github.com/imTigger/webapp-hardware-bridge) (165+ stars, MIT)
  - Runs on the staff PC (Windows binary; Mac/Linux: build from source). Exposes WebSocket on `localhost:8443`.
  - Supports PDF, PNG, JPG, and **raw/ESC-POS** (ideal for kitchen/receipt printers). Multiple printers mapped by key.
  - **No extension**: the web page connects to `ws://localhost:8443` and sends print commands. So “native JavaScript” in your Angular app (e.g. a small service that talks to the bridge) is enough.
  - Configurator app maps logical names (e.g. `kitchen`, `receipt`) to actual printer names on the machine.
  - Caveat: bridge must run on the **same machine** as the browser if you use `localhost`; otherwise run it on a host that accepts connections from the LAN and use `ws://<agent-ip>:8443` (see [wiki HTTPS/WSS](https://github.com/imTigger/webapp-hardware-bridge/wiki/HTTPS-WSS-Support) if the POS is served over HTTPS).
- **NPM client** for a compatible WebSocket print service: [@hardwarebridge/client](https://www.npmjs.com/package/@hardwarebridge/client) — TypeScript, connect to `ws://localhost:8443`, enumerate devices, send `print(printerId, data, 'escpos'|'raw'|...)`. You can integrate this in the frontend when the bridge is available; fallback to `window.print()` when it is not.

So: **yes, you can use “native” (in-page) JavaScript to print**, as long as a **local bridge** is running and the page connects to it via WebSocket. The bridge is the only thing that needs to run “inside the restaurant”; no extension required.

---

### Option B: Browser extension + native host

A **Chrome (or Firefox) extension** plus a **native host** process. The extension runs in the browser; the **native host** is a small executable that has access to the OS and can send data to the printer. The browser’s **Native Messaging API** connects the two (stdin/stdout). The extension cannot talk to the printer directly; it must go through the host.

**Flow:** Web page ↔ extension (e.g. `postMessage` or content script) ↔ Native Messaging ↔ native host process → printer.

- **Ninja Printer** (Chrome):
  - [GitHub: Westwing-Home-and-Living/Ninja-Printer](https://github.com/Westwing-Home-and-Living/Ninja-Printer)
  - Extension + Java host. Supports ZPL (labels) and PDF; web app can select printer and send jobs. Windows/macOS.
- **Chrome Direct Print** (deprecated, superseded by WebApp Hardware Bridge):
  - [Blog: Chrome Direct Print](https://blog.tiger-workshop.com/chrome-direct-print/) — extension + Python host, PDF only; project abandoned in favor of WebApp Hardware Bridge (Option A).

So: **a browser plugin can “get the job done”**, but only by **calling a native host** that actually talks to the printer. The extension is the bridge between the page and that host; you (or the venue) must install both the extension and the host. Option A (WebSocket bridge, no extension) is usually simpler for a POS where you control one staff PC.

---

### Option C: Headless Node (or Python) agent

A **standalone process** (Node.js or Python) runs on a machine on the restaurant’s WiFi (e.g. Raspberry Pi or always-on PC). It **does not** depend on a browser tab. It either **polls** the backend for print jobs or holds a **WebSocket to the backend** and receives push jobs. Then it sends data to the printer (e.g. over TCP port 9100 or via CUPS).

**Flow:** Backend (cloud) ← poll or WebSocket → Node/Python agent on LAN → printer.

- **Node.js** examples:
  - [node-escpos](https://github.com/node-escpos) — `@node-escpos/network-adapter` for network printers (e.g. port 9100).
  - [node-thermal-printer](https://github.com/Klemen1337/node-thermal-printer) (900+ stars) — Epson/Star/Brother thermal, supports `tcp://host`.
  - [@point-of-sale/network-receipt-printer](https://www.npmjs.com/package/@point-of-sale/network-receipt-printer) — network receipt printer by IP.
- **Receipt encoding**: [ReceiptPrinterEncoder](https://github.com/NielsLeenheer/ReceiptPrinterEncoder) (ESC/POS, Star), [receiptline](https://github.com/receiptline/receiptline) (markdown-style receipts, multiple brands).

This fits “automatic” printing when an order is placed/paid: the backend enqueues or pushes a job; the agent picks it up and prints without any user action. No browser or extension needed on the print path.

---

## 6. Can “native JavaScript” do it without anything else?

**No.** In the browser, JavaScript cannot:

- Open raw TCP sockets to a printer (e.g. port 9100).
- Trigger printing without showing the system print dialog (`window.print()` always shows it).

So **by itself**, in-browser “native JavaScript” cannot print to LAN printers or print silently. It **can** send print jobs to a **local WebSocket server** (Option A). That server (the “bridge”) is what runs inside the restaurant and talks to the printers; the JavaScript in your Angular app only talks to the bridge.

---

## 7. References (GitHub / Codeberg)

| Project | Role | Notes |
|--------|------|--------|
| [imTigger/webapp-hardware-bridge](https://github.com/imTigger/webapp-hardware-bridge) | Local WebSocket bridge (Java) | Silent print + serial; no extension; WS on localhost. |
| [@hardwarebridge/client](https://www.npmjs.com/package/@hardwarebridge/client) | JS/TS client for bridge | Connect from browser to `ws://localhost:8443`, print(deviceId, data, format). |
| [Westwing-Home-and-Living/Ninja-Printer](https://github.com/Westwing-Home-and-Living/Ninja-Printer) | Chrome extension + Java host | Native Messaging; ZPL + PDF. |
| [Chrome Direct Print](https://blog.tiger-workshop.com/chrome-direct-print/) | Extension + Python host | Deprecated; see WebApp Hardware Bridge. |
| [node-thermal-printer](https://github.com/Klemen1337/node-thermal-printer) | Node agent → printer | Network thermal printers (tcp://...). |
| [node-escpos](https://github.com/node-escpos) | Node ESC/POS | Network adapter for port 9100. |
| [ReceiptPrinterEncoder](https://github.com/NielsLeenheer/ReceiptPrinterEncoder) | Receipt encoding (JS) | ESC/POS, Star; for use in Node or browser (with bridge). |
| [receiptline](https://github.com/receiptline/receiptline) | Receipt DSL / rendering | Markdown-style receipts, multi-vendor. |
| [thermal-printer-server](https://github.com/sostenesapollo/thermal-printer-server) | POS web server for serial thermal | Local print server idea. |
| [LibrePOS](https://codeberg.org/librepos) (Codeberg) | POS stack | Self-hosted POS; no specific thermal-print docs in search. |
| [tea4cups](https://codeberg.org/dadosch/tea4cups) (Codeberg) | CUPS hooks | Run commands before/after print; modify data before printer. |

---

## 8. Recommendation for this POS

- **Simplest for “staff PC in the restaurant”**: Use **Option A**. Install **WebApp Hardware Bridge** on the staff PC; in the Angular app, add a small service that connects to `ws://localhost:8443` (or `ws://<bridge-host>:8443`). When the bridge is connected, send kitchen/receipt jobs (e.g. ESC/POS or PDF) to the mapped printer keys; when not connected, fall back to `window.print()` or show “Printer bridge offline”. No browser extension or extra backend push is required for staff-triggered printing.
- **Fully automatic (no browser)**: Use **Option C**. Run a small **Node (or Python) agent** on a device on the restaurant’s WiFi that polls or subscribes (WebSocket) to the backend; on “order confirmed” / “payment received”, the backend enqueues or pushes a job and the agent prints to the configured LAN printer(s).
- **Browser extension**: Use **Option B** only if you specifically need extension-based install (e.g. enterprise Chrome policy). Otherwise Option A is easier to deploy and maintain.
