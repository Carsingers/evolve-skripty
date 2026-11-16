# EVOLVE · skripty webu

Veřejné skripty nového webu EVOLVE (Webflow, Client-First). Zdroj pravdy je projektová složka `EVOLVE/webflow/skripty`; sem se publikuje při vydání verze.

| Soubor | Co dělá |
|---|---|
| `evolve.js` | čitelný zdroj interakcí |
| `evolve.min.js` | totéž zmenšené, načítá ho web |
| `evolve.css` / `evolve.min.css` | styly k interakcím; ve Webflow jsou vložené v komponentě Global Styles, aby platily od prvního vykreslení |

Co skript dělá: světelné sloupce na tmavých sekcích, kreslení mřížek a osnovy, střídání situací, rozbalovací sled kroků, záložky Tří rovin, rolety a posun fotek, náběh bloků, čítače, rozsvícení žárovky a dlaždice v heru, animované FAQ, odhalení patičky, aktivní položka navigace a video v popupu.

Načítání přes jsDelivr s pevnou verzí (tag), např. `https://cdn.jsdelivr.net/gh/Carsingers/evolve-skripty@v1.0.0/evolve.min.js`, ve Webflow jako registrovaný skript s SRI otiskem. Nová verze = nový tag; starý tag se nemění.

Sestavení: `npx esbuild evolve.js --minify --target=es2018 --outfile=evolve.min.js` a `npx esbuild evolve.css --minify --outfile=evolve.min.css`.

Pozor při vydání: po pushnutí tagu počkat, až https://data.jsdelivr.com/v1/packages/gh/Carsingers/evolve-skripty@<tag> uvede `evolve.min.js`; dřívější dotaz na `.min.js` nechá jsDelivr vyrobit vlastní minifikaci a SRI pak nesedí. Proto vynechané v1.0.1.
