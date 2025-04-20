import { Hono } from "hono";

const WS_URL = "wss://next-go-production.up.railway.app";
const PORT = 5050;

const app = new Hono();

app.get("/", (c) => {
  /* inline HTML & JS so phone needs only one request */
  return c.html(/*html*/ `
    <!doctype html><html><head><meta charset="utf-8"/>
      <title>Viewer</title>
      <style>html,body{margin:0;height:100%;background:#111}
        #view{width:100%;height:100%;border:none}</style>
    </head><body>
      <iframe id="view"></iframe>
      <script type="module">
        const qs = new URLSearchParams(location.search);
        const session = qs.get("session");
        const wsUrl   = qs.get("ws") || "${WS_URL}";
        if(!session||!wsUrl){document.body.textContent="Missing info";throw new Error("missing");}
        const view = document.getElementById("view");

        const pc = new RTCPeerConnection({ iceServers:[{urls:"stun:stun.l.google.com:19302"}]});
        let dc;
        pc.ondatachannel = ev => {
          dc = ev.channel;
          dc.onmessage = ev2 => {
            const {kind,payload} = JSON.parse(ev2.data);
            if(kind==="html") view.srcdoc = payload;
          };
        };

        const ws = new WebSocket(wsUrl);
        ws.onopen = () => ws.send(JSON.stringify({type:"join",role:"client",session}));

        ws.onmessage = async ev => {
          const msg = JSON.parse(ev.data);
          if(msg.session!==session) return;
          if(msg.type==="offer"){
            await pc.setRemoteDescription(msg.offer);
            const ans = await pc.createAnswer();
            await pc.setLocalDescription(ans);
            ws.send(JSON.stringify({type:"answer",session,answer:ans}));
          } else if(msg.type==="ice"){
            await pc.addIceCandidate(msg.candidate);
          }
        };
      </script>
    </body></html>
  `);
});

Bun.serve({
  fetch: app.fetch,
  port: PORT,
});

export default app;
