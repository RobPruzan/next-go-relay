const WS_URL = "wss://next-go-production.up.railway.app";
const SESS = "global-share";

const htmlContent = /*html*/ `
<!doctype html><html><head><meta charset="utf-8"/>
  <title>Viewer</title>
  <style>html,body{margin:0;height:100%;background:#111}
         #view{width:100%;height:100%;border:none}</style>
</head><body>
  <iframe id="view"></iframe>
  <script type="module">
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
    const ws = new WebSocket("${WS_URL}");
    ws.onopen = () => ws.send(JSON.stringify({type:"join",role:"client"}));

    ws.onmessage = async ev => {
      const m = JSON.parse(ev.data);
      if(m.type==="offer"){
        await pc.setRemoteDescription(m.offer);
        const ans = await pc.createAnswer();
        await pc.setLocalDescription(ans);
        ws.send(JSON.stringify({type:"answer",answer:ans}));
      } else if(m.type==="ice"){
        await pc.addIceCandidate(m.candidate);
      }
    };
  </script>
</body></html>
`;

const server = Bun.serve({
  port: 5000,
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      return new Response(htmlContent, {
        headers: {
          "Content-Type": "text/html",
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Server running at http://localhost:${server.port}`);

export default server;
