# BEDROCK

BEDROCK is a modular hub for games, video, apps, and tools.

- `index.html`, `index.css`, `index.js`: dashboard
- `js/globalmenu.js`: responsive sidebar and Remix Icons navigation
- `js/load.js`: supplied pre-video loader (preserved as provided)
- `assets/static/cloak.html`: first page served at `/`
- `assets/static/popup.html`: supplied welcome popup
- `assets/images/load.mp4`: place the intro video here

`vercel.json` rewrites `/` to `/assets/static/cloak.html`. Menu destinations are planned routes and need pages built separately.
