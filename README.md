# Steam Sell Bulk

Bulk seller for Steam trading cards using your current Steam Community web session.

Vendedor masivo de cromos de Steam usando tu sesion web actual de Steam Community.

## English

### What This Project Does

This tool:

- reads your Steam Community inventory (`appid 753`, `contextid 6`)
- finds marketable trading cards
- checks the current market price for each card
- calculates the amount you will receive after Steam fees
- lists cards one by one
- supports a safe preview mode before selling anything

### Important Notes

- You must already have access to the Steam Community Market.
- Your Steam login session must be valid.
- Steam may require mobile confirmations for some listings.
- Cookies expire. If the script suddenly stops working, refresh them.
- Automating Marketplace actions may conflict with Steam rules. Use it carefully and at your own discretion.

### Project Files

- `scripts/sell-cards.mjs`: main Node.js script
- `sell-cards.ps1`: Windows PowerShell wrapper
- `config.example.json`: example config with placeholders
- `config.json`: your real local config with your Steam values
- `package.json`: npm shortcuts

### Requirements

- Windows PowerShell
- Node.js 18+ recommended
- A logged-in Steam Community session in your browser

### First-Time Setup

1. Open this folder in your terminal.
2. Copy `config.example.json` to `config.json`.
3. Fill in your Steam values inside `config.json`.
4. Run a preview first.

### Config Explained

Example:

```json
{
  "steamId64": "7656119XXXXXXXXXX",
  "language": "english",
  "currency": 1,
  "cookies": {
    "sessionid": "PASTE_YOUR_SESSIONID",
    "steamLoginSecure": "PASTE_YOUR_STEAMLOGINSECURE",
    "steamCountry": "AR%7Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "extraCookies": {}
  },
  "price": {
    "mode": "undercut_lowest",
    "undercutCents": 1,
    "minimumBuyerPayCents": 3,
    "fallbackBuyerPayCents": 3,
    "defaultPublisherFee": 0.1
  },
  "filters": {
    "includeFoil": true
  },
  "timing": {
    "requestDelayMs": 2500
  }
}
```

Field by field:

- `steamId64`: your Steam account ID in 64-bit format
- `language`: Steam language used in requests, usually `english`
- `currency`: Steam wallet currency code, for example `1` for USD
- `cookies.sessionid`: your Steam Community session cookie
- `cookies.steamLoginSecure`: your secure Steam login cookie
- `cookies.steamCountry`: optional, but recommended for more accurate price requests
- `cookies.extraCookies`: optional extra cookies if you ever need them
- `price.mode`: pricing strategy
- `price.undercutCents`: how many cents below the lowest market price to list
- `price.minimumBuyerPayCents`: never list below this buyer price
- `price.fallbackBuyerPayCents`: fallback market price if Steam does not return a price
- `price.defaultPublisherFee`: default publisher fee, `0.1` means 10%
- `filters.includeFoil`: `true` includes foil cards, `false` skips them
- `timing.requestDelayMs`: delay between requests to avoid being too aggressive

### How To Get `steamId64`

`steamId64` is your Steam ID in 64-bit numeric format. It is not your nickname, not your email, and not your friend code.

Easy ways to get it:

1. Open your Steam Community profile.
2. If the URL looks like this:
   `https://steamcommunity.com/profiles/7656119...`
   then that long number is your `steamId64`.
3. If your profile uses a custom URL like:
   `https://steamcommunity.com/id/yourname/`
   then open DevTools and inspect the `steamLoginSecure` cookie. In many cases it starts with your `steamId64` before `||`.

### How To Get `sessionid`, `steamLoginSecure`, and `steamCountry`

1. Open:
   `https://steamcommunity.com/market/`
2. Make sure you are logged into Steam.
3. Open DevTools:
   - Chrome / Edge: `F12`
   - Firefox: `F12`
4. Open the cookies for `https://steamcommunity.com`:
   - Chrome / Edge: `Application` -> `Cookies`
   - Firefox: `Storage` -> `Cookies`
5. Copy these values:
   - `sessionid`
   - `steamLoginSecure`
   - `steamCountry` (optional but recommended)
6. Paste them into `config.json`.

Do not share these values with anyone.

### Commands

Preview mode:

```powershell
npm run dry
```

What it does:

- reads your cards
- fetches prices
- prints what it would list
- does not sell anything

