# Google Drive — ročna sinhronizacija (druga faza)

## Kaj je vključeno

V Nastavitvah je kartica Google Drive: povezava, ročna sinhronizacija, izbira
različice ob konfliktu, zadnja uspešna sinhronizacija ter lokalna obnovitev.
Povezava in branje podatkov o računu ne zamenjata kalkulatorjevih podatkov.
Noben samodejni prenos ne teče. Zapustitev Nastavitev ali ponovni zagon aplikacije
odstrani povezavo iz pomnilnika; za naslednji prenos se povežite znova.

OAuth uporablja Google Identity Services in obseg `drive.file`. Dostopni žeton je
samo v objektu v pomnilniku. LocalStorage vsebuje podatke, ID naprave, lokalne
obnovitvene kopije in ločeno stanje sinhronizacije za posamezen Google račun:
pregledane ID-je datotek, zadnjo potrjeno lokalno različico, čas sinhronizacije
in morebitni čakajoči posnetek z vnaprej dodeljenim ID-jem datoteke. Žetonov ali
odjemalskih skrivnosti tam ni. Odklop odstrani lokalni žeton; Googlovega dovoljenja
ne prekliče. Dovoljenje lahko prekličete v varnostnih nastavitvah Google računa.

## Client ID: lokalni razvoj

1. V Google Cloud izberite projekt `hs-3d-kalkulator`.
2. Odprite Google Auth Platform → Clients (oziroma APIs & Services → Credentials),
   nato spletni OAuth odjemalec `hebo`. Kopirajte **Client ID**, ki se konča z
   `.apps.googleusercontent.com`. Ne kopirajte Client Secret.
3. V korenu lokalnega checkouta ustvarite `.env.local` (je izključena iz Gita):

   ```dotenv
   VITE_GOOGLE_CLIENT_ID=VAS_CLIENT_ID.apps.googleusercontent.com
   ```

4. Za lokalno preverjanje odjemalcu dodajte Authorized JavaScript origin
   `http://127.0.0.1:5173`. Če uporabljate `localhost`, dodajte posebej tudi
   `http://localhost:5173`. Origin nima poti. Obstoječi `https://ashblody.github.io`
   pustite nastavljen. Za ta token popup flow redirect URI ni potreben.
5. Ponovno zaženite `pnpm dev --port 5173 --strictPort`. Vite bere konfiguracijo
   ob zagonu oziroma gradnji. Sprememba `.env.local` ne spremeni stare gradnje.
6. Za lokalni produkcijski predogled dodajte še ustrezen origin s portom 4173,
   zaženite `pnpm build` in `pnpm preview --port 4173 --strictPort`.

`.env.example` vsebuje prazno predlogo. Client ID je javen identifikator, ne
skrivnost. Nobene druge poverilnice niso potrebne v kodi.

## Client ID: bodoča gradnja na GitHub Pages

V repozitoriju `Ashblody/hs-3d-kalkulator-codex` odprite **Settings → Secrets and
variables → Actions → Variables → New repository variable**:

- Name: `VITE_GOOGLE_CLIENT_ID`
- Value: celotni Client ID odjemalca `hebo`.

Workflow ima za korak `pnpm build` povezavo s to spremenljivko. Brez nje aplikacija
še vedno deluje, povezava z Drivom pa je onemogočena z obvestilom. Vrednost je
vključena v javni JavaScript ob gradnji. Ni je mogoče nastaviti naknadno v že
objavljeni statični strani. **Nastavitev spremenljivke sama ne objavi aplikacije.**
Obstoječi workflow še vedno objavlja le ob pushu v `main` ali ročnem zagonu;
pri preizkušanju te veje ne zaženite deployment workflowa.

Testing status in testni uporabnik ostaneta vaša Google nastavitev. Uporabite
isti dodani testni račun doma in v službi. Potek prijave, zavrnitev dovoljenja
ali omejitve Workspace zahtevajo ponovno povezavo oziroma ukrep administratorja;
aplikacija teh omejitev ne obide. Žetoni so kratkotrajni, samodejnega obnavljanja
v ozadju ni. Odprite popup v običajnem Chromu; po potrebi dovolíte pojavna okna.

## Datoteke in pravila odločanja

Datoteke `hs3d-<revisionId>.json` se ustvarijo v korenu My Drive kot zasebne datoteke
z oznako aplikacije. Uporabnik jih lahko pozneje premakne v svojo mapo; aplikacija
jih išče po oznaki, ne poti ali imenu. Ne išče ali bere drugih 3D-projektov.
Za isti OAuth projekt/odjemalec so te datoteke dosegljive na obeh napravah z istim
računom. Obstoječih poljubnih JSON-datotek ne odkriva samodejno; zanje ostaja uvoz.

