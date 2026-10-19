# The Pilgrim's Way

Browser 3D pilgrimage RPG — Region 1: Camino de Santiago.

Static site (GitHub Pages). Mobile-first, third-person, gather / craft / fight / pray.

## Play

https://m91028238-hash.github.io/pilgrim-rpg/

## Local

Serve the folder over HTTP (ES modules):

```bash
python3 -m http.server 8080
```

## Stack

- three.js (vendored)
- Plain HTML / CSS / JS modules
- Saves to `localStorage` (`pr_save_v1`, `pr_best`, `pr_lvl`)
