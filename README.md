# HS 3D Kalkulator — Codex

Aplikacija: https://ashblody.github.io/hs-3d-kalkulator-codex/

Repozitorij: https://github.com/Ashblody/hs-3d-kalkulator-codex

Slovenska aplikacija za 3D-tiskanje, skeniranje, CAD in digitalne datoteke. React + TypeScript + Vite, Tailwind CSS, Recharts in lokalno shranjevanje. Brez prijave, strežnika ali plačljive baze.

## Zagon

Potrebujete Node.js 24 in pnpm 11.25.0. V terminalu v mapi projekta:

```sh
npm install -g pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm dev
```

Odprite naslov, ki ga izpiše Vite (običajno http://127.0.0.1:5173). Za preverjanje in produkcijski predogled:

```sh
pnpm test
pnpm build
pnpm preview
```

Produkcijska stran je v `dist/`. Te mape ne odpirajte neposredno z `file://`; uporabite strežnik ali GitHub Pages. V okolju s pnpm 10 se lahko namesto `allowBuilds` zahteva odobritev esbuild; priporočena je navedena različica pnpm 11.

## Uporaba

- Kalkulator takoj preračunava. Polja sprejmejo decimalno vejico ali piko. Neveljavne vrednosti se ne uporabijo; ob odhodu iz polja se obnovi zadnja veljavna vrednost.
- Vnesite ure na kos ali vključite **skupni čas serije**. Skupni čas se ne množi s številom kosov. Dodatni material, lepilo in neposredni stroški so za celoten projekt.
- Pod **Vaše delo in storitve** vključite **Moja ura: 15 €/h**. To spremeni tarife aktivnega dela (tudi dodatno delo in digitalno datoteko); stroški, rezerva in pribitek tiskanja ostanejo enaki. Stari cenik ostane shranjen in se ob izklopu povrne. Postavko lahko prilagodite.
- Načina **Stranka**, **Prijatelj** in **Zase** sta ločena od izbire urne postavke. Pri prijatelju se odstotek samodejno odšteje samo od dela; dodatni popust v EUR lahko ročno zniža celoten projekt. Minimalno naročilo se uporabi po popustih, če projekt ni prazen. Zase prikazuje stroške in ločeno vrednost časa.
- **Shrani projekt** shrani posnetek cenika in izbrani način dela. Trenutni osnutek se samodejno ohrani po zaprtju. Za shranjeno verzijo in status projekta kliknite Shrani. Kopija dobi nov ID.
- Spremenjene splošne nastavitve veljajo za nove projekte. Za odprti projekt jih uporabite z **Uporabi aktualni cenik**. S tem se ne spremeni shranjena ponudba, dokler je ponovno ne shranite.
- Pri prodaji digitalnega modela izberite format STL/STEP ali paket, enkratno ceno in obseg uporabe. Ure skeniranja in CAD-a vnesite ločeno pri storitvah, da niso obračunane dvakrat. Za stare ponudbe ostaja podprt prejšnji urni način.
- Dejanske ure in material lahko zabeležite in primerjate s ponudbo. Vrednosti ostanejo prazne, dokler jih izrecno ne vključite.

## Materiali in nabava

Ločen zavihek vsebuje pregled osnovnih materialov Bambu Lab, Prusa in Plastika Trček, povezave do uradnih virov ter kalkulator količinske nabave. Pregled virov je z dne **25. 10. 2026**; ni samodejnega spletnega osveževanja.

- Bambu začetne cene PLA, PETG in ASA so uporabnikove vrednosti iz projektne specifikacije. Aktualna končna EU cena za Slovenijo ni potrjena. Pri ABS, PC in PA6-GF morate vnesti dejansko ceno; ničla se ne shrani kot potrjena brezplačna nabava.
- Prusa reference v EUR prihajajo iz https://prusament.com/, mase in različice pa z neposredno povezanih produktnih strani. Prusament ASA ima v pregledani ponudbi 800 g, PC Blend 900 g in PA11 Natural 800 g. Stari URL-ji lahko vsebujejo staro maso; upoštevajte trenutno deklaracijo izdelka.
- Plastika Trček reference so na https://3dtrcek.com/sl/. ASA Plus je 800 g, ABS Plus izbrana osnovna različica 800 g, najlon PA12 700 g; PLA, PETG, PC in PCTG imajo navedene 1 kg različice. Ceno vedno potrdite za svojo barvo in maso.
- Produktne strani pri 12 kosih navajajo 35 % ali 38 %, zato aplikacija prikazuje razliko in zahteva preverjanje košarice. Akcije in količinski popusti se ne seštevajo samodejno.
- Kalkulator: `(cena koluta × število × (1 − popust/100) + dostava) / skupna neto masa v kg`. Če je vnesena cena že akcijska, pustite popust 0 %.
- Nabavo shranite kot ločeno različico ali kot novo nabavno ceno obstoječega materiala. Dostava se v tej nabavni ceni že upošteva; iste nabavne dostave ne vključite ponovno med stroške naročila. Dostava končnega izdelka stranki je ločena.
- Bambu PCTG ter Prusament ABS in PCTG v pregledanih virih niso potrjeni; zanje niso dodane izmišljene ponudbe. Novi material lahko vedno dodate ročno v nastavitvah.

Pogoji popustov so povezani v aplikaciji: Bambu EU bulk in uradna objava, Prusa paketi, program ugodnosti in časovno omejena akcija ter produktne strani Trčka. Referenčne cene z nabavnim DDV niso nujno enake končni ceni po izbiri Slovenije.

## Izračuni in poslovni pregled

Izračuni so v `src/model.ts`; vmesnih vrednosti ne zaokrožujemo. Na zaslonu in ponudbi so EUR s slovenskim zapisom.

```text
material = skupni grami / 1000 × cena na kg
elektrika = čas h × moč W / 1000 × cena kWh
amortizacija = čas h × (nabavna cena + servis) / življenjska doba
osnova tiska = material + elektrika + amortizacija + potrošni + neposredni stroški
stroški tiska = osnova × (1 + rezerva / 100)
prodajna cena tiska = stroški tiska × (1 + pribitek / 100)
delo = vsota ur × uporabljena tarifa
prispevek = prihodki brez DDV − neposredni stroški z rezervo
razporejeni fiksni stroški = aktivne ure × mesečni fiksni stroški / načrtovane ure
davčna rezerva = prihodki brez DDV × ročno nastavljeni odstotek
osebni zaslužek = prispevek − razporejeni fiksni stroški − davčna rezerva
```

Ročni stroški tiska nadomestijo celotne izračunane stroške z rezervo. Ne dodajo se še enkrat. Pribitek in marža sta različna: 100 € stroškov + 50 % pribitka = 150 €; marža 33,33 %.

Prispevek in zaslužek sta **oceni z rezervo za neuspehe**, ne realiziran poslovni dobiček. V lastnih stroških je vključena amortizacija s servisom; ne odšteje se ponovno. Vsi vneseni »ostali stroški« se obravnavajo kot preneseni neposredni stroški brez samostojnega pribitka. Morebitno plačilo zunanjega izvajalca vključite med neposredne stroške.

Poslovni pregled vključuje samo zaključene projekte izbranega meseca po datumu projekta in izključi način Zase. Prihodki so brez prodajnega DDV. Neposredni stroški in davčne rezerve so iz posnetkov ponudb, celoten mesečni fiksni strošek pa se odšteje samo enkrat. Dejanski aktivni čas, če je vnesen, nadomesti ocenjeni čas za pregled ur. To ni evidenca plačil; dejanski material in čas tiskanja se primerjata ločeno in ne spreminjata že izdane ponudbe.

Davčna rezerva je ročni odstotek prometa brez DDV, **ne vgrajen zakonski davčni model**. Začetnih 0 % pomeni, da rezerve še niste določili. 138,01 € mesečnih stroškov je uporabnikova začetna predpostavka; vse je urejevalno. Privzeto prodajni DDV ni vključen; nastavljiva stopnja 22 % se uporabi le ob vklopu. Vklop DDV ne preračuna nabavnega DDV materialov; vnesite svojo ustrezno stroškovno osnovo.

Poraba elektrike po tiskalniku/materialu ima prednost pred splošno močjo tiskalnika. Bambu 450 W iz specifikacije je ocena; za druge tiskalnike je začetno 0 W z opozorilom, ker podatek ni bil podan. Vnesite meritve. Pri smolnih tiskalnikih dodajte ustrezen material/smolo in vnesite maso v gramih; pretvorba iz ml ni vgrajena.

### Demonstracija

»Nosilci lučk – 2 leva + 2 desna« se ustvari ob prvi uporabi. Natančni izračun z amortizacijo `(870,40 + 200) / 3000 = 0,3568 €/h`:

| Postavka                             |       Znesek |
| ------------------------------------ | -----------: |
| Material 768 g                       |   20,45952 € |
| Elektrika 18,8 h × 450 W             |    1,69200 € |
| Amortizacija                         |    6,70784 € |
| Potrošni material                    |    3,40000 € |
| Stroški tiska z 10 % rezervo         |  35,485296 € |
| Prodajna cena tiska s 50 % pribitkom |  53,227944 € |
| Storitve po ceniku                   |      78,75 € |
| **Skupaj po ceniku**                 | **131,98 €** |
| Storitve 3,5 h × 15 €/h              |      52,50 € |
| **Skupaj z lastno uro 15 €/h**       | **105,73 €** |

Razlika do približka 132,2 € v specifikaciji je posledica natančnega izračuna amortizacije. Testi preverijo formule in zaščitijo pred podvajanjem stroškov.

## PDF ponudbe

**PDF ponudba** odpre natisljivo ponudbo HS 3D. V sistemskem dialogu izberite **Shrani kot PDF** (Android/Chrome) ali **Microsoft Print to PDF / Save as PDF** (Windows). Format je A4, slovenski znaki so ohranjeni. Izključite glavo in nogo brskalnika. Podatke ponudnika najprej vnesite v poslovne nastavitve. PDF izvoz uporablja vgrajeno tiskanje brskalnika, ne plačljive storitve; deluje brez povezave.

## Namestitev PWA in offline

Na HTTPS produkcijski strani (GitHub Pages) ali localhost se registrira service worker in shrani aplikacijo za uporabo brez povezave. Najprej enkrat odprite produkcijsko stran z internetom in počakajte, da se shrani; nato jo zaprite in odprite znova. Razvojni strežnik ni namenjen offline preverjanju.

- Android/Chrome: meni → Namesti aplikacijo ali Dodaj na začetni zaslon.
- Windows/Edge ali Chrome: ikona za namestitev v naslovni vrstici oziroma meni za namestitev aplikacije.
- Gumb **Namesti** se pokaže, če brskalnik pošlje zahtevo za namestitev. V vgrajenih predogledih in nekaterih brskalnikih te možnosti ni.
- Kalkulator, nastavitve, grafi, projekti, PDF tiskanje in JSON delujejo lokalno. Povezave do trgovin potrebujejo internet.
- Nova različica service workerja začne veljati, ko zaprete vse odprte zavihke/aplikacije stare različice in jo znova odprete s povezavo.

Namestitve na fizičnih napravah Android in Windows ter offline ponovnega zagona v tem razvojnem okolju še ni bilo mogoče potrditi; konfiguracija in generiranje service workerja se preverita z gradnjo.

## Varnostna kopija

Nastavitve → **Izvozi vse v JSON**. Kopija vsebuje nastavitve, projekte z lastnimi ceniki in trenutni osnutek. **Obnovi iz JSON** preveri shemo, meje števil in povezave na material/tiskalnik. Nato prenese prejšnje stanje in zamenja podatke. Največja datoteka je 10 MB. Stare kopije brez lastne urne postavke ostanejo združljive; novi način je privzeto izključen.

Podatki so v LocalStorage pod ključem `hs3d.v1`. Vsak brskalnik in izvor spletne strani imata svojo zbirko; podatki z localhost ne preidejo samodejno na GitHub Pages. Prenesite JSON in ga tam uvozite. Brisanje podatkov brskalnika odstrani lokalne projekte. Nobeni osebni podatki se ne pošiljajo na strežnik. Če shranjevanje ni mogoče, aplikacija pokaže opozorilo; neveljavnega izvirnega zapisa ne prepiše in ponudi reševanje.

## GitHub Pages

1. Ustvarite prazen GitHub repozitorij in vanj prenesite projekt brez `node_modules/`, `dist/` in `tools/` (izključeni v `.gitignore`). Vključite `pnpm-lock.yaml`.
2. Glavno vejo poimenujte `main`.
3. V repozitoriju odprite **Settings → Pages → Source → GitHub Actions**.
4. Potisnite kodo na `main` ali ročno zaženite workflow **Test and deploy to GitHub Pages**.
5. Workflow namesti zaklenjene odvisnosti, izvede teste, TypeScript in Vite gradnjo ter objavi `dist/`. Povezava je v izhodu koraka Deploy.

`base: './'` omogoča objavo tudi pod imenom repozitorija. Aplikacija ne uporablja strežniških poti, zato za navigacijo niso potrebne SPA preusmeritve. Za prvega zagona workflowa mora imeti repozitorij omogočene Actions in Pages. Ta različica uporablja ločen repozitorij `Ashblody/hs-3d-kalkulator-codex`. Za stanje objave preverite zadnji uspešni workflow v zavihku Actions.

## Struktura

```text
src/model.ts             tipi, validacija, začetne vrednosti in formule
src/model.test.ts        osnovni testi formul
src/procurement.ts       izračun nabave s popustom in dostavo
src/procurement.test.ts  testi lastne ure, združljivosti in nabave
src/catalog.ts           reference materialov, mase, viri in datum pregleda
src/MaterialCatalog.tsx  ločen zavihek za nabavo
src/storage.ts           shranjevanje, validacija in JSON izvoz
src/ModelSales.tsx       ločena prodaja modelov in pravic uporabe
src/PlatesEditor.tsx     plošče iz slicerja, ponovitve in material
src/order-options.test.ts testi prodaje in plošč
src/ui.tsx               skupni dostopni vnosni elementi
src/main.tsx             kalkulator, projekti, pregled, nastavitve in ponudba
src/style.css            odziven svetli/temni vmesnik in tiskovna predloga
vite.config.ts           Vite, Tailwind, PWA in poti
.github/workflows/       testiranje, gradnja in GitHub Pages
```

Oblikovanje kode: `pnpm exec prettier --write src`. Pri nadaljnjih nadgradnjah naj testi formul ostanejo obvezni pred objavo.

## Prodaja že izdelanega modela in plošče iz slicerja

V kalkulatorju je kartica **Prodaja digitalnega modela**. Vklopite jo pri fizičnem naročilu ali izberite vrsto **Digitalna datoteka** za samostojno prodajo. Dodajte STL, STEP, paket STL + STEP, OBJ ali izvorni CAD, ime, enkratno ceno in obseg uporabe. Cene niso prednastavljene. Prodaja modela je samostojna postavka na PDF-ponudbi in v pregledu; ne ustvarja dodatnih ur skeniranja ali modeliranja. Ure vnesite samo pri storitvah. Prijateljski odstotek velja za delo, skupni ročni popust pa lahko zniža tudi prodajo datoteke.

Za stare ponudbe ostaja podprt prvotni obračun digitalnih ur in licenc. Vklop nove ločene prodaje ta prejšnji način izključi iz izračuna; podatki se ohranijo za morebiten preklop nazaj. V novem samostojnem načinu lahko po potrebi dodate dejanske ure skeniranja in CAD-a pri storitvah. Pri zasebni uporabi se prodajna cena datotek ne prišteje lastnim stroškom.

Pri **3D-tiskanju** vključite **Shranjuj in računaj po ploščah iz slicerja**. Prvi vklop prenese trenutne skupne podatke v prvo ploščo, da se začetni izračun ne spremeni. Nato vsaki plošči določite:

- ime, tiskalnik in material;
- število kosov na plošči in število ponovitev cele plošče;
- skupne grame, ure in minute za en tisk cele plošče;
- opombo ali profil slicerja.

Grami vključujejo podpore, purge in odpad. Čas in material se množita samo s ponovitvami plošče, ne s številom kosov. Skupna količina kosov je vsota kosov po ploščah in ponovitvah; iz nje se izračuna delež celotnega naročila na kos. Dodatni material iz preprostega načina je pri ploščah izključen, potrošni material in neposredni stroški ostanejo enkrat za celoten projekt. Rezerva in pribitek se uporabita nad skupnimi stroški tiska. Vsaka plošča uporablja svoj posnetek cene materiala in tiskalnika v projektu. Preklop nazaj v preprosti način ohrani vnose obeh načinov, v izračunu pa sodeluje samo aktivni način.

Plošče lahko dodate, kopirate in odstranite. **Shrani projekt** ohrani plošče, prodajne postavke, pravice in cenik; vključene so tudi v JSON varnostni kopiji. V tej različici gre za ročni prepis povzetkov iz slicerja, brez neposrednega uvoza datotek 3MF. Za večmaterialno ploščo vnesite ločene materialne postavke in čas med njimi ustrezno razporedite, da ni zaračunan večkrat.

## Pregled projektov, zaokroževanje in mesečni načrt

Na podlagi pregleda uporabnikove druge različice kalkulatorja so dodani:

- Iskanje projektov po nazivu, stranki in opisu ter filtriranje po statusu. Status lahko spremenite neposredno na kartici projekta, ne da bi spreminjali posnetek cenika.
- Izbirno zaokroževanje ponudbe navzgor (brez, na 1 €, 5 € ali 10 €), po popustu in minimalnem naročilu ter pred DDV. Prilagoditev je izpisana tudi na ponudbi. Privzeto je izključena; način Zase je ne uporablja. Privzeti korak za nove projekte nastavite v poslovnih nastavitvah.
- V poslovnem pregledu je ločen scenarij aktivnega dela z nastavljivo prodajno uro. Prihodki = načrtovane ure × postavka; odštejejo se mesečni fiksni stroški in ročno nastavljena davčna rezerva. Scenarij ne vključuje prihodkov ali stroškov tiska in ne šteje med dejanske projekte. Potrebna urna postavka za cilj = (cilj + fiksni stroški / ure) / (1 − davčna rezerva / 100). Pri 100 % rezervi cilj ni dosegljiv.

Začetni scenarij 18 €/h je predpostavka za primerjavo, ne sprememba cenika ali shranjenih ponudb. Pregled idej je bil izveden na repozitoriju https://github.com/Ashblody/hs-3d-kalkulator; ta izvorna različica je ostala nespremenjena.