Aplikacija **nikoli ne izvaja PATCH ali DELETE datotek**. Vsaka nova različica dobi
svoj ID. Pred pošiljanjem trajno shrani čakajoči posnetek in ID iz `generateIds`.
Ob prekinjenem odgovoru ponovi ustvarjanje z istim ID; odgovor 409 prizna kot
uspeh le po ponovnem branju in primerjavi celotne validirane vsebine. Napaka
ne potrdi časa sinhronizacije. Identifikatorjev datotek ne izbiramo po uri naprave.

Prva naprava na praznem Drivu lahko shrani lokalno različico. Druga naprava ob
nepregledanih različicah ne prevzame ničesar samodejno. Če je spremenjena tudi
lokalna različica, pokaže konflikt. Zgodovina ostane vidna; datum pomaga pri
izbiri in ne odloča o prednosti. Uporabnik lahko izrecno ohrani lokalne podatke ali
prevzame izbrano kopijo. Izbira potrdi pregled trenutno prikazanih različic;
naknadno ustvarjene datoteke druga naprava zazna pri naslednji sinhronizaciji.
To je konzervativna izmenjava celotnih posnetkov, brez združevanja posameznih projektov.

Pred prevzemom izbrane kopije se lokalni posnetek potrjeno shrani tudi na Drive,
nato se oddaljena vsebina validira, preveri nespremenjenost lokalnega stanja ter
izdela in prebere nazaj obnovljiva lokalna kopija. Šele nato se zamenja lokalni
zapis in UI. Če kopiranje ne uspe, prevzema ni. Izmenični zavihki imajo Web Lock
za prenose in ločen kratek lock za lokalne zapise s primerjavo izvirnega zapisa.
Omrežna zahteva ne zadržuje samodejnega lokalnega shranjevanja; ob zastarelem
zavihku prenesite njegov JSON in ponovno naložite aplikacijo.

## Varen prvi preizkus

1. Na obeh računalnikih najprej uporabite **Izvozi vse v JSON**. Kopiji shranite
   izven LocalStorage, na primer v svojo mapo Google Drive. Za preizkus uporabite
   ločen Chrome profil z nenevarnimi demonstracijskimi podatki in isti testni račun.
2. Priklopite račun v Nastavitvah. Preverite, da se lokalni projekti niso spremenili.
3. Na napravi A kliknite **Sinhroniziraj JSON**. V My Drive preverite novo datoteko;
   naj ne bo javno deljena. Ponovitev brez sprememb ne ustvari nove različice.
4. Na napravi B kliknite sinhronizacijo. Izberite različico A in izrecno prevzemite.
   Preverite podatke in **Obnovljive lokalne kopije**. Predhodna različica B ostane
   na Drivu in v lokalni obnovljivi kopiji.
5. Na obeh napravah naredite različno spremembo, nato sinhronizirajte A in B.
   B mora ponuditi odločitev; nobena oddaljena datoteka se ne sme prepisati/izbrisati.
6. Prekinite internet pred prenosom in nato med prenosom (Chrome DevTools Network).
   Lokalno delo ter ročni JSON izvoz/uvoz morata ostati uporabna. Po ponovni povezavi
   ročno ponovite sinhronizacijo; preverite, da prekinjeni prenos uporablja isti ID.
7. V lokalnih kopijah izberite staro kopijo, jo najprej prenesite v JSON, nato
   obnovite. Tudi stanje pred obnovitvijo mora ostati v novi lokalni kopiji.
8. Odklopite račun ali prekličite dovoljenje v Googlu. Naslednja napaka API-ja ne
   sme izgubiti podatkov; uporabite **Ponovno poveži**.

Brez interneta mora biti produkcijska PWA predhodno obiskana in predpomnjena.
Googlova prijavna skripta se ne predpomni kot del aplikacije, žetoni in odgovori
Drive API se ne shranjujejo v service worker. Sinhronizacija brez interneta ne teče.
LocalStorage in kopije imajo omejeno kvoto. Aplikacija kopij ne briše samodejno;
ob polni shrambi se zapis ustavi. Izvozi ostajajo pomembni. Drive datoteke porabljajo
kvoto računa; samodejnega čiščenja zgodovine ali javnega deljenja ni.

## Preverjanje in omejitve

`pnpm test` preverja GIS z nadomestnim odjemalcem, HTTP napake, paginacijo,
validacijo, prekinjene prenose, konflikte, lokalne kopije in obnovitev.
`pnpm build` preveri TypeScript, produkcijsko gradnjo in generiranje PWA.
Pravi OAuth popup, Workspace pravila, Drive dovoljenja, CORS in dve dejanski napravi
zahtevajo zgornji ročni preizkus z vašim Client ID. Avtomatski testi tega ne dokazujejo.
Nobenega računa ali obstoječih Drive datotek razvojni ukazi ne spreminjajo.
