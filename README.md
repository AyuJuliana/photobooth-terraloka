# photobooth-terraloka

A photobooth website for **Terraloka**. Guests take photos with the laptop camera, decorate a photo strip with the Terraloka soil buddies, and scan a QR code to download it on their phone.

Live: https://terraloka-photobooth.vercel.app

## Features

- Live camera with a 3s / 5s / 10s countdown, plus Mirror and Flash on/off buttons
- 1, 2, 3, 4 or 6 photos per session
- Fun face filters (Shades, Crown, Kitty, Petani, Love) using MediaPipe face detection
- Color filters (B&W, Vintage, Golden, Fresh, Pop)
- A Customize step: pick a frame (Soil Buddies, Rice Garden, Microscope, Polaroid, Terraloka) and drag the soil buddy stickers around
- A QR code for each photo, and a download page for guests on their phones

## Project layout

```
public/        Pages and images (index.html = booth, photo.html = guest download page)
public/characters/  Soil buddy sticker images
api/           API routes (upload, list photos, single photo, QR code)
lib/           Photo storage (Vercel Blob online, ./photos folder offline)
server.js      Local server for running the booth without Vercel
```

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000 on the booth laptop. Photos are saved to `./photos`, and guests' phones must be on the same Wi-Fi.

## Deploy (Vercel)

```bash
npx vercel deploy --prod
```

Online, photos are stored in Vercel Blob (`BLOB_READ_WRITE_TOKEN`, which is set when the Blob store is connected to the project).

Optional environment variables:

- `BOOTH_KEY`: when set, only the booth screen can list or upload photos. Open the booth once with `?key=YOUR_KEY` to save the key.
- `PUBLIC_URL`: overrides the address the QR codes point to.