Windows preview shortcut:

```powershell
.\sell-cards.ps1
```

Sell everything:

```powershell
npm run sell
```

Windows live shortcut:

```powershell
.\sell-cards.ps1 -Live
```

Sell only a few items:

```powershell
.\sell-cards.ps1 -Limit 10
```

Preview first 10 cards:

```powershell
.\sell-cards.ps1 -Limit 10
```

Sell first 10 cards:

```powershell
.\sell-cards.ps1 -Live -Limit 10
```

### What Each Command Is For

- `npm run dry`: safest first test, preview only
- `.\sell-cards.ps1`: same as preview, convenient on Windows
- `npm run sell`: live run for all detected cards
- `.\sell-cards.ps1 -Live`: same as live sell, convenient on Windows
- `.\sell-cards.ps1 -Limit 10`: test with only a small batch
- `.\sell-cards.ps1 -Live -Limit 10`: live sell a small batch first

### Recommended Workflow

1. Fill `config.json`
2. Run preview:

```powershell
.\sell-cards.ps1 -Limit 10
```

3. Review prices carefully
4. If they look correct, run live:

```powershell
.\sell-cards.ps1 -Live -Limit 10
```

5. If everything looks good, run all:

```powershell
.\sell-cards.ps1 -Live
```

### Price Modes

- `undercut_lowest`: lists below the current lowest market price by `undercutCents`
- `match_lowest`: matches the current lowest market price

### Troubleshooting

- `No existe config.json`
  Create `config.json` from `config.example.json`.

- `Respuesta no JSON`
  Steam may be rate-limiting or changing responses. Retry after a moment.

- `pending confirmation`
  Open the Steam mobile app and confirm the listings.

- sudden login errors
  Your cookies likely expired. Export them again.

## Espanol

### Que Hace Este Proyecto

Esta herramienta:

- lee tu inventario de Steam Community (`appid 753`, `contextid 6`)
- detecta cromos vendibles
- consulta el precio actual del mercado
- calcula cuanto vas a recibir despues de las comisiones de Steam
- publica los cromos uno por uno
- tiene modo simulacion para revisar todo antes de vender

### Avisos Importantes

- Tenes que tener acceso al Steam Community Market.
- Tu sesion web de Steam tiene que estar activa.
- Steam puede pedir confirmaciones moviles para algunas publicaciones.
- Las cookies vencen. Si el script deja de funcionar, volvelas a sacar.
- Automatizar acciones del Marketplace puede entrar en conflicto con las reglas de Steam. Usalo bajo tu propia responsabilidad.

### Archivos Del Proyecto

- `scripts/sell-cards.mjs`: script principal en Node.js
- `sell-cards.ps1`: wrapper para Windows PowerShell
- `config.example.json`: ejemplo de configuracion con placeholders
- `config.json`: tu configuracion real local con tus datos de Steam
- `package.json`: atajos de npm

### Requisitos

- Windows PowerShell
- Node.js 18+ recomendado
- Una sesion iniciada en Steam Community dentro del navegador

### Configuracion Inicial

1. Abri esta carpeta en tu terminal.
2. Copia `config.example.json` a `config.json`.
3. Completa tus valores de Steam en `config.json`.
4. Hace primero una simulacion.

### Explicacion Del Config

Ejemplo:

```json
{
  "steamId64": "7656119XXXXXXXXXX",
  "language": "english",
  "currency": 1,
  "cookies": {
    "sessionid": "PEGA_TU_SESSIONID",
    "steamLoginSecure": "PEGA_TU_STEAMLOGINSECURE",
    "steamCountry": "AR%7Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "extraCookies": {}
  },
  "price": {
    "mode": "undercut_lowest",
    "undercutCents": 1,
    "minimumBuyerPayCents": 3,
    "fallbackBuyerPayCents": 3,
    "defaultPublisherFee": 0.1
  },
  "filters": {
    "includeFoil": true
  },
  "timing": {
    "requestDelayMs": 2500
  }
}
```

Que significa cada campo:

- `steamId64`: tu ID de Steam en formato numerico de 64 bits
- `language`: idioma usado en las requests, normalmente `english`
- `currency`: codigo de moneda de tu wallet de Steam, por ejemplo `1` para USD
- `cookies.sessionid`: tu cookie de sesion de Steam Community
- `cookies.steamLoginSecure`: tu cookie segura de login de Steam
- `cookies.steamCountry`: opcional, pero recomendable para pedir precios mas precisos
- `cookies.extraCookies`: cookies extra opcionales si alguna vez hicieran falta
- `price.mode`: estrategia de precio
- `price.undercutCents`: cuantos centavos bajar respecto al precio mas barato actual
- `price.minimumBuyerPayCents`: nunca listar por debajo de este precio al comprador
- `price.fallbackBuyerPayCents`: precio de respaldo si Steam no devuelve precio
- `price.defaultPublisherFee`: comision del publisher por defecto, `0.1` significa 10%
- `filters.includeFoil`: `true` incluye cromos foil, `false` los omite
- `timing.requestDelayMs`: espera entre requests para no golpear demasiado a Steam

### Como Sacar `steamId64`

`steamId64` es tu ID de Steam en formato numerico de 64 bits. No es tu nickname, no es tu email y no es tu codigo de amigo.

Formas faciles de obtenerlo:

1. Abri tu perfil de Steam Community.
2. Si la URL se ve asi:
   `https://steamcommunity.com/profiles/7656119...`
   ese numero largo es tu `steamId64`.
3. Si tu perfil usa una URL personalizada como:
   `https://steamcommunity.com/id/tu_nombre/`
   entonces abri DevTools e inspecciona la cookie `steamLoginSecure`. Muchas veces empieza con tu `steamId64` antes de `||`.

### Como Sacar `sessionid`, `steamLoginSecure` y `steamCountry`

1. Abri:
   `https://steamcommunity.com/market/`
2. Asegurate de tener sesion iniciada en Steam.
3. Abri DevTools:
   - Chrome / Edge: `F12`
   - Firefox: `F12`
4. Abri las cookies de `https://steamcommunity.com`:
   - Chrome / Edge: `Application` -> `Cookies`
   - Firefox: `Storage` -> `Cookies`
5. Copia estos valores:
   - `sessionid`
   - `steamLoginSecure`
   - `steamCountry` (opcional pero recomendado)
6. Pegalos en `config.json`.

No compartas estos valores con nadie.

### Comandos

Modo simulacion:

```powershell
npm run dry
```

Que hace:

- lee tus cromos
- consulta precios
- muestra que publicaria
- no vende nada

Atajo de simulacion para Windows:

```powershell
.\sell-cards.ps1
```

Vender todo:

```powershell
npm run sell
```

Atajo live para Windows:

```powershell
.\sell-cards.ps1 -Live
```

Procesar pocos items:

```powershell
.\sell-cards.ps1 -Limit 10
```

Simular los primeros 10 cromos:

```powershell
.\sell-cards.ps1 -Limit 10
```

Vender de verdad los primeros 10 cromos:

```powershell
.\sell-cards.ps1 -Live -Limit 10
```

### Para Que Sirve Cada Comando

- `npm run dry`: prueba mas segura, solo preview
- `.\sell-cards.ps1`: lo mismo que preview, mas comodo en Windows
- `npm run sell`: corrida real para todos los cromos detectados
- `.\sell-cards.ps1 -Live`: lo mismo que venta real, mas comodo en Windows
- `.\sell-cards.ps1 -Limit 10`: probar con un lote chico
- `.\sell-cards.ps1 -Live -Limit 10`: vender de verdad un lote chico primero

### Flujo Recomendado

1. Completa `config.json`
2. Corre una simulacion:

```powershell
.\sell-cards.ps1 -Limit 10
```

3. Revisa bien los precios
4. Si estan bien, corre la venta real:

```powershell
.\sell-cards.ps1 -Live -Limit 10
```

5. Si todo sale bien, corre todo:

```powershell
.\sell-cards.ps1 -Live
```

### Modos De Precio

- `undercut_lowest`: publica por debajo del precio mas barato actual segun `undercutCents`
- `match_lowest`: publica al mismo precio mas barato actual

### Problemas Comunes

- `No existe config.json`
  Crea `config.json` copiando `config.example.json`.

- `Respuesta no JSON`
  Steam puede estar limitando o cambiando la respuesta. Espera un momento y vuelve a probar.

- `pending confirmation`
  Abri la app de Steam en el celular y confirma las publicaciones.

- errores de login repentinos
  Probablemente vencieron tus cookies. Sacalas otra vez.
